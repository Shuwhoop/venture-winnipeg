"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import styles from "./group-itinerary-panel.module.css";

type Rsvp = "going" | "maybe" | "not-going";
type VoteChoice = "love" | "okay" | "swap";

type GroupMember = {
  displayName: string;
  avatarUrl: string | null;
  role: "host" | "member";
  rsvp: Rsvp;
  isViewer: boolean;
};

type GroupState = {
  members: GroupMember[];
  voteSummary: Record<string, { love: number; okay: number; swap: number }>;
  viewer: {
    authenticated: boolean;
    joined: boolean;
    role: "host" | "member" | null;
    rsvp: Rsvp | null;
    myVotes: Record<string, VoteChoice>;
  };
};

type GroupStop = {
  key: string;
  order: number;
  name: string;
  startTime: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "V";
}

export function GroupItineraryPanel({
  shareCode,
  stops
}: {
  shareCode: string;
  stops: GroupStop[];
}) {
  const [state, setState] = useState<GroupState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/outings/${shareCode}/group`, { cache: "no-store" });
      const result = await response.json() as GroupState & { error?: string };
      if (!response.ok) throw new Error(result.error || "The group could not be loaded.");
      setState(result);
      setStatus("ready");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The group could not be loaded.");
      setStatus("error");
    }
  }, [shareCode]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateGroup(body: Record<string, unknown>, actionKey: string) {
    setWorking(actionKey);
    setMessage("");
    try {
      const response = await fetch(`/api/outings/${shareCode}/group`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const result = await response.json() as GroupState & { error?: string };
      if (!response.ok) throw new Error(result.error || "The group could not be updated.");
      setState(result);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The group could not be updated.");
    } finally {
      setWorking("");
    }
  }

  async function shareInvite() {
    const url = window.location.href;
    const data = {
      title: "Join my Venture plan",
      text: "Open the group itinerary, RSVP, and vote on the stops.",
      url
    };

    try {
      if (typeof navigator.share === "function") {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage("The invite link is ready in your address bar if sharing was cancelled.");
    }
  }

  const rsvpCounts = useMemo(() => {
    const counts = { going: 0, maybe: 0, notGoing: 0 };
    for (const member of state?.members ?? []) {
      if (member.rsvp === "going") counts.going += 1;
      else if (member.rsvp === "maybe") counts.maybe += 1;
      else counts.notGoing += 1;
    }
    return counts;
  }, [state]);

  if (status === "loading") {
    return (
      <section className={styles.panel} aria-busy="true">
        <div className={styles.loadingLine} />
        <p>Opening the group plan…</p>
      </section>
    );
  }

  if (status === "error" || !state) {
    return (
      <section className={styles.panel}>
        <span className={styles.eyebrow}>GROUP PLAN</span>
        <h2>The itinerary is here, but the group pulse needs another try.</h2>
        <button type="button" onClick={() => void load()}>Try again</button>
        {message ? <p className={styles.message}>{message}</p> : null}
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby="venture-group-title">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>GROUP PULSE</span>
          <h2 id="venture-group-title">Plan together without starting a group chat spreadsheet.</h2>
          <p>Join with your Venture account, RSVP, and give each stop a quick vote.</p>
        </div>
        <button type="button" className={styles.inviteButton} onClick={() => void shareInvite()}>
          {copied ? "Link copied" : "Invite friends"}
        </button>
      </header>

      <div className={styles.peopleRow}>
        <div className={styles.avatarStack} aria-label={`${state.members.length} people joined`}>
          {state.members.slice(0, 6).map((member, index) => (
            <span key={`${member.displayName}-${index}`} className={styles.avatar} title={`${member.displayName}${member.role === "host" ? " · Host" : ""}`}>
              {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : initials(member.displayName)}
            </span>
          ))}
          {state.members.length > 6 ? <span className={styles.avatarMore}>+{state.members.length - 6}</span> : null}
        </div>
        <div className={styles.attendance}>
          <span><strong>{rsvpCounts.going}</strong> going</span>
          <span><strong>{rsvpCounts.maybe}</strong> maybe</span>
        </div>
      </div>

      {state.members.length > 0 ? (
        <div className={styles.memberNames}>
          {state.members.slice(0, 8).map((member, index) => (
            <span key={`${member.displayName}-name-${index}`}>
              {member.displayName}{member.role === "host" ? " · host" : ""}
            </span>
          ))}
        </div>
      ) : (
        <p className={styles.emptyPeople}>No one has joined yet. The invite link is ready when the group is.</p>
      )}

      {!state.viewer.authenticated ? (
        <div className={styles.joinCard}>
          <div>
            <strong>Make your vote count</strong>
            <small>Google sign-in lets Venture know which friend is voting without exposing everyone&apos;s private profile.</small>
          </div>
          <Link href={`/sign-in?next=/outings/${shareCode}`}>Continue with Venture</Link>
        </div>
      ) : !state.viewer.joined ? (
        <div className={styles.joinCard}>
          <div>
            <strong>Are you in?</strong>
            <small>Joining only shares your display name and avatar inside this group itinerary.</small>
          </div>
          <div className={styles.joinActions}>
            <button type="button" disabled={Boolean(working)} onClick={() => void updateGroup({ action: "join", rsvp: "going" }, "join-going")}>I&apos;m in</button>
            <button type="button" disabled={Boolean(working)} onClick={() => void updateGroup({ action: "join", rsvp: "maybe" }, "join-maybe")}>Maybe</button>
          </div>
        </div>
      ) : (
        <div className={styles.rsvpRow}>
          <span>{state.viewer.role === "host" ? "You are hosting" : "Your RSVP"}</span>
          <div>
            {(["going", "maybe", "not-going"] as Rsvp[]).map((rsvp) => (
              <button
                key={rsvp}
                type="button"
                className={state.viewer.rsvp === rsvp ? styles.rsvpActive : undefined}
                disabled={Boolean(working)}
                onClick={() => void updateGroup({ action: "rsvp", rsvp }, `rsvp-${rsvp}`)}
              >
                {rsvp === "going" ? "Going" : rsvp === "maybe" ? "Maybe" : "Can\x27t make it"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.voteSection}>
        <header>
          <span>STOP VOTE</span>
          <h3>Quick reactions, not a committee meeting.</h3>
        </header>

        <div className={styles.stopVotes}>
          {stops.map((stop) => {
            const counts = state.voteSummary[stop.key] ?? { love: 0, okay: 0, swap: 0 };
            const mine = state.viewer.myVotes[stop.key];
            return (
              <article key={stop.key} className={styles.stopVoteCard}>
                <div className={styles.stopIdentity}>
                  <span>{stop.order}</span>
                  <div>
                    <strong>{stop.name}</strong>
                    <small>{stop.startTime}</small>
                  </div>
                </div>
                <div className={styles.voteButtons}>
                  {([
                    ["love", "♥ Love", counts.love],
                    ["okay", "✓ Fine", counts.okay],
                    ["swap", "↻ Swap", counts.swap]
                  ] as [VoteChoice, string, number][]).map(([choice, label, count]) => (
                    <button
                      key={choice}
                      type="button"
                      className={mine === choice ? styles.voteActive : undefined}
                      disabled={!state.viewer.joined || Boolean(working)}
                      onClick={() => void updateGroup({ action: "vote", stopKey: stop.key, choice }, `vote-${stop.key}-${choice}`)}
                    >
                      <span>{label}</span>
                      <b>{count}</b>
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {message ? <p className={styles.message} role="status">{message}</p> : null}
    </section>
  );
}
