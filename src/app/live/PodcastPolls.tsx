"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type PollOption = { id: string; label: string; votes: number };
type Poll = {
  id: string;
  title: string;
  description: string;
  endsAt: string | null;
  options: PollOption[];
  totalVotes: number;
  selectedOptionId: string | null;
  canVote: boolean;
};

function isLocalhost() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function pollsApiUrl() {
  return isLocalhost()
    ? "https://docupeer.org/api/podcasts/polls"
    : "/api/podcasts/polls";
}

function voteLabel(count: number) {
  return `${count} ${count === 1 ? "vote" : "votes"}`;
}

type DurationUnit = "minutes" | "hours" | "days";
const DURATION_MULTIPLIERS: Record<DurationUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
};

export function PodcastPolls() {
  const refreshId = useRef(0);
  const [adminPassword, setAdminPassword] = useState("");
  const [polls, setPolls] = useState<Poll[]>([]);
  const [local, setLocal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [votingId, setVotingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [durationValue, setDurationValue] = useState("1");
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("days");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    setLocal(isLocalhost());

    async function refreshPolls() {
      const requestId = ++refreshId.current;
      try {
        const response = await fetch(pollsApiUrl(), { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load polls.");
        if (!cancelled && requestId === refreshId.current) {
          setPolls(data.polls || []);
          setError("");
        }
      } catch (err) {
        if (!cancelled && requestId === refreshId.current) {
          setError(err instanceof Error ? err.message : "Could not load polls.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    refreshPolls();
    const refreshTimer = window.setInterval(refreshPolls, 5 * 60_000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshPolls();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  async function vote(pollId: string, optionId: string) {
    if (votingId) return;
    if (local && !adminPassword) {
      setError("Enter the admin password above to cast localhost votes.");
      return;
    }
    setVotingId(pollId);
    setError("");
    try {
      const response = await fetch(pollsApiUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "vote", pollId, optionId, ...(local ? { password: adminPassword } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your vote.");
      if (data.poll) {
        refreshId.current++;
        setPolls((current) => current.map((poll) => poll.id === pollId ? data.poll : poll));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your vote.");
    } finally {
      setVotingId(null);
    }
  }

  async function createPoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!local || creating) return;
    if (!adminPassword) {
      setError("Enter the admin password above to publish this poll.");
      return;
    }

    setCreating(true);
    setError("");
    try {
      const response = await fetch(pollsApiUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title,
          description,
          options,
          durationMinutes: Number(durationValue) * DURATION_MULTIPLIERS[durationUnit],
          password: adminPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create the poll.");
      refreshId.current++;
      setPolls(data.polls || []);
      setTitle("");
      setDescription("");
      setOptions(["", ""]);
      setDurationValue("1");
      setDurationUnit("days");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the poll.");
    } finally {
      setCreating(false);
    }
  }

  async function deletePoll(poll: Poll) {
    if (!local || deletingId) return;
    if (!adminPassword) {
      setError("Enter the admin password above to delete this poll.");
      return;
    }

    setDeletingId(poll.id);
    setError("");
    try {
      const response = await fetch(pollsApiUrl(), {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, password: adminPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete the poll.");
      refreshId.current++;
      setPolls((current) => current.filter((item) => item.id !== poll.id));
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the poll.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mt-8" aria-labelledby="podcast-polls-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-deep-dim">Community</p>
          <h2 id="podcast-polls-heading" className="mt-1 text-3xl">Polls</h2>
        </div>
        {local && (
          <button type="button" onClick={() => setShowForm((value) => !value)} className="btn-secondary px-4 py-2 text-sm">
            {showForm ? "Close form" : "Create poll"}
          </button>
        )}
      </div>

      {local && (
        <div className="mb-5 rounded-2xl border border-deep-border bg-deep-panel p-5 sm:p-6">
          <label htmlFor="poll-admin-password" className="mb-1 block text-sm font-semibold">Admin password</label>
          <input
            id="poll-admin-password"
            type="password"
            autoComplete="off"
            className="input max-w-sm"
            value={adminPassword}
            onChange={(event) => setAdminPassword(event.target.value)}
            placeholder="Enter your admin password"
          />
          <p className="mt-2 text-xs text-deep-dim">Enter it once per page load to publish, delete, and cast repeatable localhost votes.</p>
        </div>
      )}

      {local && showForm && (
        <form onSubmit={createPoll} className="mb-5 space-y-4 rounded-2xl border border-deep-border bg-deep-panel p-5 shadow-panel sm:p-6">
          <div>
            <label htmlFor="poll-title" className="mb-1 block text-sm font-semibold">Title</label>
            <input id="poll-title" className="input" required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What should we ask?" />
          </div>
          <div>
            <label htmlFor="poll-description" className="mb-1 block text-sm font-semibold">Description</label>
            <textarea id="poll-description" className="input min-h-24 resize-y" required maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Give listeners a little context…" />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Choices</legend>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    aria-label={`Choice ${index + 1}`}
                    className="input"
                    required
                    maxLength={80}
                    value={option}
                    onChange={(event) => setOptions((current) => current.map((item, position) => position === index ? event.target.value : item))}
                    placeholder={`Choice ${index + 1}`}
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => setOptions((current) => current.filter((_, position) => position !== index))} className="btn-secondary px-3 text-sm" aria-label={`Remove choice ${index + 1}`}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 8 && (
              <button type="button" onClick={() => setOptions((current) => [...current, ""])} className="mt-3 text-sm font-semibold text-deep-accent hover:underline">
                + Add choice
              </button>
            )}
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">How long should voting stay open?</legend>
            <div className="flex max-w-sm gap-2">
              <input
                aria-label="Poll duration"
                type="number"
                min={1}
                max={365 * 1440 / DURATION_MULTIPLIERS[durationUnit]}
                step={1}
                required
                className="input"
                value={durationValue}
                onChange={(event) => setDurationValue(event.target.value)}
              />
              <select
                aria-label="Poll duration unit"
                className="input w-32 shrink-0"
                value={durationUnit}
                onChange={(event) => {
                  const unit = event.target.value as DurationUnit;
                  setDurationUnit(unit);
                  setDurationValue((current) => String(Math.min(Number(current) || 1, 365 * 1440 / DURATION_MULTIPLIERS[unit])));
                }}
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
            <p className="mt-2 text-xs text-deep-dim">Up to 365 days. Results remain visible after voting closes.</p>
          </fieldset>
          <button type="submit" disabled={creating} className="btn-primary px-5 py-2 text-sm disabled:opacity-50">
            {creating ? "Publishing…" : "Publish poll"}
          </button>
        </form>
      )}

      {error && <p role="alert" className="mb-4 text-sm font-medium text-deep-bad">{error}</p>}
      {loading ? (
        <p className="text-sm text-deep-dim">Loading polls…</p>
      ) : polls.length === 0 && !error ? (
        <p className="rounded-2xl border border-deep-border bg-deep-panel px-5 py-6 text-sm text-deep-text-soft">No polls yet. Check back soon.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {polls.map((poll) => {
            const closed = Boolean(poll.endsAt && new Date(poll.endsAt).getTime() <= now);
            return (
              <article key={poll.id} className="rounded-2xl border border-deep-border bg-deep-panel p-5 shadow-panel sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-2xl">{poll.title}</h3>
                {local && (
                  <button type="button" onClick={() => setPendingDeleteId(poll.id)} disabled={Boolean(deletingId)} className="shrink-0 text-xs font-semibold text-deep-bad hover:underline disabled:opacity-50">
                    Delete
                  </button>
                )}
              </div>
              {local && pendingDeleteId === poll.id && (
                <div className="mt-3 rounded-xl border border-deep-bad/30 bg-deep-panel2 p-3 text-sm">
                  <p>Delete this poll and all its votes?</p>
                  <div className="mt-2 flex gap-3">
                    <button type="button" onClick={() => deletePoll(poll)} disabled={Boolean(deletingId)} className="font-semibold text-deep-bad disabled:opacity-50">
                      {deletingId === poll.id ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button type="button" onClick={() => setPendingDeleteId(null)} disabled={Boolean(deletingId)} className="font-semibold text-deep-dim">Cancel</button>
                  </div>
                </div>
              )}
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-deep-text-soft">{poll.description}</p>
              <p className="mt-2 text-xs text-deep-dim">
                {poll.endsAt
                  ? `${closed ? "Voting ended" : "Voting ends"} ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(poll.endsAt))}`
                  : "Voting is open"}
              </p>
              <p className="mt-3 text-xs font-semibold text-deep-dim" aria-live="polite">{voteLabel(poll.totalVotes)} total</p>
              <div className="mt-4 space-y-2">
                {poll.options.map((option) => {
                  const percent = poll.totalVotes ? Math.round(option.votes / poll.totalVotes * 100) : 0;
                  const selected = poll.selectedOptionId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => vote(poll.id, option.id)}
                      disabled={closed || !poll.canVote || Boolean(votingId) || Boolean(deletingId)}
                      aria-label={`${option.label}: ${voteLabel(option.votes)}, ${percent}%${selected ? ", your choice" : ""}`}
                      className={`relative block w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-accent disabled:cursor-default ${selected ? "border-deep-accent" : "border-deep-border hover:border-deep-accent/60"}`}
                    >
                      <span className="absolute inset-y-0 left-0 bg-deep-accent-soft transition-all" style={{ width: `${percent}%` }} aria-hidden="true" />
                      <span className="relative flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-semibold">{option.label}{selected ? " ✓" : ""}</span>
                        <span className="tabular-nums text-deep-text-soft">{voteLabel(option.votes)} · {percent}%</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs leading-5 text-deep-dim">
                {closed ? "Voting is closed. Results remain visible." : local ? "Localhost votes count on the live site. You can vote again as often as you like." : poll.canVote ? "One vote per listener. Counts are visible before you pick." : "Thanks for voting. The counts remain visible to everyone."}
              </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
