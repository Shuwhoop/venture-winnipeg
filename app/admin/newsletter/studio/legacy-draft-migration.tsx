"use client";

import { useEffect } from "react";

const STORAGE_KEY = "venture-newsletter-draft-v1";

export function LegacyNewsletterDraftMigration() {
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        return;
      }

      const draft = JSON.parse(stored) as Record<string, unknown>;
      let changed = false;

      const fill = (key: string, value: string) => {
        const current = draft[key];

        if (typeof current !== "string" || current.trim().length === 0) {
          draft[key] = value;
          changed = true;
        }
      };

      fill("budgetTitle", "Lowkey and free finds");
      fill(
        "budgetBody",
        "Free events, smaller rooms, neighbourhood happenings, niche ideas, and the kind of Winnipeg thing people usually hear about after it is over."
      );
      fill("budgetUrl", "/explore?price=cheap");

      if (changed) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      }
    } catch {
      // A broken legacy browser draft should never block the saved editorial issue.
    }
  }, []);

  return null;
}
