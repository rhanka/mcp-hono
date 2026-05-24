# `@sentropic/mcp-hono`

> **⚡ Web-Native, Zero-Dependency, and Edge-Ready Model Context Protocol (MCP) Framework for Hono.**

`@sentropic/mcp-hono` is a next-generation Model Context Protocol (MCP) server framework built from the ground up to integrate perfectly with **Hono**. 

Unlike standard MCP implementations (which act as heavy Node-only wrappers), `@sentropic/mcp-hono` is ultra-lightweight (under 10KB), utilizes standard Fetch Web APIs (Request/Response/SSE), runs seamlessly on edge runtimes (like Cloudflare Workers, Bun, Deno, Vercel), and lets you write highly type-safe tool handlers using Zod.

---

## 🌟 Key Features

* **Zero Heavy Dependencies**: Completely independent of `@modelcontextprotocol/sdk`. Zero Node.js polyfills needed.
* **Edge-First & Serverless-Ready**: Runs anywhere Hono runs—Cloudflare Workers, Bun, Deno, Vercel, Node.js.
* **Hono-Idiomatic Integration**: Mounts cleanly via `app.route('/mcp', mcpApp)`.
* **Full Context Access (The Game-Changer)**: Direct access to Hono's `Context` (`c`) inside your tools. Seamlessly read environment bindings, request headers, database clients, or authentication data!
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

### `.tool(options)`
Registers a tool.
* `name`: Tool name.
* `description`: Optional description.
* `schema`: Optional Zod object schema for argument validation.
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
