import {
  validateNewsletterDraft
} from "@/lib/newsletter/campaign-template";

import {
  type VentureNewsletterDraft
} from "@/lib/newsletter/campaign-draft";


const FIELD_NAMES:
  Array<keyof VentureNewsletterDraft> = [
    "issueLabel",
    "subject",
    "preheader",
    "intro",
    "venturePickTitle",
    "venturePickBody",
    "venturePickUrl",
    "weekendTitle",
    "weekendBody",
    "weekendUrl",
    "budgetTitle",
    "budgetBody",
    "budgetUrl",
    "closingNote"
  ];


export function parseVentureNewsletterDraft(
  value: unknown
): {
  draft: VentureNewsletterDraft | null;
  errors: string[];
} {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return {
      draft:
        null,
      errors: [
        "Newsletter content is required."
      ]
    };
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  const draft =
    {} as VentureNewsletterDraft;

  for (
    const field of
    FIELD_NAMES
  ) {
    const raw =
      record[field];

    draft[field] =
      typeof raw ===
        "string"
        ? raw
            .trim()
            .slice(
              0,
              field.endsWith(
                "Url"
              )
                ? 500
                : 3000
            )
        : "";
  }

  const errors =
    validateNewsletterDraft(
      draft
    );

  return {
    draft:
      errors.length === 0
        ? draft
        : null,
    errors
  };
}
