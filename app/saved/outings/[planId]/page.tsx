"use client";

import {
  useCallback,
  useEffect,
  useState
} from "react";

import Link from "next/link";

import {
  useParams,
  useRouter
} from "next/navigation";

import {
  OutingDetailExperience
} from "@/components/outing-detail-experience";

import {
  ACCOUNT_SYNC_STATUS_EVENT
} from "@/lib/account-sync-storage";

import {
  getSavedOutings,
  removeSavedOuting,
  SAVED_OUTINGS_EVENT,
  type GeneratedOutingPlan
} from "@/lib/saved-outings";

type PageStatus =
  | "loading"
  | "ready"
  | "missing";

export default function SavedOutingPage() {
  const params = useParams();
  const router = useRouter();

  const planId =
    typeof params.planId === "string"
      ? params.planId
      : "";

  const [status, setStatus] =
    useState<PageStatus>("loading");
  const [plan, setPlan] =
    useState<GeneratedOutingPlan | null>(
      null
    );

  const loadPlan = useCallback(() => {
    if (!planId) {
      setPlan(null);
      setStatus("missing");
      return false;
    }

    const savedPlan =
      getSavedOutings().find(
        (outing) =>
          outing.planId === planId
      );

    if (!savedPlan) {
      return false;
    }

    setPlan(savedPlan);
    setStatus("ready");
    return true;
  }, [planId]);

  useEffect(() => {
    if (loadPlan()) {
      return;
    }

    const onPossibleSync = () => {
      void loadPlan();
    };

    window.addEventListener(
      SAVED_OUTINGS_EVENT,
      onPossibleSync
    );
    window.addEventListener(
      ACCOUNT_SYNC_STATUS_EVENT,
      onPossibleSync
    );

    const fallback = window.setTimeout(
      () => {
        if (!loadPlan()) {
          setStatus("missing");
        }
      },
      4500
    );

    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener(
        SAVED_OUTINGS_EVENT,
        onPossibleSync
      );
      window.removeEventListener(
        ACCOUNT_SYNC_STATUS_EVENT,
        onPossibleSync
      );
    };
  }, [loadPlan]);

  function handleRemove() {
    if (!plan) {
      return;
    }

    removeSavedOuting(plan.planId);
    router.push("/saved");
  }

  if (status === "loading") {
    return (
      <section className="empty-state">
        <div>✨</div>
        <h1>Opening your outing</h1>
        <p>
          Checking this device and your Venture account for the route.
        </p>
      </section>
    );
  }

  if (
    status === "missing" ||
    !plan
  ) {
    return (
      <section className="empty-state">
        <div>?</div>
        <h1>Saved outing not found</h1>
        <p>
          It may have been removed, or this device may still need to reconnect
          and sync.
        </p>
        <Link href="/saved">
          Return to Saved
        </Link>
      </section>
    );
  }

  return (
    <OutingDetailExperience
      plan={plan}
      eyebrow="SAVED VENTURE ROUTE"
      intro="Your route is back, map and all. Check the order, timing, and each stop before heading out."
      backHref="/saved"
      backLabel="Back to Saved"
      actions={
        <>
          <Link href="/build-outing">
            Build another outing
          </Link>
          <button
            type="button"
            onClick={handleRemove}
          >
            Remove saved outing
          </button>
        </>
      }
    />
  );
}
