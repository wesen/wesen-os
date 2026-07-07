package chathost

import (
	"net/http"
	"regexp"
	"sort"
	"strings"

	gepprofiles "github.com/go-go-golems/geppetto/pkg/engineprofiles"
	"github.com/go-go-golems/pinocchio/pkg/chatapp/frontendtools"
	toolv1 "github.com/go-go-golems/pinocchio/pkg/chatapp/pb/proto/pinocchio/chatapp/frontendtools/v1"
	"github.com/go-go-golems/pinocchio/pkg/chatapp/serverkit"
	sessionstream "github.com/go-go-golems/sessionstream/pkg/sessionstream"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"google.golang.org/protobuf/types/known/structpb"
)

// createSessionRequest extends the serverkit contract with an optional engine
// profile selection and an optional client-supplied session id, both carried
// in chat-provider's createSessionBody. Client-supplied ids let flows that
// pre-create a conversation server-side (the assistant app-chat bootstrap)
// bind the chat session to that conversation.
type createSessionRequest struct {
	Profile   string `json:"profile,omitempty"`
	SessionID string `json:"sessionId,omitempty"`
}

var sessionIDPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,64}$`)

type toolDescriptorRequest struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	InputSchema map[string]any `json:"inputSchema,omitempty"`
	Mode        string         `json:"mode,omitempty"`
	Available   bool           `json:"available"`
}

type toolManifestRequest struct {
	Revision uint64                  `json:"revision,omitempty"`
	Tools    []toolDescriptorRequest `json:"tools"`
}

type toolResultRequest struct {
	ToolCallID string         `json:"toolCallId"`
	ToolName   string         `json:"toolName,omitempty"`
	Result     map[string]any `json:"result,omitempty"`
	Status     string         `json:"status,omitempty"`
	Error      string         `json:"error,omitempty"`
}

type toolCommandResponse struct {
	SessionID string `json:"sessionId"`
	Accepted  bool   `json:"accepted"`
	Status    string `json:"status"`
}

func (h *Host) handleHealth(w http.ResponseWriter, _ *http.Request) {
	serverkit.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok", "app": h.opts.AppID})
}

type profileInfoResponse struct {
	Slug        string `json:"slug"`
	DisplayName string `json:"displayName"`
	IsDefault   bool   `json:"isDefault"`
}

type profilesResponse struct {
	Profiles    []profileInfoResponse `json:"profiles"`
	DefaultSlug string                `json:"defaultSlug"`
}

// handleProfiles lists the user-selectable engine profiles for this app's chat
// window. It prefers the curated ProfileSurface.VisibleProfiles list and falls
// back to enumerating the profile registry so both curated (inventory) and
// uncurated (assistant) apps expose a usable selector.
func (h *Host) handleProfiles(w http.ResponseWriter, r *http.Request) {
	surface := h.opts.Profiles
	defaultSlug := surface.DefaultProfileSlug.String()

	infos := make([]profileInfoResponse, 0)
	appendInfo := func(slug, displayName string) {
		slug = strings.TrimSpace(slug)
		if slug == "" {
			return
		}
		if strings.TrimSpace(displayName) == "" {
			displayName = slug
		}
		infos = append(infos, profileInfoResponse{Slug: slug, DisplayName: displayName, IsDefault: slug == defaultSlug})
	}

	switch {
	case len(surface.VisibleProfiles) > 0:
		for _, p := range surface.VisibleProfiles {
			appendInfo(p.Slug.String(), p.DisplayName)
		}
	case surface.Registry != nil:
		profiles, err := surface.Registry.ListEngineProfiles(r.Context(), surface.RegistrySlug)
		if err != nil {
			log.Error().Err(err).Str("app", h.opts.AppID).Msg("list engine profiles failed")
			serverkit.WriteJSON(w, http.StatusInternalServerError, serverkit.ErrorResponse{Error: "list profiles failed"})
			return
		}
		for _, p := range profiles {
			if p == nil {
				continue
			}
			appendInfo(p.Slug.String(), p.DisplayName)
		}
	}

	// Registry enumeration walks a map, so order is non-deterministic. Sort for a
	// stable selector: the default profile first, then alphabetically by slug.
	sort.SliceStable(infos, func(i, j int) bool {
		if infos[i].IsDefault != infos[j].IsDefault {
			return infos[i].IsDefault
		}
		return infos[i].Slug < infos[j].Slug
	})

	serverkit.WriteJSON(w, http.StatusOK, profilesResponse{Profiles: infos, DefaultSlug: defaultSlug})
}

func (h *Host) handleCreateSession(w http.ResponseWriter, r *http.Request) {
	var in createSessionRequest
	if err := serverkit.DecodeJSON(r, &in); err != nil {
		serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "bad request"})
		return
	}
	sessionID := strings.TrimSpace(in.SessionID)
	if sessionID != "" && !sessionIDPattern.MatchString(sessionID) {
		serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "invalid sessionId"})
		return
	}
	if sessionID == "" {
		sessionID = uuid.NewString()
	}
	if profile := strings.TrimSpace(in.Profile); profile != "" {
		slug, err := gepprofiles.ParseEngineProfileSlug(profile)
		if err != nil {
			serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "invalid profile"})
			return
		}
		h.setSessionProfile(sessionstream.SessionId(sessionID), slug)
	}
	serverkit.WriteJSON(w, http.StatusOK, serverkit.CreateSessionResponse{SessionID: sessionID})
}

func (h *Host) handleSubmitMessage(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.service == nil {
		serverkit.WriteJSON(w, http.StatusServiceUnavailable, serverkit.ErrorResponse{Error: "chat service not initialized"})
		return
	}
	sessionID := strings.TrimSpace(r.PathValue("id"))
	if sessionID == "" {
		serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "missing session id"})
		return
	}
	var in serverkit.SubmitMessageRequest
	if err := serverkit.DecodeJSON(r, &in); err != nil {
		serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "bad request"})
		return
	}
	prompt := strings.TrimSpace(in.Prompt)
	if prompt == "" {
		serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "missing prompt"})
		return
	}
	sid := sessionstream.SessionId(sessionID)
	req, err := h.promptRequest(r.Context(), sid, prompt)
	if err != nil {
		log.Error().Err(err).Str("app", h.opts.AppID).Str("sessionId", sessionID).Msg("build prompt request failed")
		serverkit.WriteJSON(w, http.StatusInternalServerError, serverkit.ErrorResponse{Error: err.Error()})
		return
	}
	if err := h.service.SubmitPromptRequest(r.Context(), sid, req); err != nil {
		log.Error().Err(err).Str("app", h.opts.AppID).Str("sessionId", sessionID).Msg("submit prompt failed")
		serverkit.WriteJSON(w, http.StatusInternalServerError, serverkit.ErrorResponse{Error: err.Error()})
		return
	}
	serverkit.WriteJSON(w, http.StatusOK, serverkit.SubmitMessageResponse{SessionID: sessionID, Accepted: true, Status: "running"})
}

func (h *Host) handleSessionSnapshot(w http.ResponseWriter, r *http.Request) {
	sessionID := strings.TrimSpace(r.PathValue("id"))
	if sessionID == "" {
		serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "missing session id"})
		return
	}
	snap, err := h.service.Snapshot(r.Context(), sessionstream.SessionId(sessionID))
	if err != nil {
		serverkit.WriteJSON(w, http.StatusInternalServerError, serverkit.ErrorResponse{Error: err.Error()})
		return
	}
	serverkit.WriteJSON(w, http.StatusOK, serverkit.EncodeSnapshotResponse(snap, nil))
}

func (h *Host) handleStopSession(w http.ResponseWriter, r *http.Request) {
	sessionID := strings.TrimSpace(r.PathValue("id"))
	if sessionID == "" {
		serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "missing session id"})
		return
	}
	if err := h.service.Stop(r.Context(), sessionstream.SessionId(sessionID)); err != nil {
		serverkit.WriteJSON(w, http.StatusInternalServerError, serverkit.ErrorResponse{Error: err.Error()})
		return
	}
	serverkit.WriteJSON(w, http.StatusOK, serverkit.StopSessionResponse{SessionID: sessionID, Accepted: true, Status: "stop_requested"})
}

func (h *Host) handleToolManifest(w http.ResponseWriter, r *http.Request) {
	sessionID := strings.TrimSpace(r.PathValue("id"))
	if sessionID == "" {
		serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "missing session id"})
		return
	}
	var in toolManifestRequest
	if err := serverkit.DecodeJSON(r, &in); err != nil {
		serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "bad request"})
		return
	}
	tools := make([]*toolv1.FrontendToolDescriptor, 0, len(in.Tools))
	for _, t := range in.Tools {
		name := strings.TrimSpace(t.Name)
		if name == "" {
			continue
		}
		inputSchema, err := structpb.NewStruct(t.InputSchema)
		if err != nil {
			serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "bad input schema"})
			return
		}
		tools = append(tools, &toolv1.FrontendToolDescriptor{
			Name:        name,
			Description: t.Description,
			InputSchema: inputSchema,
			Mode:        parseToolMode(t.Mode),
			Available:   t.Available,
		})
	}
	if err := h.hub.Submit(r.Context(), sessionstream.SessionId(sessionID), frontendtools.CommandManifest, &toolv1.FrontendToolManifestCommand{Tools: tools, Revision: in.Revision}); err != nil {
		serverkit.WriteJSON(w, http.StatusInternalServerError, serverkit.ErrorResponse{Error: err.Error()})
		return
	}
	serverkit.WriteJSON(w, http.StatusOK, toolCommandResponse{SessionID: sessionID, Accepted: true, Status: "manifest_updated"})
}

func (h *Host) handleToolResult(w http.ResponseWriter, r *http.Request) {
	sessionID := strings.TrimSpace(r.PathValue("id"))
	if sessionID == "" {
		serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "missing session id"})
		return
	}
	var in toolResultRequest
	if err := serverkit.DecodeJSON(r, &in); err != nil {
		serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "bad request"})
		return
	}
	if strings.TrimSpace(in.ToolCallID) == "" {
		serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "missing toolCallId"})
		return
	}
	result, err := structpb.NewStruct(in.Result)
	if err != nil {
		serverkit.WriteJSON(w, http.StatusBadRequest, serverkit.ErrorResponse{Error: "bad result"})
		return
	}
	status := strings.TrimSpace(in.Status)
	if status == "" {
		status = "success"
	}
	if err := h.hub.Submit(r.Context(), sessionstream.SessionId(sessionID), frontendtools.CommandResult, &toolv1.FrontendToolResultCommand{
		ToolCallId: strings.TrimSpace(in.ToolCallID),
		ToolName:   strings.TrimSpace(in.ToolName),
		Result:     result,
		Status:     status,
		Error:      in.Error,
	}); err != nil {
		serverkit.WriteJSON(w, http.StatusInternalServerError, serverkit.ErrorResponse{Error: err.Error()})
		return
	}
	serverkit.WriteJSON(w, http.StatusOK, toolCommandResponse{SessionID: sessionID, Accepted: true, Status: "result_received"})
}

func parseToolMode(mode string) toolv1.ToolExecutionMode {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case "frontend", "frontend_auto", "auto":
		return toolv1.ToolExecutionMode_TOOL_EXECUTION_MODE_FRONTEND_AUTO
	case "human", "frontend_human":
		return toolv1.ToolExecutionMode_TOOL_EXECUTION_MODE_FRONTEND_HUMAN
	case "backend":
		return toolv1.ToolExecutionMode_TOOL_EXECUTION_MODE_BACKEND
	default:
		return toolv1.ToolExecutionMode_TOOL_EXECUTION_MODE_FRONTEND_AUTO
	}
}

func (h *Host) handleWS(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.ws == nil {
		serverkit.WriteJSON(w, http.StatusServiceUnavailable, serverkit.ErrorResponse{Error: "websocket transport not initialized"})
		return
	}
	h.ws.ServeHTTP(w, r)
}
