#!/usr/bin/env node

/**
 * Sentropic MCP-Hono CLI Dev Bridge.
 *
 * A lightweight Stdio-to-HTTP bridge utility that allows local desktop clients
 * (like Claude Desktop) to connect to web-native Hono MCP servers over standard
 * input/output (stdio), while preserving the clean, HTTP-first architecture of Hono.
 */

import * as readline from "readline";
import { stdin, stdout, stderr } from "process";

const args = process.argv.slice(2);
const command = args[0];
const targetUrl = args[1];

if (!command || (command !== "dev" && command !== "bridge") || !targetUrl) {
  printHelp();
  process.exit(1);
}

// Stdio Bridge Execution
runStdioBridge(targetUrl).catch((err) => {
  stderr.write(`[MCP-Bridge Error] Fatal: ${err.message}\n`);
  process.exit(1);
});

function printHelp() {
  stderr.write(`
⚡ Sentropic MCP-Hono Stdio Dev Bridge ⚡

Usage:
  npx @sentropic/mcp-hono dev <http-endpoint>
  npx @sentropic/mcp-hono bridge <http-endpoint>

Example:
  npx @sentropic/mcp-hono dev http://localhost:3000/mcp

Note: This bridge enables local testing (e.g. inside Claude Desktop) of web-native Hono MCP servers.
All diagnostic and connection logs are safely piped to stderr, preserving stdout for the JSON-RPC channel.
\n`);
}

async function runStdioBridge(url: string) {
  stderr.write(`[MCP-Bridge] Starting bridge connection to ${url}...\n`);
  stderr.write(`[MCP-Bridge] Listening on stdio. Ready for JSON-RPC messages.\n`);

  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
    terminal: false,
  });

  // Track session ID dynamically returned by the Hono HTTP server
  let mcpSessionId = "";

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      // Validate line is a JSON-RPC message
      const request = JSON.parse(trimmed);
      
      if (request.method) {
        stderr.write(`[MCP-Bridge] Request Received: ${request.method} (ID: ${request.id ?? "Notification"})\n`);
      }

      // Forward request to Hono server over HTTP POST
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
      };

      if (mcpSessionId) {
        headers["Mcp-Session-Id"] = mcpSessionId;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      // Capture and update session ID if provided by response headers
      const returnedSessionId = response.headers.get("Mcp-Session-Id");
      if (returnedSessionId) {
        mcpSessionId = returnedSessionId;
      }

      if (response.status === 204) {
        // Notification processed, no response body to return
        return;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${text}`);
      }

      const jsonResponse = await response.json();

      // Write valid JSON-RPC responses to stdout (required by desktop clients)
      stdout.write(JSON.stringify(jsonResponse) + "\n");
      
      if (request.method) {
        stderr.write(`[MCP-Bridge] Response Forwarded for: ${request.method}\n`);
      }
    } catch (err: any) {
      stderr.write(`[MCP-Bridge Error] Failed to process line: ${err.message}\n`);
      
      // Fallback: Return a standard JSON-RPC error response if request ID is known
      try {
        const request = JSON.parse(trimmed);
        if (request && request.id !== undefined) {
          const errorResponse = {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32603,
              message: `Bridge Execution Failed: ${err.message}`,
            },
          };
          stdout.write(JSON.stringify(errorResponse) + "\n");
        }
      } catch {
        // Line wasn't valid JSON, can't return structured RPC error
      }
    }
  });

  rl.on("close", () => {
    stderr.write(`[MCP-Bridge] Stdio channel closed. Exiting.\n`);
    process.exit(0);
  });
}
