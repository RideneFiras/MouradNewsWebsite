/** Tiny trend line for a number tile (no axes, no hover: the tile's number is the reading). */
export function Sparkline({ values, rtl, width = 120, height = 28 }: { values: number[]; rtl: boolean; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => {
    const xl = 1 + (i * (width - 2)) / (values.length - 1);
    return `${(rtl ? width - xl : xl).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`;
  });
  return (
    <svg width={width} height={height} aria-hidden className="block">
      <polyline points={pts.join(' ')} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
