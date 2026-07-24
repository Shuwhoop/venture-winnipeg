"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  ACCOUNT_AUTH_EVENT,
  ACCOUNT_SYNC_REQUEST_EVENT,
  ACCOUNT_SYNC_STATUS_EVENT
} from "@/lib/account-sync-storage";

import {
  dispatchAuthChanged,
  getCurrentVentureUser,
  getLocalAccountSyncState,
  runAccountSync,
  type AccountSyncState
} from "@/lib/account-sync";

import {
  PROFILE_PREFERENCES_EVENT
} from "@/lib/profile-preferences";

import {
  SAVED_LISTINGS_EVENT
} from "@/lib/saved-listings";

import {
  SAVED_OUTINGS_EVENT
} from "@/lib/saved-outings";

import {
  VISIT_HISTORY_EVENT
} from "@/lib/visit-history";

import {
  getSupabaseBrowserClient
} from "@/lib/supabase/client";

import styles from "./account-sync.module.css";

function formatSyncTime(
  value: string | null
) {
  if (!value) {
    return "Not synced yet";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Synced previously";
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(parsed);
}

function phaseLabel(
  state: AccountSyncState
) {
  switch (state.phase) {
    case "loading":
      return "Checking account";
    case "syncing":
      return "Syncing now";
    case "synced":
      return "Everything is synced";
    case "offline":
      return "Waiting for connection";
    case "error":
      return "Sync needs another try";
    case "idle":
      return "Ready to sync";
    default:
      return "Guest mode";
  }
}

function useAccountSyncState() {
  const [state, setState] =
    useState<AccountSyncState>({
      phase: "loading",
      userId: null,
      email: null,
      lastSyncedAt: null,
      error: null,
      savedListingCount: 0,
      savedOutingCount: 0,
      visitedCount: 0,
      pendingDeletionCount: 0
    });

  useEffect(() => {
    let cancelled = false;

    const refreshUser = async () => {
      const user =
        await getCurrentVentureUser();

      if (cancelled) {
        return;
      }

      const local =
        getLocalAccountSyncState();

      setState({
        ...local,
        phase: user
          ? local.phase === "guest"
            ? "idle"
            : local.phase
          : "guest",
        userId: user?.id ?? null,
        email: user?.email ?? null
      });
    };

    const onStatus = (event: Event) => {
      const customEvent =
        event as CustomEvent<AccountSyncState>;

      if (customEvent.detail) {
        setState(customEvent.detail);
      }
    };

    const onAuth = () => {
      void refreshUser();
    };

    window.addEventListener(
      ACCOUNT_SYNC_STATUS_EVENT,
      onStatus
    );
    window.addEventListener(
      ACCOUNT_AUTH_EVENT,
      onAuth
    );

    void refreshUser();

    return () => {
      cancelled = true;
      window.removeEventListener(
        ACCOUNT_SYNC_STATUS_EVENT,
        onStatus
      );
      window.removeEventListener(
        ACCOUNT_AUTH_EVENT,
        onAuth
      );
    };
  }, []);

  return state;
}

export function AccountSyncRuntime() {
  const timer = useRef<number | null>(null);

  const scheduleSync = useCallback(
    (delay = 350) => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }

      timer.current = window.setTimeout(
        () => {
          timer.current = null;
          void runAccountSync();
        },
        delay
      );
    },
    []
  );

  useEffect(() => {
    let supabase: ReturnType<
      typeof getSupabaseBrowserClient
    >;

    try {
      supabase =
        getSupabaseBrowserClient();
    } catch {
      return;
    }

    const onSyncRequest = () => {
      scheduleSync();
    };

    const onOnline = () => {
      scheduleSync(100);
    };

    window.addEventListener(
      ACCOUNT_SYNC_REQUEST_EVENT,
      onSyncRequest
    );
    window.addEventListener(
      SAVED_LISTINGS_EVENT,
      onSyncRequest
    );
    window.addEventListener(
      SAVED_OUTINGS_EVENT,
      onSyncRequest
    );
    window.addEventListener(
      VISIT_HISTORY_EVENT,
      onSyncRequest
    );
    window.addEventListener(
      PROFILE_PREFERENCES_EVENT,
      onSyncRequest
    );
    window.addEventListener(
      "online",
      onOnline
    );

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        dispatchAuthChanged();

        if (
          session?.user &&
          event !== "SIGNED_OUT"
        ) {
          scheduleSync(100);
        }
      }
    );

    scheduleSync(150);

    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }

      subscription.unsubscribe();
      window.removeEventListener(
        ACCOUNT_SYNC_REQUEST_EVENT,
        onSyncRequest
      );
      window.removeEventListener(
        SAVED_LISTINGS_EVENT,
        onSyncRequest
      );
      window.removeEventListener(
        SAVED_OUTINGS_EVENT,
        onSyncRequest
      );
      window.removeEventListener(
        VISIT_HISTORY_EVENT,
        onSyncRequest
      );
      window.removeEventListener(
        PROFILE_PREFERENCES_EVENT,
        onSyncRequest
      );
      window.removeEventListener(
        "online",
        onOnline
      );
    };
  }, [scheduleSync]);

  return null;
}

export function AccountSyncCard() {
  const router = useRouter();
  const state = useAccountSyncState();
  const [signingOut, setSigningOut] =
    useState(false);

  const totalSaved =
    state.savedListingCount +
    state.savedOutingCount;

  const syncDescription = useMemo(() => {
    if (state.phase === "offline") {
      return "Your local saves are still here. Venture will catch the cloud up when the connection returns.";
    }

    if (state.phase === "error") {
      return state.error ??
        "Your local data is safe. Try syncing again.";
    }

    if (state.phase === "syncing") {
      return "Merging this device with your Venture account without dropping either copy.";
    }

    return `${totalSaved} saved ${
      totalSaved === 1 ? "item" : "items"
    } and ${state.visitedCount} logged ${
      state.visitedCount === 1 ? "visit" : "visits"
    } on this device.`;
  }, [state, totalSaved]);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      const supabase =
        getSupabaseBrowserClient();

      await supabase.auth.signOut();
      dispatchAuthChanged();
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  if (
    state.phase === "guest" ||
    (
      state.phase === "loading" &&
      !state.userId
    )
  ) {
    return (
      <section className={styles.guestCard}>
        <div className={styles.accountMark} aria-hidden="true">
          <span>V</span>
          <i />
        </div>

        <div className={styles.guestCopy}>
          <span>VENTURE ACCOUNT</span>
          <h2>Take your saves with you.</h2>
          <p>
            Keep browsing as a guest, or connect an email when you want your
            places, outings, visit history, and preferences on another device.
          </p>
        </div>

        <Link
          className={styles.primaryAction}
          href="/sign-in?next=/profile"
        >
          Sign in to sync
        </Link>

        <small className={styles.privacyNote}>
          Browsing and building outings never require an account.
        </small>
      </section>
    );
  }

  return (
    <section className={styles.accountCard}>
      <header className={styles.accountHeader}>
        <div>
          <span>VENTURE ACCOUNT</span>
          <h2>{phaseLabel(state)}</h2>
          <p>{syncDescription}</p>
        </div>

        <span
          className={`${styles.phaseDot} ${
            styles[state.phase]
          }`}
          aria-hidden="true"
        />
      </header>

      <div className={styles.accountIdentity}>
        <div aria-hidden="true">
          {(state.email ?? "V")
            .charAt(0)
            .toUpperCase()}
        </div>
        <span>
          <small>CONNECTED EMAIL</small>
          <strong>{state.email}</strong>
        </span>
      </div>

      <div className={styles.syncStats}>
        <article>
          <strong>{state.savedListingCount}</strong>
          <span>Places + events</span>
        </article>
        <article>
          <strong>{state.savedOutingCount}</strong>
          <span>Complete outings</span>
        </article>
        <article>
          <strong>{state.visitedCount}</strong>
          <span>Logged visits</span>
        </article>
        <article>
          <strong>{state.pendingDeletionCount}</strong>
          <span>Pending changes</span>
        </article>
      </div>

      <div className={styles.syncFooter}>
        <span>
          Last sync
          <strong>{formatSyncTime(state.lastSyncedAt)}</strong>
        </span>

        <div>
          <button
            type="button"
            onClick={() => void runAccountSync()}
            disabled={state.phase === "syncing"}
          >
            {state.phase === "syncing"
              ? "Syncing…"
              : "Sync now"}
          </button>

          <button
            type="button"
            className={styles.secondaryAction}
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </section>
  );
}

export function SavedSyncBanner() {
  const state = useAccountSyncState();

  if (state.phase === "guest") {
    return (
      <aside className={styles.savedBanner}>
        <span aria-hidden="true">⌁</span>
        <div>
          <strong>Saved on this device</strong>
          <small>
            Connect an email to carry these picks to another phone.
          </small>
        </div>
        <Link href="/sign-in?next=/saved">
          Sync saves
        </Link>
      </aside>
    );
  }

  return (
    <aside
      className={`${styles.savedBanner} ${
        state.phase === "error"
          ? styles.bannerError
          : ""
      }`}
    >
      <span aria-hidden="true">
        {state.phase === "syncing" ? "↻" : "✓"}
      </span>
      <div>
        <strong>{phaseLabel(state)}</strong>
        <small>
          {state.phase === "error"
            ? "Local copies are safe. Tap retry when you are ready."
            : formatSyncTime(state.lastSyncedAt)}
        </small>
      </div>
      <button
        type="button"
        onClick={() => void runAccountSync()}
        disabled={state.phase === "syncing"}
      >
        {state.phase === "error" ? "Retry" : "Sync"}
      </button>
    </aside>
  );
}
