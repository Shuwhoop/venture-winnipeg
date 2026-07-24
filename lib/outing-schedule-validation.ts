import type {
  GeneratedOutingPlan,
  GeneratedOutingStop
} from "@/lib/saved-outings";

const WINNIPEG_TIMEZONE = "America/Winnipeg";
const SCHEDULE_REPAIR_WARNING =
  "Venture adjusted the route timing after your edits. Confirm live event times and venue hours before leaving.";

const weekdayOrder = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
] as const;

export type OutingScheduleIssue = {
  id: string;
  severity: "warning" | "critical";
  title: string;
  message: string;
  stopOrder?: number;
};

function parseClock(value: string): number | null {
  const trimmed = value.trim();
  const twentyFourHour = trimmed.match(/^(\d{1,2}):(\d{2})$/);

  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1]);
    const minute = Number(twentyFourHour[2]);

    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return hour * 60 + minute;
    }
  }

  const twelveHour = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/i);

  if (!twelveHour) {
    return null;
  }

  let hour = Number(twelveHour[1]);
  const minute = Number(twelveHour[2] ?? "0");
  const period = twelveHour[3].toLowerCase();

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return null;
  }

  if (hour === 12) {
    hour = 0;
  }

  if (period === "pm") {
    hour += 12;
  }

  return hour * 60 + minute;
}

function formatClock(value: number): string {
  const minutesInDay = 24 * 60;
  const normalized = ((value % minutesInDay) + minutesInDay) % minutesInDay;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeAfter(value: number, floor: number): number {
  let normalized = value;

  while (normalized < floor - 12 * 60) {
    normalized += 24 * 60;
  }

  while (normalized + 24 * 60 <= floor + 12 * 60) {
    normalized += 24 * 60;
  }

  return normalized;
}

function getDurationMinutes(value: string): number {
  const match = value.match(/\d+/);
  const hours = match ? Number(match[0]) : 3;

  if (!Number.isFinite(hours)) {
    return 180;
  }

  return Math.min(6, Math.max(2, hours)) * 60;
}

function getWinnipegEventMinutes(
  isoValue: string | undefined,
  planDate: string
): number | null {
  if (!isoValue) {
    return null;
  }

  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: WINNIPEG_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );
  const dateKey = `${values.year}-${values.month}-${values.day}`;

  if (dateKey !== planDate) {
    return null;
  }

  const hour = Number(values.hour);
  const minute = Number(values.minute);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function getStopTimeline(
  stops: GeneratedOutingStop[],
  requestedStartTime: string
): Array<{
  stop: GeneratedOutingStop;
  start: number;
  end: number;
}> {
  const requestedStart = parseClock(requestedStartTime) ?? 18 * 60;
  let floor = requestedStart;

  return stops.map((stop) => {
    const parsedStart = parseClock(stop.startTime) ?? floor;
    const start = normalizeAfter(parsedStart, floor);
    const parsedEnd = parseClock(stop.endTime) ??
      ((start + Math.max(15, stop.durationMinutes)) % (24 * 60));
    let end = normalizeAfter(parsedEnd, start);

    if (end <= start) {
      end += 24 * 60;
    }

    floor = end;

    return { stop, start, end };
  });
}

function normalizeWeeklyHours(
  value: unknown
): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return null;
}

function parseHoursValue(
  value: unknown
): {
  recognized: boolean;
  intervals: Array<{
    open: number;
    close: number;
  }>;
} {
  if (Array.isArray(value)) {
    const parsed = value.map(parseHoursValue);

    return {
      recognized:
        parsed.length === 0 ||
        parsed.some((item) => item.recognized),
      intervals: parsed.flatMap((item) => item.intervals)
    };
  }

  if (!value || typeof value !== "object") {
    return {
      recognized: false,
      intervals: []
    };
  }

  const record = value as Record<string, unknown>;

  if (record.closed === true) {
    return {
      recognized: true,
      intervals: []
    };
  }

  if (
    typeof record.open !== "string" ||
    typeof record.close !== "string"
  ) {
    return {
      recognized: false,
      intervals: []
    };
  }

  const open = parseClock(record.open);
  const close = record.close === "24:00"
    ? 24 * 60
    : parseClock(record.close);

  if (open === null || close === null) {
    return {
      recognized: false,
      intervals: []
    };
  }

  return {
    recognized: true,
    intervals: [{ open, close }]
  };
}

function getWeekday(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));

  return weekdayOrder[date.getUTCDay()];
}

function getPreviousWeekday(weekday: string): string {
  const index = weekdayOrder.indexOf(
    weekday as (typeof weekdayOrder)[number]
  );

  return weekdayOrder[(index - 1 + 7) % 7];
}

function getPlaceAvailability(
  value: unknown,
  dateKey: string
): {
  recognized: boolean;
  intervals: TimeInterval[];
} {
  const weeklyHours = normalizeWeeklyHours(value);

  if (!weeklyHours) {
    return {
      recognized: false,
      intervals: []
    };
  }

  const weekday = getWeekday(dateKey);
  const previousWeekday = getPreviousWeekday(weekday);
  const currentDay = parseHoursValue(weeklyHours[weekday]);
  const previousDay = parseHoursValue(weeklyHours[previousWeekday]);
  const intervals: TimeInterval[] = [];

  for (const interval of currentDay.intervals) {
    intervals.push({
      start: interval.open,
      end:
        interval.close > interval.open
          ? interval.close
          : interval.close + 24 * 60
    });
  }

  for (const interval of previousDay.intervals) {
    if (interval.close <= interval.open) {
      intervals.push({
        start: interval.open - 24 * 60,
        end: interval.close
      });
    }
  }

  return {
    recognized: currentDay.recognized || previousDay.recognized,
    intervals
  };
}

function formatDisplayClock(value: number): string {
  const normalized = ((value % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

type TimeInterval = {
  start: number;
  end: number;
};

function formatMinuteDifference(value: number): string {
  const absolute = Math.abs(Math.round(value));

  if (absolute < 60) {
    return `${absolute} min`;
  }

  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;

  return minutes === 0
    ? `${hours} hr`
    : `${hours} hr ${minutes} min`;
}

export function validateOutingSchedule(
  plan: GeneratedOutingPlan
): OutingScheduleIssue[] {
  const timeline = getStopTimeline(
    [...plan.stops].sort((first, second) => first.order - second.order),
    plan.requestedStartTime
  );
  const issues: OutingScheduleIssue[] = [];
  const requestedStart = parseClock(plan.requestedStartTime) ?? 18 * 60;
  const requestedEnd = requestedStart + getDurationMinutes(plan.requestedDuration);
  const maxTravelMinutes = plan.maxTravelMinutes ?? 20;

  timeline.forEach((item, index) => {
    const { stop, start, end } = item;
    const travelMinutes = stop.travelFromPreviousMinutes ?? 0;

    if (index > 0) {
      const previous = timeline[index - 1];
      const earliestArrival = previous.end + travelMinutes;

      if (earliestArrival > start + 5) {
        issues.push({
          id: `late-arrival-${stop.order}`,
          severity: "critical",
          title: `Stop ${stop.order} starts too soon`,
          message: `The route reaches ${stop.listing.name} about ${formatMinuteDifference(
            earliestArrival - start
          )} after its planned start.`,
          stopOrder: stop.order
        });
      }
    }

    if (travelMinutes > maxTravelMinutes) {
      issues.push({
        id: `long-travel-${stop.order}`,
        severity: "warning",
        title: `Long trip before stop ${stop.order}`,
        message: `${travelMinutes} minutes of travel is above your ${maxTravelMinutes}-minute preference.`,
        stopOrder: stop.order
      });
    }

    if (stop.listing.type === "event") {
      const fixedStart = getWinnipegEventMinutes(
        stop.listing.startAt,
        plan.date
      );

      if (fixedStart !== null) {
        const normalizedFixedStart = normalizeAfter(fixedStart, start);
        const difference = start - normalizedFixedStart;

        if (Math.abs(difference) > 15) {
          issues.push({
            id: `event-start-${stop.order}`,
            severity: Math.abs(difference) > 30 ? "critical" : "warning",
            title: `${stop.listing.name} has a fixed start`,
            message:
              difference > 0
                ? `This route plans the event ${formatMinuteDifference(difference)} late.`
                : `This route arrives ${formatMinuteDifference(difference)} before the listed event start.`,
            stopOrder: stop.order
          });
        }
      }

      const fixedEnd = getWinnipegEventMinutes(
        stop.listing.endAt,
        plan.date
      );

      if (fixedEnd !== null) {
        const normalizedFixedEnd = normalizeAfter(fixedEnd, start);

        if (end > normalizedFixedEnd + 15) {
          issues.push({
            id: `event-end-${stop.order}`,
            severity: "warning",
            title: `${stop.listing.name} may end earlier`,
            message: `The itinerary keeps this stop going ${formatMinuteDifference(
              end - normalizedFixedEnd
            )} beyond the listed event end.`,
            stopOrder: stop.order
          });
        }
      }
    } else {
      const availability = getPlaceAvailability(
        stop.listing.weeklyHours,
        plan.date
      );

      if (availability.recognized) {
        const matchingInterval = availability.intervals.find(
          (interval) =>
            start >= interval.start &&
            end <= interval.end
        );

        if (!matchingInterval) {
          const arrivalInterval = availability.intervals.find(
            (interval) =>
              start >= interval.start &&
              start < interval.end
          );

          if (arrivalInterval) {
            issues.push({
              id: `place-closes-${stop.order}`,
              severity: "warning",
              title: `${stop.listing.name} may close before you finish`,
              message: `The current hours show a ${formatDisplayClock(
                arrivalInterval.end
              )} closing time, before this stop is scheduled to end.`,
              stopOrder: stop.order
            });
          } else {
            issues.push({
              id: `place-closed-${stop.order}`,
              severity: "critical",
              title: `${stop.listing.name} may be closed`,
              message: `The listed hours do not include your planned ${formatDisplayClock(
                start
              )} arrival.`,
              stopOrder: stop.order
            });
          }
        }
      }
    }
  });

  const finalEnd = timeline.at(-1)?.end;

  if (finalEnd !== undefined && finalEnd > requestedEnd + 15) {
    issues.push({
      id: "outing-runs-late",
      severity: "warning",
      title: "The outing runs longer than planned",
      message: `The edited route finishes about ${formatMinuteDifference(
        finalEnd - requestedEnd
      )} after your selected ${plan.requestedDuration} window.`
    });
  }

  return issues;
}

export function repairOutingSchedule(
  plan: GeneratedOutingPlan
): GeneratedOutingPlan {
  const orderedStops = [...plan.stops].sort(
    (first, second) => first.order - second.order
  );
  const requestedStart = parseClock(plan.requestedStartTime) ?? 18 * 60;
  let previousEnd = requestedStart;

  const repairedStops = orderedStops.map((stop, index) => {
    const travelMinutes = index === 0
      ? null
      : stop.travelFromPreviousMinutes ?? 0;
    const earliestStart = index === 0
      ? requestedStart
      : previousEnd + (travelMinutes ?? 0);
    const fixedStart = stop.listing.type === "event"
      ? getWinnipegEventMinutes(stop.listing.startAt, plan.date)
      : null;
    const normalizedFixedStart = fixedStart === null
      ? null
      : normalizeAfter(fixedStart, earliestStart);
    const start = normalizedFixedStart !== null && normalizedFixedStart >= earliestStart - 5
      ? normalizedFixedStart
      : earliestStart;
    const fixedEnd = stop.listing.type === "event"
      ? getWinnipegEventMinutes(stop.listing.endAt, plan.date)
      : null;
    const normalizedFixedEnd = fixedEnd === null
      ? null
      : normalizeAfter(fixedEnd, start);
    const fallbackDuration = Math.max(15, stop.durationMinutes || 60);
    const end = normalizedFixedEnd !== null && normalizedFixedEnd > start
      ? normalizedFixedEnd
      : start + fallbackDuration;

    previousEnd = end;

    return {
      ...stop,
      order: index + 1,
      startTime: formatClock(start),
      endTime: formatClock(end),
      durationMinutes: Math.max(15, end - start),
      travelFromPreviousMinutes: travelMinutes
    };
  });

  return {
    ...plan,
    generatedAt: new Date().toISOString(),
    actualStopCount: repairedStops.length,
    stops: repairedStops,
    warnings: Array.from(
      new Set([
        ...plan.warnings.filter(
          (warning) => warning !== SCHEDULE_REPAIR_WARNING
        ),
        SCHEDULE_REPAIR_WARNING
      ])
    )
  };
}
