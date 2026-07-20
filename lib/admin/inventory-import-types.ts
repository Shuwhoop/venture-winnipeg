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
};
