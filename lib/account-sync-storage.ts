"use client";

export const ACCOUNT_SYNC_REQUEST_EVENT =
  "venture:account-sync-request";

export const ACCOUNT_SYNC_STATUS_EVENT =
  "venture:account-sync-status";

export const ACCOUNT_AUTH_EVENT =
  "venture:account-auth-changed";

const ACCOUNT_SYNC_META_KEY =
  "venture:account-sync-meta:v1";

const ACCOUNT_SYNC_DELETIONS_KEY =
  "venture:account-sync-deletions:v1";

export type SyncDeletionKind =
  | "listing"
  | "outing"
  | "visit";

export type SyncDeletion = {
  kind: SyncDeletionKind;
  key: string;
  deletedAt: string;
};

export type StoredAccountSyncMeta = {
  userId: string | null;
  email: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
};

const emptyMeta: StoredAccountSyncMeta = {
  userId: null,
  email: null,
  lastSyncedAt: null,
  lastError: null
};

function notifySyncRequested() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new Event(
      ACCOUNT_SYNC_REQUEST_EVENT
    )
  );
}

function isSyncDeletion(
  value: unknown
): value is SyncDeletion {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const record = value as Record<
    string,
    unknown
  >;

  return (
    (
      record.kind === "listing" ||
      record.kind === "outing" ||
      record.kind === "visit"
    ) &&
    typeof record.key === "string" &&
    typeof record.deletedAt === "string"
  );
}

export function getSyncDeletions():
  SyncDeletion[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored =
      window.localStorage.getItem(
        ACCOUNT_SYNC_DELETIONS_KEY
      );

    if (!stored) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      isSyncDeletion
    );
  } catch {
    return [];
  }
}

export function writeSyncDeletions(
  deletions: SyncDeletion[]
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = deletions
    .filter(isSyncDeletion)
    .sort((first, second) =>
      second.deletedAt.localeCompare(
        first.deletedAt
      )
    )
    .slice(0, 300);

  const nextValue =
    JSON.stringify(normalized);

  if (
    window.localStorage.getItem(
      ACCOUNT_SYNC_DELETIONS_KEY
    ) === nextValue
  ) {
    return;
  }

  window.localStorage.setItem(
    ACCOUNT_SYNC_DELETIONS_KEY,
    nextValue
  );
}

export function queueSyncDeletion(
  kind: SyncDeletionKind,
  key: string
) {
  if (
    typeof window === "undefined" ||
    !key
  ) {
    return;
  }

  const remaining =
    getSyncDeletions().filter(
      (deletion) =>
        !(
          deletion.kind === kind &&
          deletion.key === key
        )
    );

  writeSyncDeletions([
    {
      kind,
      key,
      deletedAt: new Date().toISOString()
    },
    ...remaining
  ]);

  notifySyncRequested();
}

export function clearSyncDeletion(
  kind: SyncDeletionKind,
  key: string
) {
  if (
    typeof window === "undefined" ||
    !key
  ) {
    return;
  }

  const current = getSyncDeletions();
  const remaining = current.filter(
    (deletion) =>
      !(
        deletion.kind === kind &&
        deletion.key === key
      )
  );

  if (
    remaining.length ===
    current.length
  ) {
    return;
  }

  writeSyncDeletions(remaining);
  notifySyncRequested();
}

export function getStoredAccountSyncMeta():
  StoredAccountSyncMeta {
  if (typeof window === "undefined") {
    return emptyMeta;
  }

  try {
    const stored =
      window.localStorage.getItem(
        ACCOUNT_SYNC_META_KEY
      );

    if (!stored) {
      return emptyMeta;
    }

    const parsed = JSON.parse(stored) as
      Partial<StoredAccountSyncMeta>;

    return {
      userId:
        typeof parsed.userId === "string"
          ? parsed.userId
          : null,
      email:
        typeof parsed.email === "string"
          ? parsed.email
          : null,
      lastSyncedAt:
        typeof parsed.lastSyncedAt === "string"
          ? parsed.lastSyncedAt
          : null,
      lastError:
        typeof parsed.lastError === "string"
          ? parsed.lastError
          : null
    };
  } catch {
    return emptyMeta;
  }
}

export function writeStoredAccountSyncMeta(
  meta: StoredAccountSyncMeta
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ACCOUNT_SYNC_META_KEY,
    JSON.stringify(meta)
  );
}

export function clearStoredAccountSyncMeta() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    ACCOUNT_SYNC_META_KEY
  );
}
