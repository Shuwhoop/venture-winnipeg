import test from "node:test";
import assert from "node:assert/strict";

const validators = await import(
  new URL("../lib/api/request-validation.ts", import.meta.url).href
);

const {
  validateGenerateOutingShape,
  validateOutingMutationShape,
  validateGroupActionShape,
  validateShareCode
} = validators;

function validGenerate() {
  return {
    planningMode: "group",
    buildMethod: "surprise",
    outingTypeId: "night-out",
    outingTypeTitle: "Night out",
    date: "2026-08-15",
    startTime: "19:00",
    duration: "4 hours",
    interests: ["Food", "Live music"],
    neighbourhoods: ["Downtown"],
    budget: "under-80",
    transportation: "transit",
    alcoholFree: false,
    totalStops: 3
  };
}

test("generate shape accepts a normal Venture request", () => {
  assert.deepEqual(validateGenerateOutingShape(validGenerate()), { ok: true });
});

test("generate shape rejects oversized free-text lists", () => {
  const request = validGenerate();
  request.interests = Array.from({ length: 51 }, (_, index) => `Interest ${index}`);
  assert.equal(validateGenerateOutingShape(request).ok, false);
});

test("generate shape rejects more than five stops", () => {
  const request = validGenerate();
  request.totalStops = 6;
  assert.equal(validateGenerateOutingShape(request).ok, false);
});

test("mutation shape rejects oversized itineraries", () => {
  const request = {
    draft: { transportation: "transit" },
    plan: { stops: Array.from({ length: 6 }, () => ({})) },
    stopOrder: 1
  };
  assert.equal(validateOutingMutationShape(request).ok, false);
});

test("group action accepts supported actions and rejects unknown actions", () => {
  assert.equal(validateGroupActionShape({ action: "join" }).ok, true);
  assert.equal(validateGroupActionShape({ action: "remix" }).ok, true);
  assert.equal(validateGroupActionShape({ action: "delete-everything" }).ok, false);
});

test("share codes are tightly bounded", () => {
  assert.equal(validateShareCode("abcdef123456"), true);
  assert.equal(validateShareCode("ABCDEF123456"), false);
  assert.equal(validateShareCode("abcdef1234567"), false);
});
