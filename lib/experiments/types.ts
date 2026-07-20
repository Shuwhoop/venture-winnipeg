export type ExperimentStatus =
  | "draft"
  | "running"
  | "paused"
  | "archived";

export type ExperimentVariant = {
  key: string;
  label: string;
  weight: number;
};

export type ExperimentAssignment = {
  enabled: boolean;
  experimentSlug: string;
  variant: string | null;
  variantLabel: string | null;
  assignmentVersion: number | null;
  reason:
    | "assigned"
    | "disabled"
    | "not-running"
    | "outside-schedule"
    | "not-in-traffic"
    | "not-found"
    | "migration-required"
    | "error";
};
