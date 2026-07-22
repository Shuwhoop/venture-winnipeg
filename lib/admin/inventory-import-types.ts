export type InventoryImportEntityType =
  | "place"
  | "event";

export type InventoryImportRowStatus =
  | "ready"
  | "warning"
  | "duplicate"
  | "error";

export type InventoryImportPreviewRow = {
  rowNumber: number;
  displayName: string;
  slug: string;
  status: InventoryImportRowStatus;
  messages: string[];
};

export type InventoryImportPreview = {
  entityType: InventoryImportEntityType;
  filename: string;
  generatedAt: string;
  totalRows: number;
  readyRows: number;
  warningRows: number;
  duplicateRows: number;
  errorRows: number;
  importableRows: number;
  rows: InventoryImportPreviewRow[];
};

export type InventoryImportCommitRow = {
  rowNumber: number;
  displayName: string;
  status: "imported" | "skipped" | "failed";
  entityType: InventoryImportEntityType;
  entityId: string | null;
  message: string;
};

export type InventoryImportCommitResult = {
  ok: true;
  batchId: string;
  entityType: InventoryImportEntityType;
  filename: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  failedRows: number;
  rows: InventoryImportCommitRow[];
  message: string;
  targetArea: string | null;
  importSource: string | null;
};

export type InventoryImportHistoryItem = {
  batchId: string;
  entityType: InventoryImportEntityType;
  filename: string;
  createdAt: string;
  adminEmail: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  failedRows: number;
  targetArea: string | null;
  importSource: string | null;
};

export const INVENTORY_IMPORT_TARGET_AREAS = [
  "Downtown",
  "Exchange District",
  "The Forks",
  "Osborne Village",
  "Corydon",
  "Wellington Crescent",
  "St. Boniface",
  "University of Manitoba / Fort Garry",
  "University of Winnipeg / West Broadway",
  "Bridgwater",
  "Multiple priority areas",
  "Other Winnipeg area"
] as const;

export type InventoryImportTargetArea =
  (typeof INVENTORY_IMPORT_TARGET_AREAS)[number];

export type ImportedInventoryRecord = {
  key: string;
  entityType: InventoryImportEntityType;
  id: string;
  name: string;
  address: string;
  neighbourhood: string | null;
  category: string;
  placeType: string | null;
  status: string;
  verificationStatus: string;
  importSource: string;
  targetArea: string | null;
  importedAt: string | null;
  batchId: string | null;
  editPath: string;
  publicPath: string;
};

export type ImportedInventoryFilters = {
  search?: string;
  entityType?: "all" | InventoryImportEntityType;
  targetArea?: string;
  status?: "all" | "draft" | "published";
  placeType?: string;
  importSource?: string;
  limit?: number;
};

export type ImportedInventoryResult = {
  records: ImportedInventoryRecord[];
  total: number;
  targetAreas: string[];
  placeTypes: string[];
  importSources: string[];
  appliedFilters: Required<
    Pick<ImportedInventoryFilters, "search" | "entityType" | "targetArea" | "status" | "placeType" | "importSource">
  >;
};
