import type { Context } from "hono";
import type {
  OAuthContext,
  OAuthProtectedResourceMetadata,
  OAuthResourceServerOptions,
  OAuthTokenValidationResult,
} from "./types.js";

interface OAuthAuthorized {
  ok: true;
  context: OAuthContext;
}

interface OAuthDenied {
  ok: false;
  status: 401 | 403;
  error: string;
  errorDescription: string;
  wwwAuthenticate: string;
}

export type OAuthAuthorizationResult = OAuthAuthorized | OAuthDenied;

const OAUTH_CONTEXT_KEY = "oauth";

export function getOAuthContext(c: Context): OAuthContext | undefined {
  return c.get(OAUTH_CONTEXT_KEY);
}

export async function createOAuthProtectedResourceMetadata(
  options: OAuthResourceServerOptions,
  c: Context
): Promise<OAuthProtectedResourceMetadata> {
  const scopes = options.scopesSupported ?? options.requiredScopes;

  return {
    resource: await resolveResource(options, c),
    authorization_servers: resolveAuthorizationServers(options),
    bearer_methods_supported: ["header"],
    ...(scopes && scopes.length > 0 ? { scopes_supported: scopes } : {}),
    ...(options.serviceDocumentation
      ? { resource_documentation: options.serviceDocumentation }
      : {}),
  };
}

export async function authorizeOAuthRequest(
  options: OAuthResourceServerOptions,
  c: Context
): Promise<OAuthAuthorizationResult> {
  const token = extractBearerToken(c.req.header("Authorization"));
  const requiredScopes = options.requiredScopes ?? [];

  if (!token) {
    return deny(options, c, 401, "invalid_request", "Missing bearer token", requiredScopes);
  }

  const validated = await options.validateToken(token, c);
  if (!validated) {
    return deny(options, c, 401, "invalid_token", "Access token is invalid or expired", requiredScopes);
  }

  const context = createOAuthContext(token, validated);
  const resource = await resolveResource(options, c);

  if (!isAudienceAllowed(context.audience, resource)) {
    return deny(options, c, 401, "invalid_token", "Access token audience does not match this resource", requiredScopes);
  }

  const missingScopes = requiredScopes.filter((scope) => !context.scopes.includes(scope));
  if (missingScopes.length > 0) {
    return deny(options, c, 403, "insufficient_scope", "Access token does not include the required scope", requiredScopes);
  }

  c.set(OAUTH_CONTEXT_KEY, context);
  return { ok: true, context };
}

function createOAuthContext(
  token: string,
  validated: OAuthTokenValidationResult
): OAuthContext {
  return {
    token,
    subject: validated.subject,
    scopes: normalizeScopes(validated.scopes),
    audience: validated.audience,
    issuer: validated.issuer,
    claims: validated.claims ?? {},
  };
}

function normalizeScopes(scopes: string[] | string | undefined): string[] {
  if (!scopes) {
    return [];
  }

  if (Array.isArray(scopes)) {
    return scopes;
  }

  return scopes.split(/\s+/).filter(Boolean);
}

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

function isAudienceAllowed(audience: string | string[] | undefined, resource: string): boolean {
  if (!audience) {
    return true;
  }

  return Array.isArray(audience) ? audience.includes(resource) : audience === resource;
}

async function deny(
  options: OAuthResourceServerOptions,
  c: Context,
  status: 401 | 403,
  error: string,
  errorDescription: string,
  requiredScopes: string[]
): Promise<OAuthDenied> {
  return {
    ok: false,
    status,
    error,
    errorDescription,
    wwwAuthenticate: await createBearerChallenge(options, c, {
      error,
      errorDescription,
      scope: requiredScopes.length > 0 ? requiredScopes.join(" ") : undefined,
    }),
  };
}

async function createBearerChallenge(
  options: OAuthResourceServerOptions,
  c: Context,
  params: {
    error?: string;
    errorDescription?: string;
    scope?: string;
  } = {}
): Promise<string> {
  const challengeParams: Record<string, string | undefined> = {
    realm: options.realm,
    resource_metadata: await resolveResourceMetadataUrl(options, c),
    error: params.error,
    error_description: params.errorDescription,
    scope: params.scope,
  };

  const serialized = Object.entries(challengeParams)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}=${quoteAuthParam(value!)}`)
    .join(", ");

  return serialized ? `Bearer ${serialized}` : "Bearer";
}

function quoteAuthParam(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function resolveResource(
  options: OAuthResourceServerOptions,
  c: Context
): Promise<string> {
  if (typeof options.resource === "function") {
    return await options.resource(c);
  }

  if (options.resource) {
    return options.resource;
  }

  return new URL(c.req.url).origin;
}

async function resolveResourceMetadataUrl(
  options: OAuthResourceServerOptions,
  c: Context
): Promise<string> {
  if (typeof options.resourceMetadataUrl === "function") {
    return await options.resourceMetadataUrl(c);
  }

  if (options.resourceMetadataUrl) {
    return options.resourceMetadataUrl;
  }

  const url = new URL(c.req.url);
  const basePath = url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
  url.pathname = `${basePath}/.well-known/oauth-protected-resource`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function resolveAuthorizationServers(options: OAuthResourceServerOptions): string[] {
  return options.authorizationServers ?? [options.issuer];
}
