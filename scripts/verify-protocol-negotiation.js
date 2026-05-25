import assert from "node:assert/strict";
import { mcp } from "../dist/index.js";

function initializeRequest(protocolVersion) {
  return {
    jsonrpc: "2.0",
    id: protocolVersion,
    method: "initialize",
    params: {
      protocolVersion,
      capabilities: {},
      clientInfo: {
        name: "protocol-negotiation-test",
        version: "0.0.0-test",
      },
    },
  };
}

async function postJson(server, body) {
  const response = await server.request("https://api.example.com/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  assert.equal(response.status, 200);
  return JSON.parse(await response.text());
}

async function run() {
  const server = mcp({
    name: "Protocol negotiation test server",
    version: "0.0.0-test",
  });

  const latestResponse = await postJson(server, initializeRequest("2025-06-18"));
  assert.equal(latestResponse.result.protocolVersion, "2025-06-18");

  const streamableHttpResponse = await postJson(server, initializeRequest("2025-03-26"));
  assert.equal(streamableHttpResponse.result.protocolVersion, "2025-03-26");

  const legacyResponse = await postJson(server, initializeRequest("2024-11-05"));
  assert.equal(legacyResponse.result.protocolVersion, "2024-11-05");

  const unsupportedResponse = await postJson(server, initializeRequest("2099-01-01"));
  assert.equal(unsupportedResponse.result.protocolVersion, "2025-06-18");
}

run()
  .then(() => {
    console.log("PASS MCP protocol version negotiation");
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
