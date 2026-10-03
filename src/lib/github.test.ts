import { describe, expect, it } from "vitest";
import { githubFileLink } from "./github";
import { REPOSITORY } from "./site";

describe("githubFileLink", () => {
  it("prefills a new file when it fits in the URL", () => {
    expect(githubFileLink("src/content/comps/set18/ahri.ts", "a b", false)).toEqual({
      url: `${REPOSITORY}/new/main/src/content/comps/set18?filename=ahri.ts&value=a%20b`,
      paste: false,
    });
  });

  it("falls back to pasting for long files and existing ones", () => {
    expect(githubFileLink("src/x/long.ts", "x".repeat(9000), false)).toEqual({
      url: `${REPOSITORY}/new/main/src/x?filename=long.ts`,
      paste: true,
    });
    expect(githubFileLink("src/content/tierlists/set18.ts", "x", true)).toEqual({
      url: `${REPOSITORY}/edit/main/src/content/tierlists/set18.ts`,
      paste: true,
    });
  });
});
