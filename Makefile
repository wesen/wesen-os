.PHONY: gifs

all: gifs

VERSION=v0.1.14

TAPES=$(shell ls doc/vhs/*tape)
gifs: $(TAPES)
	for i in $(TAPES); do vhs < $$i; done

docker-lint:
	docker run --rm -v $(shell pwd):/app -w /app golangci/golangci-lint:latest golangci-lint run -v

lint:
	golangci-lint run -v

lintmax:
	golangci-lint run -v --max-same-issues=100

gosec:
	go install github.com/securego/gosec/v2/cmd/gosec@latest
	gosec -exclude=G101,G304,G301,G306 -exclude-dir=.history ./...

govulncheck:
	go install golang.org/x/vuln/cmd/govulncheck@latest
	govulncheck ./...

test:
	go test ./...

build:
	go generate ./...
	go build ./...

goreleaser:
	goreleaser release --skip=sign --snapshot --clean

tag-major:
	git tag $(shell svu major)

tag-minor:
	git tag $(shell svu minor)

tag-patch:
	git tag $(shell svu patch)

release:
	git push origin --tags
	GOPROXY=proxy.golang.org go list -m github.com/go-go-golems/wesen-os@$(shell svu current)

bump-glazed:
	GOWORK=off go get github.com/go-go-golems/glazed@latest
	GOWORK=off go get github.com/go-go-golems/clay@latest
	GOWORK=off go get github.com/go-go-golems/go-go-os-backend@latest
	GOWORK=off go get github.com/go-go-golems/go-go-app-arc-agi@latest
	GOWORK=off go get github.com/go-go-golems/go-go-app-inventory@latest
	GOWORK=off go get github.com/go-go-golems/go-go-app-sqlite@latest
	GOWORK=off go get github.com/go-go-golems/go-go-os-chat@latest
	GOWORK=off go get github.com/go-go-golems/go-go-gepa@latest
	GOWORK=off go get github.com/go-go-golems/geppetto@latest
	GOWORK=off go get github.com/go-go-golems/pinocchio@latest
	GOWORK=off go get github.com/go-go-golems/plz-confirm@latest
	GOWORK=off go mod tidy
