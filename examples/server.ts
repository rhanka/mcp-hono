import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { z } from "zod";
import { mcp } from "../src/index.js";

const app = new Hono();

// 1. Setup sample middleware to mock a DB connection inside Hono Context
app.use("*", async (c, next) => {
  // Bind a mock DB client to Hono's Context
  c.set("db", {
    query: async (sql: string) => {
      console.log(`[DB Mock] Executing: ${sql}`);
      return [{ id: 1, name: "System Admin", status: "Active" }];
    }
  });
  await next();
});

// 2. Initialize the Sentropic MCP-Hono instance
const myMcp = mcp({
  name: "Sentropic Operational Hub",
  version: "1.0.0",
  description: "Native Hono MCP server providing systems, database and weather operations",
});

// 3. Register a highly typed weather tool
myMcp.tool({
  name: "get_weather",
  description: "Get real-time weather details for a specific city",
  schema: z.object({
    city: z.string().describe("The name of the city, e.g. Paris, Tokyo, San Francisco"),
    unit: z.enum(["celsius", "fahrenheit"]).default("celsius").describe("Measurement unit"),
  }),
  handler: async ({ city, unit }, c) => {
    // 💡 Access Hono Context c natively!
    console.log(`[Weather Tool] Request for ${city} (unit: ${unit})`);
    
    // Simulating call to external API or loading env variables
    const weatherData = {
      temp: unit === "celsius" ? 19 : 66,
      condition: "Sunny with gentle breeze",
      humidity: "45%"
    };

    return {
      content: [
        {
          type: "text",
          text: `Weather details for ${city}: Temperature is ${weatherData.temp}°${unit === "celsius" ? "C" : "F"}. Condition: ${weatherData.condition}. Humidity: ${weatherData.humidity}.`,
        },
      ],
    };
  },
});

// 4. Register a database-interacting tool
myMcp.tool({
  name: "fetch_admin_status",
  description: "Fetch status of administrative users from the database",
  schema: z.object({
    limit: z.number().default(5).describe("Max database records to retrieve"),
  }),
  handler: async ({ limit }, c) => {
    // 💡 Pull the DB client directly from Hono Context!
    const db = c.get("db");
    const results = await db.query(`SELECT * FROM users LIMIT ${limit}`);

    return {
      content: [
        {
          type: "text",
          text: `Database retrieval successful:\n${JSON.stringify(results, null, 2)}`,
        },
      ],
    };
  },
});

// 5. Register a dynamic Resource representing systems logs
myMcp.resource({
  uri: "file:///logs/{type}",
  name: "System diagnostic logs",
  description: "Retrieves localized system logs based on request type (e.g. system, network, db)",
  mimeType: "application/json",
  handler: async (c, params) => {
    // Retrieve dynamic path parameters directly!
    const logType = params?.type || "general";
    
    const logs = [
      { timestamp: new Date().toISOString(), type: logType, message: `System diagnostics initialized for ${logType}` },
      { timestamp: new Date().toISOString(), type: logType, message: `CPU operational at 14% capacity` },
    ];

    return {
      contents: [
        {
          uri: `file:///logs/${logType}`,
          text: JSON.stringify(logs, null, 2),
        },
      ],
    };
  },
});

// 6. Register a dynamic Prompt template
myMcp.prompt({
  name: "explain_logs",
  description: "Prepares an LLM context to explain log anomalies",
  arguments: [
    { name: "logType", description: "Type of logs to review", required: true },
    { name: "severity", description: "Filter severity level (info, warning, critical)", required: false },
  ],
  handler: async (args, c) => {
    const logType = args.logType;
    const severity = args.severity || "info";

    return {
      description: `Structured context prompt for log: ${logType}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please act as a Senior Systems Reliability Engineer. Review the following ${severity} logs for system type "${logType}" and describe potential actions.`,
          },
        },
      ],
    };
  },
});

// 7. Mount the MCP router on /mcp route of the primary Hono app
app.route("/mcp", myMcp);

// 8. Serve root directory to invite users to the playground
app.get("/", (c) => {
  return c.redirect("/mcp");
});

// 9. Boot the Hono HTTP server
const port = Number(process.env.PORT || 3000);
console.log(`\n🚀 Sentropic MCP-Hono Server running on http://localhost:${port}`);
console.log(`👉 Visit http://localhost:${port}/mcp in your browser to access the premium Dev Playground!`);
console.log(`🤖 Configure your local Claude Desktop to bridge with: npx @sentropic/mcp-hono dev http://localhost:${port}/mcp\n`);

serve({
  fetch: app.fetch,
  port,
});
