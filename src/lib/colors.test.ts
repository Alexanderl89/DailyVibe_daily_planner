import { describe, expect, it } from "vitest";
import { PROJECT_COLORS, nextFreeColor } from "./colors";

describe("nextFreeColor", () => {
  it("skips colors already in use, even after a project was deleted", () => {
    // Default projects use chart-2 and chart-1; a third project took chart-3 and was then deleted.
    expect(nextFreeColor(["var(--chart-2)", "var(--chart-1)"])).toBe("var(--chart-3)");
    expect(nextFreeColor(["var(--chart-1)", "var(--chart-3)"])).toBe("var(--chart-2)");
  });

  it("falls back to the least-used color when every color is taken", () => {
    const used = [...PROJECT_COLORS, ...PROJECT_COLORS.filter(c => c !== "var(--chart-4)")];
    expect(nextFreeColor(used)).toBe("var(--chart-4)");
  });
});
