import { beforeEach, describe, expect, it, vi } from "vitest";

type Token = { access_token: string; expiry_date?: number };

const authorizeMock = vi.fn<[], Promise<Token>>();
const jwtConstructorMock = vi.fn();

vi.mock("google-auth-library", () => {
  class JWT {
    constructor(options: unknown) {
      jwtConstructorMock(options);
    }

    authorize() {
      return authorizeMock();
    }
  }

  return { JWT };
});

describe("getAccessToken cache", () => {
  beforeEach(() => {
    vi.resetModules();
    authorizeMock.mockReset();
    jwtConstructorMock.mockReset();
    process.env.SA_EMAIL = "service@example.com";
    process.env.SA_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----";
  });

  it("reuses JWT client and cached token while valid", async () => {
    authorizeMock.mockResolvedValue({
      access_token: "token-1",
      expiry_date: Date.now() + 60 * 60 * 1000,
    });

    const { getAccessToken } = await import("../../server/services/google-ads");

    const first = await getAccessToken();
    const second = await getAccessToken();

    expect(first.access_token).toBe("token-1");
    expect(second.access_token).toBe("token-1");
    expect(authorizeMock).toHaveBeenCalledTimes(1);
    expect(jwtConstructorMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes token when near expiry", async () => {
    authorizeMock
      .mockResolvedValueOnce({
        access_token: "token-1",
        expiry_date: Date.now() + 2 * 60 * 1000,
      })
      .mockResolvedValueOnce({
        access_token: "token-2",
        expiry_date: Date.now() + 60 * 60 * 1000,
      });

    const { getAccessToken } = await import("../../server/services/google-ads");

    const first = await getAccessToken();
    const second = await getAccessToken();

    expect(first.access_token).toBe("token-1");
    expect(second.access_token).toBe("token-2");
    expect(authorizeMock).toHaveBeenCalledTimes(2);
  });
});
