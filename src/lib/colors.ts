// Project color palette; values are CSS variables defined in src/styles.css.
export const PROJECT_COLORS = Array.from({ length: 10 }, (_, i) => `var(--chart-${i + 1})`);

/** Returns the first palette color no project uses yet, or the least-used one if all are taken. */
export function nextFreeColor(used: string[]): string {
  const count = (c: string) => used.filter(u => u === c).length;
  return PROJECT_COLORS.reduce((best, c) => (count(c) < count(best) ? c : best), PROJECT_COLORS[0]!);
}
