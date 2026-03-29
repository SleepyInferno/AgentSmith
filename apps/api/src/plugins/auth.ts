import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { ServerEnv } from "@agentsmith/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import * as oidc from "openid-client";

type SessionCookiePayload = {
  sessionId: string;
  userId: string;
  expiresAt: string;
};

type AuthFlowCookiePayload = {
  state: string;
  nonce: string;
  codeVerifier: string;
  initiatedAt: string;
  redirectPath: string | null;
};

export type OperatorSession = {
  sessionId: string;
  user: {
    id: string;
    email: string | null;
    displayName: string;
  };
  expiresAt: string;
};

export type AuthenticatedIdentity = {
  sourceId: string;
  email: string | null;
  displayName: string;
};

export type CompletedLogin = {
  session: OperatorSession;
  identity: AuthenticatedIdentity;
  redirectPath: string | null;
};

export interface AgentSmithAuthService {
  beginLogin(reply: FastifyReply, redirectPath?: string | null): Promise<void>;
  completeCallback(request: FastifyRequest, reply: FastifyReply): Promise<CompletedLogin>;
  getSession(request: FastifyRequest): Promise<OperatorSession | null>;
  clearSession(reply: FastifyReply): void;
}

export class AuthCallbackError extends Error {
  constructor(
    message: string,
    readonly targetId: string | null,
    readonly metadata: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AuthCallbackError";
  }
}

type AuthProvider = {
  buildAuthorizationUrl(flow: AuthFlowCookiePayload): Promise<URL>;
  exchangeCallback(currentUrl: URL, flow: AuthFlowCookiePayload): Promise<AuthenticatedIdentity>;
};

type CreateAuthServiceOptions = {
  env: ServerEnv;
  prisma: Pick<PrismaClient, "user">;
  provider?: AuthProvider;
  now?: () => Date;
};

const sessionCookieName = "agentsmith_session";
const authFlowCookieName = "agentsmith_auth_flow";
const flowLifetimeMs = 10 * 60 * 1000;
const sessionLifetimeMs = 8 * 60 * 60 * 1000;

export function createAuthService(options: CreateAuthServiceOptions): AgentSmithAuthService {
  const isDevBypass =
    process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";

  if (isDevBypass) {
    return createDevBypassAuthService(options.env);
  }

  const provider = options.provider ?? new MicrosoftEntraAuthProvider(options.env);
  const now = options.now ?? (() => new Date());

  return {
    async beginLogin(reply, redirectPath = null) {
      const flow: AuthFlowCookiePayload = {
        state: oidc.randomState(),
        nonce: oidc.randomNonce(),
        codeVerifier: oidc.randomPKCECodeVerifier(),
        initiatedAt: now().toISOString(),
        redirectPath,
      };
      const redirectUrl = await provider.buildAuthorizationUrl(flow);

      appendCookies(reply, [serializeCookie(authFlowCookieName, signValue(options.env.SESSION_SECRET, flow), {
        httpOnly: true,
        maxAge: Math.floor(flowLifetimeMs / 1000),
        path: "/",
        sameSite: "Lax",
        secure: isSecureCookie(),
      })]);

      reply.code(302).header("location", redirectUrl.href);
    },

    async completeCallback(request, reply) {
      const currentUrl = new URL(request.raw.url ?? request.url, options.env.ENTRA_REDIRECT_URI);
      const flow = readSignedCookie<AuthFlowCookiePayload>(options.env.SESSION_SECRET, request, authFlowCookieName);

      if (!flow) {
        appendCookies(reply, [clearCookie(authFlowCookieName)]);
        throw new AuthCallbackError("Missing or invalid auth flow cookie", currentUrl.searchParams.get("state"), {
          reason: "missing_auth_flow",
        });
      }

      const initiatedAt = new Date(flow.initiatedAt);
      if (Number.isNaN(initiatedAt.valueOf()) || now().valueOf() - initiatedAt.valueOf() > flowLifetimeMs) {
        appendCookies(reply, [clearCookie(authFlowCookieName)]);
        throw new AuthCallbackError("Expired auth flow cookie", currentUrl.searchParams.get("state") ?? flow.state, {
          reason: "expired_auth_flow",
          redirectPath: flow.redirectPath,
        });
      }

      const providerError = currentUrl.searchParams.get("error");
      if (providerError) {
        appendCookies(reply, [clearCookie(authFlowCookieName)]);
        throw new AuthCallbackError("Authorization server returned an error", currentUrl.searchParams.get("state") ?? flow.state, {
          reason: "provider_error",
          error: providerError,
          errorDescription: currentUrl.searchParams.get("error_description"),
          redirectPath: flow.redirectPath,
        });
      }

      let identity: AuthenticatedIdentity;

      try {
        identity = await provider.exchangeCallback(currentUrl, flow);
      } catch (error) {
        appendCookies(reply, [clearCookie(authFlowCookieName)]);
        throw new AuthCallbackError("Token exchange failed", currentUrl.searchParams.get("state") ?? flow.state, {
          reason: "token_exchange_failed",
          error: error instanceof Error ? error.message : "Unknown token exchange error",
          redirectPath: flow.redirectPath,
        });
      }

      const operator = await options.prisma.user.upsert({
        where: {
          sourceSystem_sourceId: {
            sourceSystem: "entra",
            sourceId: identity.sourceId,
          },
        },
        update: {
          displayName: identity.displayName,
          email: identity.email,
        },
        create: {
          sourceSystem: "entra",
          sourceId: identity.sourceId,
          displayName: identity.displayName,
          email: identity.email,
        },
      });

      const expiresAt = new Date(now().valueOf() + sessionLifetimeMs).toISOString();
      const sessionPayload: SessionCookiePayload = {
        sessionId: randomUUID(),
        userId: operator.id,
        expiresAt,
      };

      appendCookies(reply, [
        serializeCookie(sessionCookieName, signValue(options.env.SESSION_SECRET, sessionPayload), {
          httpOnly: true,
          maxAge: Math.floor(sessionLifetimeMs / 1000),
          path: "/",
          sameSite: "Lax",
          secure: isSecureCookie(),
        }),
        clearCookie(authFlowCookieName),
      ]);

      return {
        session: {
          sessionId: sessionPayload.sessionId,
          user: {
            id: operator.id,
            email: operator.email,
            displayName: operator.displayName,
          },
          expiresAt,
        },
        identity,
        redirectPath: flow.redirectPath,
      };
    },

    async getSession(request) {
      const payload = readSignedCookie<SessionCookiePayload>(options.env.SESSION_SECRET, request, sessionCookieName);
      if (!payload) {
        return null;
      }

      const expiresAt = new Date(payload.expiresAt);
      if (Number.isNaN(expiresAt.valueOf()) || expiresAt.valueOf() <= now().valueOf()) {
        return null;
      }

      const operator = await options.prisma.user.findUnique({
        where: {
          id: payload.userId,
        },
      });

      if (!operator) {
        return null;
      }

      return {
        sessionId: payload.sessionId,
        user: {
          id: operator.id,
          email: operator.email,
          displayName: operator.displayName,
        },
        expiresAt: payload.expiresAt,
      };
    },

    clearSession(reply) {
      appendCookies(reply, [clearCookie(sessionCookieName)]);
    },
  };
}

const devUser = {
  id: "dev-bypass-user",
  email: "dev@agentsmith.local",
  displayName: "Dev Operator",
};

function createDevBypassAuthService(env: Pick<ServerEnv, "SESSION_SECRET" | "WEB_ORIGIN">): AgentSmithAuthService {
  return {
    async beginLogin(reply, redirectPath = null) {
      const expiresAt = new Date(Date.now() + sessionLifetimeMs).toISOString();
      const payload: SessionCookiePayload = {
        sessionId: randomUUID(),
        userId: devUser.id,
        expiresAt,
      };
      appendCookies(reply, [
        serializeCookie(sessionCookieName, signValue(env.SESSION_SECRET, payload), {
          httpOnly: true,
          maxAge: Math.floor(sessionLifetimeMs / 1000),
          path: "/",
          sameSite: "Lax",
          secure: false,
        }),
      ]);
      reply.code(302).header("location", redirectPath ?? "/");
    },

    async completeCallback(_request, _reply) {
      throw new AuthCallbackError("completeCallback not available in dev bypass mode", null, {
        reason: "dev_bypass_active",
      });
    },

    async getSession(request) {
      const payload = readSignedCookie<SessionCookiePayload>(env.SESSION_SECRET, request, sessionCookieName);
      if (!payload) return null;

      const expiresAt = new Date(payload.expiresAt);
      if (Number.isNaN(expiresAt.valueOf()) || expiresAt.valueOf() <= Date.now()) return null;

      return {
        sessionId: payload.sessionId,
        user: devUser,
        expiresAt: payload.expiresAt,
      };
    },

    clearSession(reply) {
      appendCookies(reply, [clearCookie(sessionCookieName)]);
    },
  };
}

class MicrosoftEntraAuthProvider implements AuthProvider {
  private readonly issuer: URL;
  private configurationPromise: Promise<oidc.Configuration> | null = null;

  constructor(private readonly env: ServerEnv) {
    this.issuer = new URL(`https://login.microsoftonline.com/${this.env.ENTRA_TENANT_ID}/v2.0`);
  }

  async buildAuthorizationUrl(flow: AuthFlowCookiePayload) {
    const configuration = await this.getConfiguration();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(flow.codeVerifier);

    return oidc.buildAuthorizationUrl(configuration, {
      redirect_uri: this.env.ENTRA_REDIRECT_URI,
      scope: "openid profile email",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state: flow.state,
      nonce: flow.nonce,
    });
  }

  async exchangeCallback(currentUrl: URL, flow: AuthFlowCookiePayload) {
    const configuration = await this.getConfiguration();
    const tokens = await oidc.authorizationCodeGrant(configuration, currentUrl, {
      pkceCodeVerifier: flow.codeVerifier,
      expectedState: flow.state,
      expectedNonce: flow.nonce,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    const sourceId = readClaim(claims, "oid") ?? readClaim(claims, "sub");

    if (!sourceId) {
      throw new Error("Missing oid/sub claim in Entra ID token");
    }

    const email = readClaim(claims, "preferred_username") ?? readClaim(claims, "email");
    const displayName = readClaim(claims, "name") ?? email ?? sourceId;

    return {
      sourceId,
      email,
      displayName,
    };
  }

  private getConfiguration() {
    if (!this.configurationPromise) {
      this.configurationPromise = oidc.discovery(this.issuer, this.env.ENTRA_CLIENT_ID, this.env.ENTRA_CLIENT_SECRET);
    }

    return this.configurationPromise;
  }
}

function appendCookies(reply: FastifyReply, cookies: string[]) {
  const existing = reply.getHeader("set-cookie");
  const existingCookies = Array.isArray(existing)
    ? existing.map(String)
    : typeof existing === "string"
      ? [existing]
      : [];

  reply.header("set-cookie", [...existingCookies, ...cookies]);
}

function clearCookie(name: string) {
  return serializeCookie(name, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "Lax",
    secure: isSecureCookie(),
  });
}

function createSignature(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function parseCookies(request: FastifyRequest) {
  const header = request.headers.cookie;
  if (!header) {
    return new Map<string, string>();
  }

  return new Map(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...rest] = part.split("=");
        return [name, rest.join("=")] as const;
      }),
  );
}

function readClaim(claims: oidc.IDToken | undefined, key: string) {
  const value = claims?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readSignedCookie<T>(secret: string, request: FastifyRequest, name: string) {
  const cookieValue = parseCookies(request).get(name);
  if (!cookieValue) {
    return null;
  }

  const [encoded, signature] = cookieValue.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = createSignature(secret, encoded);
  if (!signaturesMatch(signature, expectedSignature)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function serializeCookie(
  name: string,
  value: string,
  options: {
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: "Lax" | "Strict" | "None";
    secure?: boolean;
  },
) {
  const parts = [`${name}=${value}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function signValue(secret: string, value: object) {
  const encoded = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${encoded}.${createSignature(secret, encoded)}`;
}

function isSecureCookie() {
  return process.env.NODE_ENV === "production";
}
