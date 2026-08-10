export type RequestShapeResult =
  | { ok: true }
  | { ok: false; error: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const SHARE_CODE_PATTERN = /^[a-f0-9]{12}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function boundedString(
  value: unknown,
  maxLength: number,
  { allowEmpty = false }: { allowEmpty?: boolean } = {}
): boolean {
  return (
    typeof value === "string" &&
    value.length <= maxLength &&
    (allowEmpty || value.trim().length > 0)
  );
}

function boundedStringArray(
  value: unknown,
  {
    maxItems,
    maxItemLength
  }: {
    maxItems: number;
    maxItemLength: number;
  }
): boolean {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => boundedString(item, maxItemLength, { allowEmpty: true }))
  );
}

function validPlanShape(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const stops = value.stops;

  return (
    Array.isArray(stops) &&
    stops.length >= 1 &&
    stops.length <= 5 &&
    stops.every((stop) => isRecord(stop))
  );
}

export function validateGenerateOutingShape(value: unknown): RequestShapeResult {
  if (!isRecord(value)) {
    return { ok: false, error: "The outing request must be a JSON object." };
  }

  const requiredStrings = [
    ["outingTypeId", 120],
    ["outingTypeTitle", 160],
    ["date", 20],
    ["startTime", 16],
    ["duration", 40],
    ["transportation", 80]
  ] as const;

  for (const [field, maxLength] of requiredStrings) {
    if (!boundedString(value[field], maxLength)) {
      return { ok: false, error: `The ${field} value is missing or too long.` };
    }
  }

  if (!DATE_PATTERN.test(String(value.date))) {
    return { ok: false, error: "The outing date format is invalid." };
  }

  if (!TIME_PATTERN.test(String(value.startTime))) {
    return { ok: false, error: "The outing start time format is invalid." };
  }

  if (!boundedStringArray(value.interests, { maxItems: 50, maxItemLength: 100 })) {
    return { ok: false, error: "The interests list is invalid or too large." };
  }

  if (!boundedStringArray(value.neighbourhoods, { maxItems: 150, maxItemLength: 120 })) {
    return { ok: false, error: "The neighbourhood list is invalid or too large." };
  }

  if (value.mustIncludeTerms !== undefined &&
      !boundedStringArray(value.mustIncludeTerms, { maxItems: 8, maxItemLength: 120 })) {
    return { ok: false, error: "Too many must-include terms were supplied." };
  }

  if (value.avoidTerms !== undefined &&
      !boundedStringArray(value.avoidTerms, { maxItems: 8, maxItemLength: 120 })) {
    return { ok: false, error: "Too many avoid terms were supplied." };
  }

  if (value.visitedListingKeys !== undefined &&
      !boundedStringArray(value.visitedListingKeys, { maxItems: 1000, maxItemLength: 160 })) {
    return { ok: false, error: "The visited-listings history is too large." };
  }

  if (value.visitedEventOccurrenceKeys !== undefined &&
      !boundedStringArray(value.visitedEventOccurrenceKeys, { maxItems: 1000, maxItemLength: 180 })) {
    return { ok: false, error: "The visited-events history is too large." };
  }

  if (value.partySize !== undefined && (!isFiniteNumber(value.partySize) || value.partySize < 1 || value.partySize > 50)) {
    return { ok: false, error: "The party size is outside the supported range." };
  }

  if (value.maxTravelMinutes !== undefined && (!isFiniteNumber(value.maxTravelMinutes) || value.maxTravelMinutes < 0 || value.maxTravelMinutes > 180)) {
    return { ok: false, error: "The travel-time limit is outside the supported range." };
  }

  if (value.totalStops !== undefined && (!isFiniteNumber(value.totalStops) || value.totalStops < 1 || value.totalStops > 5)) {
    return { ok: false, error: "An outing can contain up to five stops." };
  }

  if (value.allowedKinds !== undefined &&
      !boundedStringArray(value.allowedKinds, { maxItems: 3, maxItemLength: 24 })) {
    return { ok: false, error: "The requested stop kinds are invalid." };
  }

  return { ok: true };
}

export function validateOutingMutationShape(value: unknown): RequestShapeResult {
  if (!isRecord(value)) {
    return { ok: false, error: "The outing update must be a JSON object." };
  }

  if (!isRecord(value.draft)) {
    return { ok: false, error: "The outing draft is missing." };
  }

  if (!validPlanShape(value.plan)) {
    return { ok: false, error: "The outing plan is missing or has too many stops." };
  }

  if (value.stopOrder !== undefined &&
      (!isFiniteNumber(value.stopOrder) || value.stopOrder < 1 || value.stopOrder > 5)) {
    return { ok: false, error: "The selected stop is invalid." };
  }

  if (value.excludedListingKeys !== undefined &&
      !boundedStringArray(value.excludedListingKeys, { maxItems: 1000, maxItemLength: 160 })) {
    return { ok: false, error: "The excluded-listings history is too large." };
  }

  return { ok: true };
}

const GROUP_ACTIONS = new Set([
  "join",
  "leave",
  "rsvp",
  "vote",
  "contribute-vibe",
  "remove-vibe",
  "remix"
]);

export function validateGroupActionShape(value: unknown): RequestShapeResult {
  if (!isRecord(value) || !boundedString(value.action, 40)) {
    return { ok: false, error: "The group update is incomplete." };
  }

  if (!GROUP_ACTIONS.has(String(value.action))) {
    return { ok: false, error: "That group action is not supported." };
  }

  if (value.action === "vote") {
    if (!boundedString(value.stopKey, 160) || !boundedString(value.choice, 24)) {
      return { ok: false, error: "The stop vote is incomplete." };
    }
  }

  if (value.action === "rsvp" && !boundedString(value.rsvp, 24)) {
    return { ok: false, error: "The RSVP update is incomplete." };
  }

  return { ok: true };
}

export function validateShareCode(value: string): boolean {
  return SHARE_CODE_PATTERN.test(value);
}
