import assert from "node:assert/strict";
import { test } from "node:test";
import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const picomatchPath = require.resolve("picomatch");

test("single-branch repeated extglobs do not block the event loop", async () => {
  const worker = new Worker(
    `
      const { parentPort } = require("node:worker_threads");
      const picomatch = require(${JSON.stringify(picomatchPath)});
      parentPort.postMessage(picomatch("+(*a)")("a".repeat(32) + "b"));
    `,
    { eval: true }
  );

  try {
    const matches = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Picomatch blocked while processing a repeated extglob")),
        2000
      );
      worker.once("message", (result) => {
        clearTimeout(timeout);
        resolve(result);
      });
      worker.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    assert.equal(matches, false);
  } finally {
    await worker.terminate();
  }
});

