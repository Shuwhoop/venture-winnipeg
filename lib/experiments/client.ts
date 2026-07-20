"use client";

import {
  useEffect,
  useState
} from "react";

import {
  getBetaIdentity,
  trackBetaEvent
} from "@/lib/beta/client";
import type {
  ExperimentAssignment
} from "@/lib/experiments/types";

const DEFAULT_ASSIGNMENT:
  ExperimentAssignment = {
    enabled: false,
    experimentSlug: "",
    variant: null,
    variantLabel: null,
    assignmentVersion: null,
    reason: "disabled"
  };

function exposureKey(
  assignment: ExperimentAssignment,
  sessionId: string
): string {
  return [
    "venture:experiment-exposure:v1",
    sessionId,
    assignment.experimentSlug,
    assignment.assignmentVersion,
    assignment.variant
  ].join(":");
}

export function useExperimentAssignment(
  experimentSlug: string,
  active = true
): ExperimentAssignment & {
  loading: boolean;
} {
  const [
    assignment,
    setAssignment
  ] = useState<ExperimentAssignment>({
    ...DEFAULT_ASSIGNMENT,
    experimentSlug
  });

  const [
    loading,
    setLoading
  ] = useState(active);

  useEffect(() => {
    if (
      !active ||
      process.env
        .NEXT_PUBLIC_EXPERIMENTS_ENABLED ===
        "false"
    ) {
      setAssignment({
        ...DEFAULT_ASSIGNMENT,
        experimentSlug
      });
      setLoading(false);
      return;
    }

    const controller =
      new AbortController();

    const identity =
      getBetaIdentity();

    setLoading(true);

    void fetch(
      "/api/experiments/assignment",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          experimentSlug,
          visitorId:
            identity.visitorId
        }),
        signal:
          controller.signal
      }
    )
      .then(async (response) => {
        const result =
          await response
            .json() as ExperimentAssignment;

        if (!response.ok) {
          throw new Error(
            "Experiment assignment failed."
          );
        }

        setAssignment(result);

        if (
          result.enabled &&
          result.variant &&
          result.assignmentVersion
        ) {
          const key =
            exposureKey(
              result,
              identity.sessionId
            );

          if (
            window.sessionStorage
              .getItem(key) !== "true"
          ) {
            trackBetaEvent({
              eventName:
                "experiment_exposure",
              pagePath:
                window.location.pathname,
              properties: {
                experimentSlug:
                  result.experimentSlug,
                variant:
                  result.variant,
                assignmentVersion:
                  result.assignmentVersion
              }
            });

            window.sessionStorage
              .setItem(
                key,
                "true"
              );
          }
        }
      })
      .catch((error) => {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setAssignment({
          ...DEFAULT_ASSIGNMENT,
          experimentSlug,
          reason: "error"
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () =>
      controller.abort();
  }, [
    active,
    experimentSlug
  ]);

  return {
    ...assignment,
    loading
  };
}
