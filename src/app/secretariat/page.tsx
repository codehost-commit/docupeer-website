"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { apiGet, apiPost, useMe } from "@/lib/client";
import { MIN_PROMPT_CHARS, MAX_PROMPT_WORDS, countWords } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type TokenStatus = {
  reviewsCompleted: number;
  earnedTotal: number;
  earnedUsed: number;
  earnedAvailable: number;
  dailyAvailable: number;
  totalAvailable: number;
  nextDailyResetAt: string;
};
type ChatSummary = {
  id: string;
  title: string;
  paperName: string;
  updatedAt: string;
  _count?: { messages: number };
};
type Msg = { id: string; role: "user" | "assistant"; content: string };
type ChatDetail = {
  id: string;
  title: string;
  paperName: string;
  wordCount: number;
  messages: Msg[];
};

let localSeq = 0;
const newId = () => `local-${Date.now()}-${localSeq++}`;

// ---------------------------------------------------------------------------
// Markdown / LaTeX renderer for AI replies
// ---------------------------------------------------------------------------
function AiMarkdown({ content }: { content: string }) {
  return (
    <div className="sec-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function IconTrash({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0v12a2 2 0 002 2h6a2 2 0 002-2V7"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconPlus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconSpark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function tokenHint(t: TokenStatus | null): string {
  if (!t) return "";
  const reset = t.nextDailyResetAt
    ? new Date(t.nextDailyResetAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";
  const daily = t.dailyAvailable > 0 ? "free daily prompt available" : `free daily prompt resets ${reset}`;
  return `${t.earnedAvailable} earned · ${daily}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SecretariatPage() {
  const { me, loading } = useMe();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [tokens, setTokens] = useState<TokenStatus | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatDetail | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealId, setRevealId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ---- data loading ----
  const loadChats = useCallback(async () => {
    try {
      const data = await apiGet<{ chats: ChatSummary[]; tokens: TokenStatus }>("/api/secretariat/chats");
      setChats(data.chats);
      setTokens(data.tokens);
    } catch {
      /* unauthenticated / not launched — handled by the gate below */
    }
  }, []);

  useEffect(() => {
    if (me) loadChats();
  }, [me, loadChats]);

  const openChat = useCallback(async (id: string) => {
    setActiveId(id);
    setChat(null);
    setError(null);
    setRevealId(null);
    try {
      const data = await apiGet<{ chat: ChatDetail; tokens: TokenStatus }>(`/api/secretariat/chats/${id}`);
      setChat(data.chat);
      setTokens(data.tokens);
    } catch (e) {
      setError((e as Error).message || "Could not open that chat.");
    }
  }, []);

  const startNew = useCallback(() => {
    setActiveId(null);
    setChat(null);
    setError(null);
    setInput("");
    setRevealId(null);
  }, []);

  useEffect(() => {
    // Keep the conversation pinned to the latest turn.
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat?.messages.length, sending]);

  // ---- upload ----
  async function handleFile(file: File) {
    setError(null);
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      setError("Only PDF and DOCX files are accepted.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/secretariat/upload", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      if (data.tokens) setTokens(data.tokens);
      await loadChats();
      await openChat(data.chat.id);
    } catch (e) {
      setError((e as Error).message || "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ---- delete ----
  async function deleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const prev = chats;
    setChats((c) => c.filter((x) => x.id !== id));
    if (activeId === id) startNew();
    try {
      const res = await fetch(`/api/secretariat/chats/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error();
    } catch {
      setChats(prev); // restore on failure
    }
  }

  // ---- send ----
  const words = useMemo(() => countWords(input), [input]);
  const tooShort = input.trim().length > 0 && input.trim().length < MIN_PROMPT_CHARS;
  const tooLong = words > MAX_PROMPT_WORDS;
  const noTokens = (tokens?.totalAvailable ?? 0) <= 0;
  const canSend =
    !!chat && !sending && !noTokens &&
    input.trim().length >= MIN_PROMPT_CHARS && !tooLong;

  async function send() {
    if (!chat || !canSend) return;
    const content = input.trim();
    const userMsg: Msg = { id: newId(), role: "user", content };
    setChat((c) => (c ? { ...c, messages: [...c.messages, userMsg] } : c));
    setInput("");
    setSending(true);
    setError(null);
    try {
      const data = await apiPost<{ answer: string; title: string; tokens: TokenStatus }>(
        `/api/secretariat/chats/${chat.id}/message`,
        { content }
      );
      const aiMsg: Msg = { id: newId(), role: "assistant", content: data.answer };
      setRevealId(aiMsg.id);
      setChat((c) => (c ? { ...c, title: data.title, messages: [...c.messages, aiMsg] } : c));
      setTokens(data.tokens);
      setChats((list) =>
        list.map((x) => (x.id === chat.id ? { ...x, title: data.title } : x))
      );
    } catch (e) {
      // Roll the user's message back so they can retry / edit.
      setChat((c) => (c ? { ...c, messages: c.messages.filter((m) => m.id !== userMsg.id) } : c));
      setInput(content);
      const err = e as Error & { data?: { tokens?: TokenStatus } };
      if (err.data?.tokens) setTokens(err.data.tokens);
      setError(err.message || "Secretariat could not respond. Please try again.");
    } finally {
      setSending(false);
    }
  }

  // ---- gate: must be signed in ----
  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-deep-dim">Loading…</div>;
  }
  if (!me) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20">
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-deep-accent-soft text-deep-accent">
            <IconSpark className="h-6 w-6" />
          </div>
          <h1 className="text-3xl">Secretariat</h1>
          <p className="poiret mt-1 text-lg text-deep-dim">Your reading companion for papers</p>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-deep-text-soft">
            Upload a paper and Secretariat reads it to give detailed, constructive feedback.
            Sign in to get <strong>2 free prompts</strong>, a{" "}
            <strong>free prompt every day</strong>, and <strong>2 more for every peer review</strong> you complete.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/login" className="btn-primary">Sign in</Link>
            <Link href="/register" className="btn-secondary">Create account</Link>
          </div>
        </div>
      </main>
    );
  }

  // ---- main app ----
  return (
    <main className="mx-auto max-w-6xl px-3 py-6 sm:px-4">
      <div className="grid min-h-0 gap-4 md:grid-cols-[16rem_1fr]">
        {/* Sidebar */}
        <aside className="flex flex-col gap-3">
          <button onClick={startNew} className="btn-primary w-full">
            <IconPlus className="h-4 w-4" /> New chat
          </button>

          <div className="card p-3">
            <div className="flex items-center justify-between">
              <span className="label mb-0">Tokens</span>
              <span className={`text-2xl font-semibold ${noTokens ? "text-deep-bad" : "text-deep-accent"}`}>
                {tokens?.totalAvailable ?? "—"}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-deep-dim">{tokenHint(tokens)}</p>
            {noTokens && (
              <Link href="/review" className="mt-2 block text-[11px] font-semibold text-deep-accent underline underline-offset-2">
                Review a paper → unlock 2 tokens
              </Link>
            )}
          </div>

          <nav className="flex flex-col gap-1">
            {chats.length === 0 && (
              <p className="px-2 py-3 text-xs text-deep-dim">No chats yet. Upload a paper to begin.</p>
            )}
            {chats.map((c) => {
              const active = c.id === activeId;
              return (
                <div
                  key={c.id}
                  onClick={() => openChat(c.id)}
                  className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition ${
                    active
                      ? "border-deep-accent/40 bg-deep-accent-soft/50"
                      : "border-transparent hover:border-deep-border hover:bg-black/[0.03]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-deep-text">{c.title}</div>
                    <div className="truncate text-[11px] text-deep-dim">{c.paperName}</div>
                  </div>
                  <button
                    onClick={(e) => deleteChat(c.id, e)}
                    aria-label="Delete chat"
                    className="shrink-0 rounded-md p-1 text-deep-dim opacity-0 transition hover:bg-deep-bad/10 hover:text-deep-bad group-hover:opacity-100"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main panel */}
        <section className="card flex h-[calc(100vh-7rem)] min-h-[34rem] max-h-[52rem] min-w-0 flex-col overflow-hidden">
          {!chat ? (
            // Upload / start state
            <div className="flex flex-1 flex-col items-center justify-center p-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                className={`flex w-full max-w-md cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition ${
                  dragging ? "border-deep-accent bg-deep-accent-soft/40" : "border-deep-border-strong hover:border-deep-accent"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-deep-accent-soft text-deep-accent">
                  <IconSpark className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-medium text-deep-text">
                    {uploading ? "Reading your paper…" : "Upload a paper to start"}
                  </p>
                  <p className="mt-1 text-sm text-deep-dim">Drag & drop or click · PDF or DOCX · no length limit</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
              {error && <p className="mt-4 text-sm font-medium text-deep-bad">{error}</p>}
              <p className="mt-4 max-w-md text-center text-xs text-deep-dim">
                Secretariat reads the full paper, then answers your questions in detail with
                LaTeX-formatted math. Each prompt costs one token.
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <header className="flex items-center justify-between border-b border-deep-border px-4 py-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-deep-text">{chat.title}</h2>
                  <p className="truncate text-[11px] text-deep-dim">
                    {chat.paperName} · {chat.wordCount.toLocaleString()} words
                  </p>
                </div>
                <span className="chip-accent shrink-0">Paper companion</span>
              </header>

              {/* Messages */}
              <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
                {chat.messages.length === 0 && (
                  <div className="mx-auto max-w-md rounded-xl border border-deep-border bg-deep-panel2/60 p-4 text-center text-sm text-deep-text-soft">
                    Ask Secretariat anything about <strong>{chat.paperName}</strong> — a critique, a
                    clarity pass, help with an argument, or the math. Minimum {MIN_PROMPT_CHARS} characters.
                  </div>
                )}
                {chat.messages.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="sec-bubble-user max-w-[85%] whitespace-pre-wrap">{m.content}</div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex justify-start">
                      <div className="sec-bubble-ai max-w-[92%]">
                        <div className={m.id === revealId ? "sec-reveal" : ""}>
                          <AiMarkdown content={m.content} />
                        </div>
                      </div>
                    </div>
                  )
                )}
                {sending && (
                  <div className="flex justify-start">
                    <div className="sec-bubble-ai max-w-[92%]">
                      <span className="inline-flex items-center gap-2 text-sm text-deep-dim">
                        <span className="sec-dot" /> Secretariat is reading…
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-deep-border bg-deep-panel2/40 px-4 py-3">
                {error && <p className="mb-2 text-xs font-medium text-deep-bad">{error}</p>}
                {noTokens && (
                  <p className="mb-2 text-xs font-medium text-deep-warn">
                    You&rsquo;re out of tokens.{" "}
                    <Link href="/review" className="underline underline-offset-2">Review a paper</Link> to unlock 2 more.
                  </p>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
                    }}
                    rows={2}
                    placeholder={noTokens ? "Out of tokens — review a paper to unlock more" : "Ask about your paper…  (⌘/Ctrl + Enter to send)"}
                    disabled={sending || noTokens}
                    className="input min-h-[3rem] flex-1 resize-y"
                  />
                  <button onClick={send} disabled={!canSend} className="btn-primary h-[3rem]">
                    {sending ? "…" : "Send"}
                  </button>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-deep-dim">
                  <span className={tooShort || tooLong ? "text-deep-bad" : ""}>
                    {tooLong
                      ? `${words} / ${MAX_PROMPT_WORDS} words — too long`
                      : tooShort
                      ? `Minimum ${MIN_PROMPT_CHARS} characters`
                      : `${words} / ${MAX_PROMPT_WORDS} words`}
                  </span>
                  <span>1 token per prompt · {tokens?.totalAvailable ?? 0} left</span>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
