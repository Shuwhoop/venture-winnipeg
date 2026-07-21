export type BetaReadinessStatus =
  | "blocked"
  | "attention"
  | "ready";

export type BetaReadinessCheck = {
  id: string;
  area: string;
  title: string;
  detail: string;
  status: BetaReadinessStatus;
  metric: string;
  source: "automatic";
  href?: string;
  actionLabel?: string;
};

export type BetaReadinessReport = {
  generatedAt: string;
  launchStatus: BetaReadinessStatus;
  summary: {
    blocked: number;
    attention: number;
    ready: number;
  };
  targets: {
    trustedPlaces: number;
    futureEvents: number;
    outingEligible: number;
    maxMissingNeighbourhoods: number;
  };
  automaticChecks: BetaReadinessCheck[];
};
