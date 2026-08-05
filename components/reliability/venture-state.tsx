"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./venture-state.module.css";

type StateTone =
  | "loading"
  | "error"
  | "missing"
  | "offline";

type LoadingLayout =
  | "cards"
  | "detail"
  | "outing";

type VentureStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
};

type VentureStateProps = {
  tone: StateTone;
  eyebrow: string;
  title: string;
  body: string;
  actions?: VentureStateAction[];
  children?: ReactNode;
};

function StateIllustration({
  tone
}: {
  tone: StateTone;
}) {
  if (tone === "loading") {
    return (
      <div className={`${styles.illustration} ${styles.loadingIllustration}`} aria-hidden="true">
        <svg viewBox="0 0 120 120" fill="none">
          <path d="M25 84c15-18 28-24 43-21 13 2 22-4 29-22" />
          <circle cx="26" cy="84" r="8" />
          <circle cx="97" cy="40" r="8" />
          <path d="M52 42h25M64.5 29.5v25" />
        </svg>
      </div>
    );
  }

  if (tone === "missing") {
    return (
      <div className={`${styles.illustration} ${styles.missingIllustration}`} aria-hidden="true">
        <svg viewBox="0 0 120 120" fill="none">
          <path d="M31 84 48 37l25 12 16-19" />
          <path d="m28 86 14 4 7-12 14 7 8-12 20 10" />
          <circle cx="87" cy="34" r="10" />
          <path d="m94 42 9 9" />
        </svg>
      </div>
    );
  }

  if (tone === "offline") {
    return (
      <div className={`${styles.illustration} ${styles.offlineIllustration}`} aria-hidden="true">
        <svg viewBox="0 0 120 120" fill="none">
          <path d="M27 67c18-19 48-19 66 0" />
          <path d="M40 80c11-11 29-11 40 0" />
          <circle cx="60" cy="94" r="5" />
          <path d="m25 26 70 70" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`${styles.illustration} ${styles.errorIllustration}`} aria-hidden="true">
      <svg viewBox="0 0 120 120" fill="none">
        <path d="M60 21 104 95H16L60 21Z" />
        <path d="M60 47v23" />
        <circle cx="60" cy="82" r="3" />
      </svg>
    </div>
  );
}

function Action({
  action
}: {
  action: VentureStateAction;
}) {
  const className = action.primary
    ? styles.primaryAction
    : styles.secondaryAction;

  if (action.href) {
    return (
      <Link className={className} href={action.href}>
        {action.label}
      </Link>
    );
  }

  return (
    <button className={className} type="button" onClick={action.onClick}>
      {action.label}
    </button>
  );
}

export function VentureState({
  tone,
  eyebrow,
  title,
  body,
  actions = [],
  children
}: VentureStateProps) {
  return (
    <section className={`${styles.statePage} ${styles[tone]}`} aria-live={tone === "loading" ? "polite" : "assertive"}>
      <div className={styles.stateCard}>
        <StateIllustration tone={tone} />

        <div className={styles.copy}>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{body}</p>
        </div>

        {children}

        {actions.length > 0 ? (
          <div className={styles.actions}>
            {actions.map((action) => (
              <Action key={`${action.label}-${action.href ?? "button"}`} action={action} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function VentureLoadingState({
  eyebrow = "VENTURE IS LOOKING",
  title = "Getting the city ready.",
  body = "Pulling together the useful bits without making you stare at a blank screen.",
  layout = "cards"
}: {
  eyebrow?: string;
  title?: string;
  body?: string;
  layout?: LoadingLayout;
}) {
  return (
    <VentureState tone="loading" eyebrow={eyebrow} title={title} body={body}>
      <div className={`${styles.skeleton} ${styles[layout]}`} aria-hidden="true">
        {layout === "detail" ? (
          <>
            <i className={styles.heroSkeleton} />
            <div className={styles.lineGroup}>
              <i />
              <i />
              <i />
            </div>
          </>
        ) : layout === "outing" ? (
          <>
            <i className={styles.routeSkeleton} />
            <i className={styles.stopSkeleton} />
            <i className={styles.stopSkeleton} />
          </>
        ) : (
          <>
            <i className={styles.searchSkeleton} />
            <div className={styles.chipSkeletons}>
              <i />
              <i />
              <i />
            </div>
            <i className={styles.cardSkeleton} />
            <i className={styles.cardSkeleton} />
          </>
        )}
      </div>
    </VentureState>
  );
}

export function VentureErrorState({
  eyebrow = "VENTURE HIT A DETOUR",
  title = "That part did not load.",
  body = "Your saved information is safe. Try the request again, or take another route through Venture.",
  retryLabel = "Try again",
  onRetry,
  secondaryLabel = "Return home",
  secondaryHref = "/"
}: {
  eyebrow?: string;
  title?: string;
  body?: string;
  retryLabel?: string;
  onRetry: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <VentureState
      tone="error"
      eyebrow={eyebrow}
      title={title}
      body={body}
      actions={[
        {
          label: retryLabel,
          onClick: onRetry,
          primary: true
        },
        {
          label: secondaryLabel,
          href: secondaryHref
        }
      ]}
    />
  );
}

export function VentureNotFoundState() {
  return (
    <VentureState
      tone="missing"
      eyebrow="NOT ON THIS MAP"
      title="This page wandered off."
      body="The link may be old, the listing may have moved, or this route never existed in the first place."
      actions={[
        {
          label: "Explore Winnipeg",
          href: "/explore",
          primary: true
        },
        {
          label: "Return home",
          href: "/"
        }
      ]}
    />
  );
}
