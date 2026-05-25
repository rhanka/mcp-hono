# `@sentropic/mcp-hono`

> **Deprecated and archived.** Use [`@hono/mcp`](https://www.npmjs.com/package/@hono/mcp) instead. This package is no longer maintained and may be removed from npm.

> **⚡ Web-Native, MCP-SDK-Free, and Edge-Ready Model Context Protocol (MCP) Framework for Hono.**

`@sentropic/mcp-hono` is a next-generation Model Context Protocol (MCP) server framework built from the ground up to integrate perfectly with **Hono**. 

Unlike standard MCP implementations (which act as heavy Node-only wrappers), `@sentropic/mcp-hono` keeps a small runtime footprint, uses standard Fetch Web APIs (Request/Response/SSE), runs seamlessly on edge runtimes (like Cloudflare Workers, Bun, Deno, Vercel), and lets you write highly type-safe tool handlers using Zod.

---

## 🌟 Key Features

* **No MCP SDK Runtime Dependency**: Completely independent of `@modelcontextprotocol/sdk`. Zero Node.js polyfills needed.
* **Edge-First & Serverless-Ready**: Runs anywhere Hono runs—Cloudflare Workers, Bun, Deno, Vercel, Node.js.
* **Hono-Idiomatic Integration**: Mounts cleanly via `app.route('/mcp', mcpApp)`.
* **Full Context Access (The Game-Changer)**: Direct access to Hono's `Context` (`c`) inside your tools. Seamlessly read environment bindings, request headers, database clients, or authentication data!
* **OAuth Resource Server Built-In**: Protect MCP HTTP/SSE endpoints with Bearer tokens, publish protected-resource metadata, and expose validated auth context to handlers.
* **Modern MCP Negotiation**: Supports `2024-11-05`, `2025-03-26`, and `2025-06-18`, echoing the client's supported version during `initialize`.
* **Autonomic Type Safety**: Define schemas using `Zod` to automatically type and validate arguments.
* **Premium Developer Playground**: Visiting your MCP endpoint in a browser (`GET /mcp`) renders a gorgeous, interactive dark-mode dashboard to test your tools in real-time.
* **Stdio-to-HTTP dev bridge (`npx @sentropic/mcp-hono dev`)**: Simple local development bridge to hook your Hono server into local desktop clients (like Claude Desktop) without polluting your production code with Stdio logic.

---

## 🚀 Installation

```bash
npm install @sentropic/mcp-hono hono zod
```

---

## 💻 Quick Start

Define your MCP server as a Hono router and mount it to your main application:

```typescript
import { Hono } from 'hono'
import { z } from 'zod'
import { mcp } from '@sentropic/mcp-hono'

const app = new Hono()

// Initialize MCP Router
const myMcp = mcp({
  name: 'Sentropic Hub',
  version: '1.0.0',
  description: 'Provide real-time server utilities and data access',
})

// Define a type-safe Tool
myMcp.tool({
  name: 'get_weather',
  description: 'Retrieve real-time weather details for a specific city',
  schema: z.object({
    city: z.string().describe('The name of the city'),
    unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
  handler: async ({ city, unit }, c) => {
    // 'c' is Hono's Context! Read secrets or custom bound database clients:
    const apiKey = c.env.WEATHER_API_KEY
    
    return {
      content: [
        {
          type: 'text',
          text: `Weather in ${city} is currently 22° ${unit === 'celsius' ? 'C' : 'F'}.`,
        },
      ],
    }
  },
})

// Mount to Hono on a single route
app.route('/mcp', myMcp)

export default app
```

---

## 🛠️ Testing Locally (Stdio Dev Bridge)

Desktop clients like **Claude Desktop** communicate via standard input/output (`stdio`), whereas your Hono application is built using standard **HTTP**.

To connect Claude Desktop to your local Hono MCP server without writing Stdio code inside your Hono app, use the built-in bridge:

1. Start your local Hono dev server:
   ```bash
   npm run dev # Runs on http://localhost:3000
   ```

2. Add this configuration to your local Claude Desktop config (usually located at `~/.config/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "sentropic-hono": {
         "command": "npx",
         "args": ["@sentropic/mcp-hono", "dev", "http://localhost:3000/mcp"]
       }
     }
   }
   ```

3. Restart Claude Desktop. The bridge will pipe Claude's Stdio signals directly into your Hono HTTP server!

---

## 🎨 Premium Developer Playground

Open your MCP endpoint directly in your browser (`http://localhost:3000/mcp`):

* Serves an elite, beautiful dark-mode interface.
* Lists all registered tools, resources, and prompts dynamically.
* Dynamically parses tool parameter schemas and generates interactive form fields.
* Allows you to execute requests live and review structural JSON-RPC request and response payloads with syntax highlighting.

---

## 📦 API Reference

### `mcp(options)` / `McpHono`
Extends Hono's `Hono` class. Returns a router instance.
* `options.name`: Name of the MCP server.
* `options.version`: Version of the MCP server.
* `options.description`: Description of the MCP server.
* `options.oauth`: Optional OAuth Resource Server configuration.

### OAuth Resource Server

`@sentropic/mcp-hono` can act as an OAuth Resource Server. It validates `Authorization: Bearer <token>` through your identity provider hook, exposes protected-resource metadata at `/.well-known/oauth-protected-resource`, and makes the auth context available as `c.get('oauth')`.

```typescript
const myMcp = mcp({
  name: 'Sentropic Hub',
  version: '1.0.0',
  oauth: {
    issuer: 'https://auth.example.com',
    authorizationServers: ['https://auth.example.com'],
    resource: 'https://api.example.com/mcp',
    requiredScopes: ['mcp:read'],
    scopesSupported: ['mcp:read', 'mcp:write'],
    validateToken: async (token, c) => {
      const payload = await verifyAccessTokenWithYourIdP(token, c)

      return payload
        ? {
            subject: payload.sub,
            scopes: payload.scope,
            audience: payload.aud,
            issuer: payload.iss,
            claims: payload,
          }
        : null
    },
  },
})

myMcp.tool({
  name: 'whoami',
  handler: (_args, c) => {
    const auth = c.get('oauth')
    return { subject: auth.subject, scopes: auth.scopes }
  },
})
```

Missing or invalid tokens receive `401` with a `WWW-Authenticate: Bearer` challenge. Tokens without the configured `requiredScopes` receive `403 insufficient_scope`.

### `.tool(options)`
Registers a tool.
* `name`: Tool name.
* `description`: Optional description.
* `schema`: Optional Zod object schema for argument validation.
* `inputSchema`: Optional precomputed JSON Schema published in `tools/list`. When provided, it takes precedence over the internal Zod-to-JSON-Schema conversion while `schema` still controls runtime validation.
* `handler(args, c)`: Function executed when tool is called. Receives the validated arguments and Hono's Context `c`.

### `.resource(options)`
Registers a resource. Supports static and templated dynamic paths (e.g. `file:///logs/{name}`).
* `uri`: Resource URI pattern.
* `name`: Resource name.
* `description`: Optional description.
* `mimeType`: Optional media type.
* `handler(c, params)`: Executed when resource is read. Receives Hono's Context `c` and dynamic URI parameters.

### `.prompt(options)`
Registers a prompt template.
* `name`: Prompt name.
* `description`: Optional description.
* `arguments`: Optional array of arguments.
* `handler(args, c)`: Executed when prompt is requested.

---

## 📜 License

MIT License. Built by Sentropic.
