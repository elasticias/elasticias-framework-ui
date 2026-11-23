/** Emitted when the user picks a product (with its active variant) from the menu. */
export interface ProductTypeaheadSelection {
  product: Record<string, unknown>;
  variant: Record<string, unknown> | null;
  unitPrice: number;
}

/** A run of result-label text, flagged when it matches the current query. */
export interface HighlightSegment {
  text: string;
  mark: boolean;
}

/** Internal view-model for one result row. */
export interface ProductTypeaheadRow {
  key: string;
  product: Record<string, unknown>;
  label: string;
  variants: Record<string, unknown>[];
  segments: HighlightSegment[];
  /**
   * What matched when the label did not: the shop title, a code, a size SKU or an original name, shown under the
   * label so the row says why it is there. Absent when the label itself matched.
   */
  hint?: HighlightSegment[];
  /** The size whose SKU matched, preselected in compact mode. */
  matchedVariant?: number;
}
