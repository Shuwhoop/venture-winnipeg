"use client";

export function PrintRunSheetButton() {
  return (
    <button
      type="button"
      onClick={() =>
        window.print()
      }
    >
      Print run sheet
    </button>
  );
}
