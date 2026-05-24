import assert from "node:assert/strict";
import { mcp } from "../dist/index.js";

const jsonRequest = (method, params) => ({
  jsonrpc: "2.0",
  id: 1,
  method,
  ...(params ? { params } : {}),
});

async function readJson(response) {
  return JSON.parse(await response.text());
}

async function run() {
  const server = mcp({
    name: "OAuth test server",
    version: "0.0.0-test",
    oauth: {
      issuer: "https://auth.example.com",
      authorizationServers: ["https://auth.example.com"],
      resource: "https://api.example.com/mcp",
      requiredScopes: ["mcp:read"],
      scopesSupported: ["mcp:read", "mcp:write"],
      validateToken: async (token) => {
        if (token === "valid-read") {
          return {
            subject: "user-123",
            scopes: ["mcp:read"],
            claims: { tenant: "sentropic" },
          };
        }
        if (token === "valid-no-scope") {
          return {
            subject: "user-456",
            scopes: ["profile"],
          };
        }
        return null;
      },
    },
  });

  server.tool({
    name: "whoami",
    handler: (_args, c) => ({
      subject: c.get("oauth").subject,
      scopes: c.get("oauth").scopes,
      tenant: c.get("oauth").claims.tenant,
    }),
  });

  const metadataResponse = await server.request(
    "https://api.example.com/.well-known/oauth-protected-resource"
  );
  assert.equal(metadataResponse.status, 200);
  const metadata = await readJson(metadataResponse);
  assert.equal(metadata.resource, "https://api.example.com/mcp");
  assert.deepEqual(metadata.authorization_servers, ["https://auth.example.com"]);
  assert.deepEqual(metadata.scopes_supported, ["mcp:read", "mcp:write"]);
  assert.deepEqual(metadata.bearer_methods_supported, ["header"]);

  const missingAuthResponse = await server.request("https://api.example.com/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(jsonRequest("tools/list")),
  });
  assert.equal(missingAuthResponse.status, 401);
  assert.match(missingAuthResponse.headers.get("www-authenticate") || "", /^Bearer /);
  assert.match(missingAuthResponse.headers.get("www-authenticate") || "", /resource_metadata=/);
  assert.match(missingAuthResponse.headers.get("www-authenticate") || "", /scope="mcp:read"/);

  const invalidTokenResponse = await server.request("https://api.example.com/", {
    method: "POST",
    headers: {
      authorization: "Bearer invalid",
      "content-type": "application/json",
    },
    body: JSON.stringify(jsonRequest("tools/list")),
  });
  assert.equal(invalidTokenResponse.status, 401);
  assert.match(invalidTokenResponse.headers.get("www-authenticate") || "", /invalid_token/);

  const insufficientScopeResponse = await server.request("https://api.example.com/", {
    method: "POST",
    headers: {
      authorization: "Bearer valid-no-scope",
      "content-type": "application/json",
    },
    body: JSON.stringify(jsonRequest("tools/list")),
  });
  assert.equal(insufficientScopeResponse.status, 403);
  assert.match(insufficientScopeResponse.headers.get("www-authenticate") || "", /insufficient_scope/);

  const successResponse = await server.request("https://api.example.com/", {
    method: "POST",
    headers: {
      authorization: "Bearer valid-read",
      "content-type": "application/json",
    },
    body: JSON.stringify(jsonRequest("tools/call", { name: "whoami", arguments: {} })),
  });
  assert.equal(successResponse.status, 200);
  const success = await readJson(successResponse);
  assert.deepEqual(success.result, {
    subject: "user-123",
    scopes: ["mcp:read"],
    tenant: "sentropic",
  });
}

run()
  .then(() => {
    console.log("PASS OAuth resource server behavior");
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
