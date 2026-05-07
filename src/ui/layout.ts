export const MAX_LOGO_ROWS = 16;
export const MAX_TEXT_ROWS = 10;
export const MIN_TEXT_ROWS = 6;
export const VIEWPORT_SAFETY_ROWS = 1;

export interface BrandLayout {
  readonly logoRows: number;
  readonly textRows: number;
  readonly showTagline: boolean;
  readonly showTopPadding: boolean;
  readonly showBottomPadding: boolean;
}

export function countBrandLines(layout: BrandLayout): number {
  return (
    layout.logoRows +
    layout.textRows +
    (layout.showTagline ? 1 : 0) +
    (layout.showTopPadding ? 1 : 0) +
    (layout.showBottomPadding ? 1 : 0)
  );
}

export function computeBrandLayout(totalRows: number, childrenLines: number): BrandLayout {
  const safeTotalRows = Math.max(0, Math.floor(totalRows));
  const safeChildrenLines = Math.max(0, Math.floor(childrenLines));
  let remainingRows = Math.max(0, safeTotalRows - safeChildrenLines - VIEWPORT_SAFETY_ROWS);

  let textRows = 0;
  if (remainingRows >= MIN_TEXT_ROWS) {
    textRows = Math.min(MAX_TEXT_ROWS, remainingRows);
    remainingRows -= textRows;
  }

  if (textRows === 0) {
    return {
      logoRows: 0,
      textRows: 0,
      showTagline: false,
      showTopPadding: false,
      showBottomPadding: false,
    };
  }

  const showTagline = textRows === MAX_TEXT_ROWS && remainingRows > 0;
  if (showTagline) {
    remainingRows -= 1;
  }

  const logoRows = remainingRows > 0 ? Math.min(MAX_LOGO_ROWS, remainingRows) : 0;
  remainingRows -= logoRows;

  const showBottomPadding = logoRows > 0 && remainingRows > 0;
  if (showBottomPadding) {
    remainingRows -= 1;
  }

  const showTopPadding = logoRows > 0 && remainingRows > 0;

  return {
    logoRows,
    textRows,
    showTagline,
    showTopPadding,
    showBottomPadding,
  };
}
