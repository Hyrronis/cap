import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNextPath } from "./safe-redirect.ts";

test("redirection interne uniquement", () => {
  assert.equal(safeNextPath("/objectifs?vue=atteints"), "/objectifs?vue=atteints");
  assert.equal(safeNextPath(null), "/");
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "evil", "/\u0000x", "\t//evil.example"]) {
    assert.equal(safeNextPath(bad), "/", bad);
  }
});
