import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards against a class being used in a component while its CSS no longer
 * exists. That failure is silent — the element simply renders with no styling —
 * and it is exactly how the rainbow lines disappeared: a stray edit removed the
 * rules while five components went on referencing them.
 */
const root = path.resolve(__dirname, "../..");
const css = fs.readFileSync(path.join(root, "src/index.css"), "utf8");

function usedIn(file: string): string[] {
  return fs.readFileSync(path.join(root, file), "utf8").match(/[a-z]+-[a-z-]+/g) ?? [];
}

describe("custom classes referenced by components exist in the stylesheet", () => {
  const custom = [
    "rainbow-edge",
    "rainbow-edge-top",
    "nav-underline",
    "rainbow-border",
    "glass-nav",
    "tech-grid",
    "form-glow",
    "no-scrollbar",
    "summer-light",
    "aurora-drift",
    "hero-float",
    "drop-in",
  ];

  it.each(custom)("%s is defined", (cls) => {
    expect(css).toContain(`.${cls}`);
  });

  it("keeps the shared keyframes the lines animate with", () => {
    expect(css).toContain("@keyframes rainbow-slide");
  });

  it("has no duplicated section header, which signals a botched edit", () => {
    const headers = css.match(/\/\* ─── [A-Za-z ]+ ─/g) ?? [];
    expect(new Set(headers).size).toBe(headers.length);
  });
});
