'use client';

/**
 * app/components/TalkPanel.tsx — Agent A (web/UI)
 * ---------------------------------------------------------------------------
 * Text chat with the concierge agent. PRESENTATIONAL ONLY — the parent page
 * owns the single useEventStream() instance and feeds this panel via props.
 *
 * Contract notes:
 *  - `messages` are ChatMessage[] straight off the hook's DemoState.
 *  - We derive "awaiting reply" locally: the thread ends on a user message
 *    with no assistant turn after it → show the typing indicator.
 *  - Voice is a flagged later upgrade; the head chip says so, quietly.
 */

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { DemoSeed } from '@shared/types';
import type { ChatMessage } from '../hooks/useEventStream';
import { IconChat, IconSend } from './icons';

export interface TalkPanelProps {
  /** The conversation, oldest-first, from useEventStream().state.messages. */
  messages: ChatMessage[];
  /** POST a customer turn. Wired to useEventStream().sendMessage. */
  onSend: (text: string) => void;
  /** Seed snapshot — used only to keep suggestion copy on-brand (optional). */
  seed?: DemoSeed | null;
}

/** Default suggestion chips shown only on an empty thread. */
const SUGGESTIONS: readonly string[] = [
  'I was charged twice for order 1024 — I need a refund.',
  'Can you refund my navy linen dress order?',
];

const ROLE_LABEL: Record<ChatMessage['role'], string> = {
  user: 'YOU',
  assistant: 'CONCIERGE',
  system: 'SYSTEM',
};

export default function TalkPanel({ messages, onSend, seed }: TalkPanelProps): JSX.Element {
  const [draft, setDraft] = useState('');
  const threadRef = useRef<HTMLDivElement | null>(null);

  const list = messages ?? [];
  const isEmpty = list.length === 0;

  // "Awaiting reply": last turn is the customer and no assistant turn follows.
  const awaitingReply = useMemo(() => {
    if (list.length === 0) return false;
    const last = list[list.length - 1];
    return last.role === 'user';
  }, [list]);

  // Auto-scroll to the newest message (and to the typing indicator).
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [list.length, awaitingReply]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts a newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const canSend = draft.trim().length > 0;

  return (
    <div className="rc-card rc-talk">
      <div className="rc-card-head">
        <span className="rc-card-eyebrow">
          <IconChat />
          Concierge chat
        </span>
        <span className="rc-chip" data-tone="sim">
          <span className="dot" aria-hidden="true" />
          text · voice soon
        </span>
      </div>

      <div className="rc-card-body">
        <div className="rc-thread" ref={threadRef} role="log" aria-live="polite">
          {isEmpty ? (
            <div className="rc-empty">
              <span className="icon">
                <IconChat />
              </span>
              <div>Start the conversation — ask the concierge for a refund.</div>
              <div className="rc-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rc-suggestion"
                    onClick={() => onSend(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {list.map((m) => (
                <div
                  key={m.id}
                  className="rc-msg"
                  data-role={m.role}
                  data-pending={m.pending ? 'true' : undefined}
                >
                  <span className="rc-msg-meta">{ROLE_LABEL[m.role]}</span>
                  {m.text}
                </div>
              ))}

              {awaitingReply && (
                <div className="rc-msg" data-role="assistant" aria-label="Concierge is typing">
                  <span className="rc-msg-meta">CONCIERGE</span>
                  <span className="rc-typing" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rc-composer">
          <textarea
            className="rc-input"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              seed?.customer?.name
                ? `Message the concierge as ${seed.customer.name}…`
                : 'Message the concierge…'
            }
            aria-label="Message the concierge"
          />
          <button
            type="button"
            className="rc-send"
            onClick={send}
            disabled={!canSend}
            aria-label="Send message"
          >
            <IconSend />
          </button>
        </div>
      </div>
    </div>
  );
}
