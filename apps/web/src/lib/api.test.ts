import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "./api";

describe("apiRequest", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds credentials and JSON headers when sending request bodies", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      }),
    );

    await expect(
      apiRequest<{ ok: boolean }>("/api/test", {
        body: JSON.stringify({ hello: "world" }),
        method: "POST",
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        body: "{\"hello\":\"world\"}",
        credentials: "include",
        method: "POST",
      }),
    );

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.headers).toBeInstanceOf(Headers);
    expect((init?.headers as Headers).get("Accept")).toBe("application/json");
    expect((init?.headers as Headers).get("Content-Type")).toBe("application/json");
  });

  it("throws ApiError with the server-provided message for JSON failures", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "Forbidden" }), {
        headers: {
          "content-type": "application/json",
        },
        status: 403,
      }),
    );

    await expect(apiRequest("/api/test")).rejects.toMatchObject<ApiError>({
      message: "Forbidden",
      name: "ApiError",
      status: 403,
    });
  });

  it("returns undefined for empty responses", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    );

    await expect(apiRequest("/api/test")).resolves.toBeUndefined();
  });
});
