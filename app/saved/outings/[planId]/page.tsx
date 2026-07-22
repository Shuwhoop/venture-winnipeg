"use client";

import {
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
  getSavedOutings,
  removeSavedOuting,
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
    typeof params.planId ===
    "string"
      ? params.planId
      : "";

  const [
    status,
    setStatus
  ] =
    useState<PageStatus>(
      "loading"
    );

  const [
    plan,
    setPlan
  ] =
    useState<GeneratedOutingPlan | null>(
      null
    );

  useEffect(() => {
    if (!planId) {
      setStatus("missing");
      return;
    }

    const savedPlan =
      getSavedOutings().find(
        (outing) =>
          outing.planId === planId
      );

    if (!savedPlan) {
      setPlan(null);
      setStatus("missing");
      return;
    }

    setPlan(savedPlan);
    setStatus("ready");
  }, [planId]);

  function handleRemove() {
    if (!plan) {
      return;
    }

    removeSavedOuting(
      plan.planId
    );

    router.push("/saved");
  }

  if (status === "loading") {
    return (
      <section className="empty-state">
        <div>✨</div>

        <h1>
          Opening your outing
        </h1>

        <p>
          Pulling your saved route back onto the map.
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

        <h1>
          Saved outing not found
        </h1>

        <p>
          It may have been removed or saved in a different browser.
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
