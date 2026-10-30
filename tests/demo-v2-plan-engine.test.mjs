import test from "node:test";
import assert from "node:assert/strict";
import { buildPlan, buildAdjustment } from "../demo-v2/plan-engine.js";

test("buildPlan returns an explainable three-day itinerary", () => {
  const plan = buildPlan({ start: "成都", end: "乐山", days: 3, totalDistance: 246, intensity: "standard" });
  assert.equal(plan.itinerary.length, 3);
  assert.equal(plan.averageDistance, 82);
  assert.ok(plan.itinerary.every((day) => day.reason.length > 0));
  assert.ok(plan.itinerary.some((day) => day.supplyGapKm >= 31));
});

test("fatigue adjustment moves Day 2 endpoint without mutating the plan", () => {
  const plan = buildPlan({ start: "成都", end: "乐山", days: 3, totalDistance: 246, intensity: "standard" });
  const original = structuredClone(plan);
  const suggestion = buildAdjustment(plan, { reason: "fatigue", progressKm: 46, fatigue: "high" });
  assert.equal(suggestion.nextEndpoint, "丹棱");
  assert.equal(suggestion.before.day2Distance, 88);
  assert.equal(suggestion.after.day2Distance, 76);
  assert.deepEqual(plan, original);
});

test("invalid inputs are normalized", () => {
  const plan = buildPlan({ start: "", end: "", days: 1, totalDistance: 0, intensity: "unknown" });
  assert.equal(plan.query.start, "成都");
  assert.equal(plan.query.end, "乐山");
  assert.equal(plan.query.days, 2);
  assert.equal(plan.query.intensity, "standard");
});

test("each adjustment reason returns an actionable explanation", () => {
  const plan = buildPlan({ start: "成都", end: "乐山", days: 3, totalDistance: 246, intensity: "standard" });
  for (const reason of ["fatigue", "weather", "time", "progress"]) {
    const suggestion = buildAdjustment(plan, { reason, progressKm: 46, fatigue: "medium" });
    assert.ok(suggestion.explanation.length >= 10);
    assert.equal(suggestion.revisedItinerary.length, 3);
  }
});
