/*
 * Markdown rendering for chat messages (micromark + GFM). micromark escapes
 * raw HTML by default (allowDangerousHtml is off), so model output cannot
 * inject markup.
 */
import { useMemo } from 'react';
import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';

export function renderMarkdownHtml(text: string): string {
  try {
    return micromark(text, { extensions: [gfm()], htmlExtensions: [gfmHtml()] });
  } catch {
    // Never let a malformed message take the window down.
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre>${escaped}</pre>`;
  }
}

export function Markdown({ text }: { text: string }) {
  const html = useMemo(() => renderMarkdownHtml(text), [text]);
  return <div className="oschat-md" dangerouslySetInnerHTML={{ __html: html }} />;
}
