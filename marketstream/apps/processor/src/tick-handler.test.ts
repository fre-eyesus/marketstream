import assert from "node:assert/strict";
import test from "node:test";
import { createTickHandler } from "./tick-handler.js";

type Message = Parameters<ReturnType<typeof createTickHandler>>[0];
function message(value: string | null): Message {
  return { message: { value: value === null ? null : Buffer.from(value) } } as Message;
}
const tick = {
  type: "tick", symbol: "AAPL", price: 100, volume: 5,
  ts: "2026-11-11T10:00:00.000Z", source: "simulator",
};

test("passes a validated tick to processing", async () => {
  const received: unknown[] = [];
  const handler = createTickHandler(async (value) => { received.push(value); }, assert.fail);
  await handler(message(JSON.stringify(tick)));
  assert.deepEqual(received, [tick]);
});

test("skips malformed JSON, invalid ticks, and tombstones", async () => {
  const errors: Error[] = [];
  const handler = createTickHandler(async () => assert.fail("must not process invalid input"),
    (error) => errors.push(error));
  for (const value of ["{", JSON.stringify({ ...tick, price: -1 }), "null", null]) {
    await handler(message(value));
  }
  assert.equal(errors.length, 4);
});

test("propagates processing failures and allows redelivery", async () => {
  const failure = new Error("database unavailable");
  let attempts = 0;
  const handler = createTickHandler(async () => {
    if (++attempts === 1) throw failure;
  }, assert.fail);
  const payload = message(JSON.stringify(tick));
  await assert.rejects(handler(payload), (error) => error === failure);
  await handler(payload);
  assert.equal(attempts, 2);
});
