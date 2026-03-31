import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { graphPageAll, withRetry } from "../graph-helpers.js";

// ---------------------------------------------------------------------------
// Shared fake Client type for testing graphPageAll
// ---------------------------------------------------------------------------

type FakeApiHandler = {
  get: () => Promise<unknown>;
};

function makeFakeClient(pages: unknown[]): { api: (path: string) => FakeApiHandler } {
  let callCount = 0;
  return {
    api: (_path: string) => ({
      get: async () => {
        const page = pages[callCount++];
        if (page === undefined) throw new Error("No more pages");
        return page;
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// graphPageAll tests
// ---------------------------------------------------------------------------

describe("graphPageAll", () => {
  it("collects items from a single page (no nextLink) into flat array", async () => {
    const client = makeFakeClient([
      { value: [{ id: "a" }, { id: "b" }] },
    ]);
    const result = await graphPageAll<{ id: string }>(client as never, "/deviceManagement/managedDevices");
    assert.deepEqual(result, [{ id: "a" }, { id: "b" }]);
  });

  it("follows @odata.nextLink through 3 pages, returning all items concatenated", async () => {
    const client = makeFakeClient([
      { value: [{ id: "1" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/next1" },
      { value: [{ id: "2" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/next2" },
      { value: [{ id: "3" }] },
    ]);
    const result = await graphPageAll<{ id: string }>(client as never, "/deviceManagement/managedDevices");
    assert.deepEqual(result, [{ id: "1" }, { id: "2" }, { id: "3" }]);
  });

  it("returns empty array when response.value is empty", async () => {
    const client = makeFakeClient([{ value: [] }]);
    const result = await graphPageAll<{ id: string }>(client as never, "/any");
    assert.deepEqual(result, []);
  });
});

// ---------------------------------------------------------------------------
// withRetry tests — using real setTimeout with fast delays to avoid long waits
// ---------------------------------------------------------------------------

describe("withRetry", () => {
  it("returns result on first success without retrying", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return "done";
    };
    const result = await withRetry(fn);
    assert.equal(result, "done");
    assert.equal(callCount, 1);
  });

  it("retries on 429 with Retry-After header, respecting the delay", async () => {
    let callCount = 0;
    const error429 = Object.assign(new Error("Too many requests"), {
      statusCode: 429,
      responseHeaders: { "retry-after": "0" }, // 0 seconds for test speed
    });
    const fn = async () => {
      callCount++;
      if (callCount === 1) throw error429;
      return "success";
    };
    const result = await withRetry(fn);
    assert.equal(result, "success");
    assert.equal(callCount, 2);
  });

  it("retries on 429 without Retry-After using exponential backoff", async () => {
    let callCount = 0;
    // We'll use a testable version of withRetry with 0ms delays to keep tests fast
    const fn = async () => {
      callCount++;
      if (callCount <= 2) {
        throw Object.assign(new Error("Too many requests"), { statusCode: 429 });
      }
      return "backoff-success";
    };
    // Patch sleep to be instant for this test using the exported withRetry's sleep parameter
    const result = await withRetry(fn, 3, 0);
    assert.equal(result, "backoff-success");
    assert.equal(callCount, 3);
  });

  it("throws after maxRetries exceeded on repeated 429", async () => {
    let callCount = 0;
    const error429 = Object.assign(new Error("Too many requests"), { statusCode: 429 });
    const fn = async () => {
      callCount++;
      throw error429;
    };
    await assert.rejects(
      () => withRetry(fn, 3, 0),
      (err: Error & { statusCode?: number }) => {
        assert.equal(err.statusCode, 429);
        return true;
      }
    );
    assert.equal(callCount, 4); // initial + 3 retries
  });

  it("throws immediately on non-429 errors (e.g. 401)", async () => {
    let callCount = 0;
    const error401 = Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    const fn = async () => {
      callCount++;
      throw error401;
    };
    await assert.rejects(
      () => withRetry(fn),
      (err: Error & { statusCode?: number }) => {
        assert.equal(err.statusCode, 401);
        return true;
      }
    );
    assert.equal(callCount, 1);
  });

  it("throws immediately on non-429 errors (e.g. 500)", async () => {
    let callCount = 0;
    const error500 = Object.assign(new Error("Server Error"), { statusCode: 500 });
    const fn = async () => {
      callCount++;
      throw error500;
    };
    await assert.rejects(
      () => withRetry(fn),
      (err: Error & { statusCode?: number }) => {
        assert.equal(err.statusCode, 500);
        return true;
      }
    );
    assert.equal(callCount, 1);
  });
});
