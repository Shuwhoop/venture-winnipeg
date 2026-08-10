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
type Budget = "free" | "under-40" | "under-80" | "flexible";

type GroupMember = {
  displayName: string;
  avatarUrl: string | null;
  role: "host" | "member";
  rsvp: Rsvp;
  isViewer: boolean;
};

type PopularValue = {
  label: string;
  count: number;
};

type BlendSummary = {
  contributorCount: number;
  memberCount: number;
  ready: boolean;
  interests: PopularValue[];
  cuisines: PopularValue[];
  neighbourhoods: PopularValue[];
  outingStyles: PopularValue[];
  budget: Budget | null;
  transportation: string | null;
  alcoholFree: boolean;
  likesFreeEvents: boolean;
  likesNightlife: boolean;
  likesOutdoors: boolean;
  likesDateIdeas: boolean;
  protectedNeedsCount: number;
  lastRemixedAt: string | null;
};

type GroupState = {
  members: GroupMember[];
  voteSummary: Record<string, { love: number; okay: number; swap: number }>;
  blend: BlendSummary;
  viewer: {
    authenticated: boolean;
    joined: boolean;
    role: "host" | "member" | null;
    rsvp: Rsvp | null;
    myVotes: Record<string, VoteChoice>;
    contributedVibe: boolean;
  };
};

type GroupStop = {
  key: string;
  order: number;
  name: string;
  startTime: string;
};

type VoteCounts = {
  love: number;
  okay: number;
  swap: number;
};

type StopVerdictTone = "love" | "okay" | "swap" | "waiting";

function rsvpLabel(rsvp: Rsvp) {
  if (rsvp === "going") return "Going";
  if (rsvp === "maybe") return "Maybe";
  return "Can't make it";
}

function rsvpIcon(rsvp: Rsvp) {
  if (rsvp === "going") return "✓";
  if (rsvp === "maybe") return "?";
  return "×";
}

function stopVerdict(counts: VoteCounts): {
  label: string;
  tone: StopVerdictTone;
} {
  const positive = counts.love + counts.okay;
  const total = positive + counts.swap;

  if (total === 0) {
    return { label: "Waiting on votes", tone: "waiting" };
  }

  if (counts.swap >= positive && counts.swap > 0) {
    return { label: "Needs a rethink", tone: "swap" };
  }

  if (counts.love > 0 && counts.love >= counts.okay && counts.love >= counts.swap) {
    return { label: "Group loves this", tone: "love" };
  }

  return { label: "Looks good", tone: "okay" };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "V";
}

function budgetLabel(budget: Budget | null) {
  if (budget === "free") return "Free-first";
  if (budget === "under-40") return "Under $40";
  if (budget === "under-80") return "Under $80";
  if (budget === "flexible") return "Flexible";
  return "Waiting on the group";
}

function formatBlendTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function PreferenceChips({
  items,
  emptyLabel
}: {
  items: PopularValue[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <span className={styles.blendEmptyChip}>{emptyLabel}</span>;
  }

  return (
    <>
      {items.map((item) => (
        <span key={item.label} className={styles.blendChip}>
          {item.label}
          {item.count > 1 ? <b>{item.count}</b> : null}
        </span>
      ))}
    </>
  );
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
  const [confirmRemix, setConfirmRemix] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      const response = await fetch(`/api/outings/${shareCode}/group`, { cache: "no-store" });
      const result = await response.json() as GroupState & { error?: string };
      if (!response.ok) throw new Error(result.error || "The group could not be loaded.");
      setState(result);
      setLastSyncedAt(new Date());
      if (!silent) {
        setStatus("ready");
      }
    } catch (caught) {
      if (!silent) {
        setMessage(caught instanceof Error ? caught.message : "The group could not be loaded.");
        setStatus("error");
      }
    }
  }, [shareCode]);

  useEffect(() => {
    void load();

    const refresh = () => {
      if (document.visibilityState === "visible") {
        void load(true);
      }
    };

    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
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
      const result = await response.json() as GroupState & { error?: string; remixed?: boolean };
      if (!response.ok) throw new Error(result.error || "The group could not be updated.");
      setState(result);

      if (result.remixed) {
        setMessage("Fresh route built from the group blend. Reloading the itinerary…");
        window.location.reload();
      }
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "The group could not be updated.");
    } finally {
      setWorking("");
      setConfirmRemix(false);
    }
  }

  async function shareInvite() {
    const url = window.location.href;
    const data = {
      title: "Join my Venture plan",
      text: "Open the group itinerary, RSVP, blend your vibe, and vote on the stops.",
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

  const planPulse = useMemo(() => {
    let approvedStops = 0;
    let contestedStops = 0;
    let totalReactions = 0;

    for (const stop of stops) {
      const counts = state?.voteSummary[stop.key] ?? { love: 0, okay: 0, swap: 0 };
      const positive = counts.love + counts.okay;
      totalReactions += positive + counts.swap;

      if (positive > counts.swap && positive > 0) {
        approvedStops += 1;
      }

      if (counts.swap >= positive && counts.swap > 0) {
        contestedStops += 1;
      }
    }

    const percent = stops.length > 0
      ? Math.round((approvedStops / stops.length) * 100)
      : 0;

    let headline = "The route is waiting on the crew.";

    if (contestedStops > 0) {
      headline = `${contestedStops} ${contestedStops === 1 ? "stop needs" : "stops need"} another look.`;
    } else if (stops.length > 0 && approvedStops === stops.length && rsvpCounts.going >= 2) {
      headline = "The group is ready to roll.";
    } else if (approvedStops > 0) {
      headline = `${approvedStops} of ${stops.length} stops are feeling good.`;
    } else if ((state?.members.length ?? 0) > 0) {
      headline = "Everyone is in. Now give the stops a quick vote.";
    }

    return {
      approvedStops,
      contestedStops,
      totalReactions,
      percent,
      headline
    };
  }, [rsvpCounts.going, state, stops]);

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

  const blendTime = formatBlendTime(state.blend.lastRemixedAt);

  return (
    <section className={styles.panel} aria-labelledby="venture-group-title">
      <header className={styles.header}>
        <div>
          <div className={styles.liveLine}>
            <span className={styles.eyebrow}>GROUP PULSE</span>
            <span className={styles.liveBadge}>
              <i aria-hidden="true" />
              Live group
              {lastSyncedAt ? <small>· synced</small> : null}
            </span>
          </div>
          <h2 id="venture-group-title">Your crew, the plan, and the decisions in one place.</h2>
          <p>RSVP, blend everyone&apos;s vibe, and settle each stop without digging through a group chat.</p>
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
        <details className={styles.peopleDetails}>
          <summary>
            <span>Who&apos;s in</span>
            <small>{state.members.length} {state.members.length === 1 ? "person" : "people"}</small>
          </summary>
          <div className={styles.memberGrid}>
            {state.members.map((member, index) => (
              <div key={`${member.displayName}-member-${index}`} className={styles.memberCard}>
                <span className={styles.memberAvatar}>
                  {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : initials(member.displayName)}
                </span>
                <div>
                  <strong>
                    {member.displayName}
                    {member.isViewer ? " · you" : ""}
                  </strong>
                  <small>{member.role === "host" ? "Host" : "Crew member"}</small>
                </div>
                <span
                  className={`${styles.memberRsvp} ${
                    member.rsvp === "going"
                      ? styles.memberGoing
                      : member.rsvp === "maybe"
                        ? styles.memberMaybe
                        : styles.memberOut
                  }`}
                  title={rsvpLabel(member.rsvp)}
                >
                  <b aria-hidden="true">{rsvpIcon(member.rsvp)}</b>
                  {rsvpLabel(member.rsvp)}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : (
        <p className={styles.emptyPeople}>No one has joined yet. The invite link is ready when the group is.</p>
      )}

      <div className={styles.planPulseCard}>
        <div className={styles.pulseNumber}>
          <strong>{planPulse.approvedStops}</strong>
          <span>/ {Math.max(1, stops.length)}</span>
        </div>
        <div className={styles.pulseCopy}>
          <span>PLAN PULSE</span>
          <strong>{planPulse.headline}</strong>
          <small>
            {planPulse.totalReactions === 0
              ? "Votes will turn this into a quick group decision meter."
              : `${planPulse.totalReactions} ${planPulse.totalReactions === 1 ? "reaction" : "reactions"} across the route.`}
          </small>
          <div className={styles.pulseTrack} aria-label={`${planPulse.percent}% of stops approved`}>
            <span style={{ width: `${planPulse.percent}%` }} />
          </div>
        </div>
        {planPulse.contestedStops > 0 ? (
          <span className={styles.pulseAlert}>{planPulse.contestedStops} to revisit</span>
        ) : planPulse.percent === 100 && stops.length > 0 ? (
          <span className={styles.pulseReady}>Ready</span>
        ) : (
          <span className={styles.pulseNeutral}>Deciding</span>
        )}
      </div>

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

      <section className={styles.blendCard} aria-labelledby="venture-blend-title">
        <div className={styles.blendTop}>
          <div className={styles.blendIcon} aria-hidden="true">✦</div>
          <div className={styles.blendHeading}>
            <span>BLEND OUR VIBES</span>
            <h3 id="venture-blend-title">Let the group shape the plan.</h3>
            <p>
              Each person opts in. Venture combines the overlap without showing anyone&apos;s individual preference sheet.
            </p>
          </div>
          <div className={styles.blendMeter} aria-label={`${state.blend.contributorCount} of ${Math.max(1, state.blend.memberCount)} group members shared their vibe`}>
            <strong>{state.blend.contributorCount}</strong>
            <span>of {Math.max(1, state.blend.memberCount)}</span>
            <small>blended</small>
          </div>
        </div>

        {!state.viewer.authenticated ? (
          <div className={styles.blendCallout}>
            <span>Sign in and join the plan to add your vibe.</span>
            <Link href={`/sign-in?next=/outings/${shareCode}`}>Sign in</Link>
          </div>
        ) : !state.viewer.joined ? (
          <div className={styles.blendCallout}>
            <span>Join the itinerary first, then choose whether your profile preferences join the blend.</span>
          </div>
        ) : (
          <div className={styles.blendConsentRow}>
            <div>
              <strong>{state.viewer.contributedVibe ? "Your vibe is in the mix" : "Add your Venture vibe"}</strong>
              <small>
                {state.viewer.contributedVibe
                  ? "Update it anytime from your current profile preferences, or pull it back out."
                  : "Shares a private snapshot of your event preferences with this plan only. Others only see the group blend."}
              </small>
            </div>
            <div className={styles.blendConsentActions}>
              <button
                type="button"
                disabled={Boolean(working)}
                onClick={() => void updateGroup({ action: "contribute-vibe" }, "contribute-vibe")}
              >
                {working === "contribute-vibe"
                  ? "Blending…"
                  : state.viewer.contributedVibe
                    ? "Refresh my vibe"
                    : "Add my vibe"}
              </button>
              {state.viewer.contributedVibe ? (
                <button
                  type="button"
                  className={styles.quietButton}
                  disabled={Boolean(working)}
                  onClick={() => void updateGroup({ action: "remove-vibe" }, "remove-vibe")}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        )}

        {!state.blend.ready ? (
          <div className={styles.blendWaiting}>
            <div className={styles.blendProgressTrack}>
              <span style={{ width: `${Math.min(100, state.blend.contributorCount * 50)}%` }} />
            </div>
            <strong>
              {state.blend.contributorCount === 0
                ? "The blend starts when someone opts in."
                : "One more vibe unlocks the group blend."}
            </strong>
            <small>Detailed preferences stay hidden until at least two people contribute, so one person&apos;s choices are not displayed as the whole group.</small>
          </div>
        ) : (
          <div className={styles.blendResults}>
            <div className={styles.blendResultHeader}>
              <div>
                <span>THE OVERLAP</span>
                <strong>This is what Venture hears from the group.</strong>
              </div>
              {blendTime ? <small>Last remix · {blendTime}</small> : null}
            </div>

            <div className={styles.blendRows}>
              <div className={styles.blendRow}>
                <b>Do more of</b>
                <div>
                  <PreferenceChips items={state.blend.interests} emptyLabel="Open-minded" />
                </div>
              </div>

              <div className={styles.blendRow}>
                <b>Food energy</b>
                <div>
                  <PreferenceChips items={state.blend.cuisines} emptyLabel="Anything good" />
                </div>
              </div>

              <div className={styles.blendRow}>
                <b>Where</b>
                <div>
                  <PreferenceChips items={state.blend.neighbourhoods} emptyLabel="Anywhere in Winnipeg" />
                </div>
              </div>

              <div className={styles.blendRow}>
                <b>Plan style</b>
                <div>
                  <PreferenceChips items={state.blend.outingStyles} emptyLabel="Flexible" />
                </div>
              </div>
            </div>

            <div className={styles.blendFacts}>
              <span><i aria-hidden="true">$</i>{budgetLabel(state.blend.budget)}</span>
              <span><i aria-hidden="true">↗</i>{state.blend.transportation || "Mixed transport"}</span>
              {state.blend.alcoholFree ? <span><i aria-hidden="true">0%</i>Alcohol-free</span> : null}
              {state.blend.likesNightlife ? <span><i aria-hidden="true">☾</i>Nightlife energy</span> : null}
              {state.blend.likesOutdoors ? <span><i aria-hidden="true">☀</i>Outdoor-friendly</span> : null}
              {state.blend.likesFreeEvents ? <span><i aria-hidden="true">✦</i>Free finds welcome</span> : null}
              {state.blend.likesDateIdeas ? <span><i aria-hidden="true">♡</i>Date energy</span> : null}
            </div>

            {state.blend.protectedNeedsCount > 0 ? (
              <div className={styles.privateNeeds}>
                <span aria-hidden="true">🔒</span>
                <div>
                  <strong>{state.blend.protectedNeedsCount} private practical {state.blend.protectedNeedsCount === 1 ? "need" : "needs"} flagged</strong>
                  <small>Dietary and accessibility details are not shown to the group. Venture flags them for confirmation rather than exposing who selected what.</small>
                </div>
              </div>
            ) : null}

            {state.viewer.role === "host" ? (
              <div className={styles.remixArea}>
                {!confirmRemix ? (
                  <>
                    <div>
                      <strong>Host control</strong>
                      <small>Remix keeps the date and time, rebuilds the stops around the group blend, and clears the old stop votes.</small>
                    </div>
                    <button
                      type="button"
                      className={styles.remixButton}
                      disabled={Boolean(working)}
                      onClick={() => setConfirmRemix(true)}
                    >
                      Remix this itinerary
                    </button>
                  </>
                ) : (
                  <div className={styles.remixConfirm}>
                    <div>
                      <strong>Ready to reshuffle the route?</strong>
                      <small>The current shared link stays the same. The stops change and everyone votes again.</small>
                    </div>
                    <div>
                      <button
                        type="button"
                        disabled={Boolean(working)}
                        onClick={() => void updateGroup({ action: "remix" }, "remix")}
                      >
                        {working === "remix" ? "Venture is blending…" : "Yes, remix it"}
                      </button>
                      <button
                        type="button"
                        className={styles.quietButton}
                        disabled={Boolean(working)}
                        onClick={() => setConfirmRemix(false)}
                      >
                        Keep this plan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.memberBlendNote}>
                <span aria-hidden="true">✦</span>
                <p>The host can remix this same shared itinerary from the blend when the group is ready.</p>
              </div>
            )}
          </div>
        )}
      </section>

      <div className={styles.voteSection}>
        <header>
          <span>STOP VOTE</span>
          <h3>Quick reactions, not a committee meeting.</h3>
        </header>

        <div className={styles.stopVotes}>
          {stops.map((stop) => {
            const counts = state.voteSummary[stop.key] ?? { love: 0, okay: 0, swap: 0 };
            const mine = state.viewer.myVotes[stop.key];
            const verdict = stopVerdict(counts);
            const totalVotes = counts.love + counts.okay + counts.swap;
            return (
              <article key={stop.key} className={styles.stopVoteCard}>
                <div className={styles.stopVoteHeader}>
                  <div className={styles.stopIdentity}>
                    <span>{stop.order}</span>
                    <div>
                      <strong>{stop.name}</strong>
                      <small>{stop.startTime}</small>
                    </div>
                  </div>
                  <span
                    className={`${styles.verdict} ${
                      verdict.tone === "love"
                        ? styles.verdictLove
                        : verdict.tone === "okay"
                          ? styles.verdictOkay
                          : verdict.tone === "swap"
                            ? styles.verdictSwap
                            : styles.verdictWaiting
                    }`}
                  >
                    {verdict.label}
                  </span>
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
                <div className={styles.voteDistribution} aria-label={`${totalVotes} votes on ${stop.name}`}>
                  {totalVotes > 0 ? (
                    <>
                      <span
                        className={styles.voteLoveBar}
                        style={{ width: `${(counts.love / totalVotes) * 100}%` }}
                        title={`${counts.love} love`}
                      />
                      <span
                        className={styles.voteOkayBar}
                        style={{ width: `${(counts.okay / totalVotes) * 100}%` }}
                        title={`${counts.okay} fine`}
                      />
                      <span
                        className={styles.voteSwapBar}
                        style={{ width: `${(counts.swap / totalVotes) * 100}%` }}
                        title={`${counts.swap} swap`}
                      />
                    </>
                  ) : (
                    <span className={styles.voteEmptyBar} />
                  )}
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
