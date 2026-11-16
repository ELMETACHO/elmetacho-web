import { test } from "node:test";
import assert from "node:assert/strict";
import { hace } from "./hace.js";

test("hace: segundos, minutos, horas y días; nunca negativo", () => {
  assert.equal(hace(-500), "hace 0 s");
  assert.equal(hace(3200), "hace 3 s");
  assert.equal(hace(59_000), "hace 59 s");
  assert.equal(hace(60_000), "hace 1 min");
  assert.equal(hace(59 * 60_000 + 59_000), "hace 59 min");
  assert.equal(hace(3 * 3600_000), "hace 3 h");
  assert.equal(hace(50 * 3600_000), "hace 2 días");
});
