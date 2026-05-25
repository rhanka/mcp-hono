import assert from "node:assert/strict";
import { z } from "zod";
import { mcp } from "../dist/index.js";

const jsonRequest = (method, params) => ({
  jsonrpc: "2.0",
  id: 1,
  method,
  ...(params ? { params } : {}),
});

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
    name: "Zod JSON Schema test server",
    version: "0.0.0-test",
  });

  const invoiceSchema = z.object({
    amount: z.number().int(),
    paid: z.boolean(),
    status: z.enum(["draft", "paid"]),
    items: z.array(
      z.object({
        name: z.string(),
        quantity: z.number().int(),
      })
    ),
  });

  server.tool({
    name: "create_invoice",
    schema: invoiceSchema,
    handler: () => ({ ok: true }),
  });

  const invoiceInputSchema = server.getToolsList()[0].inputSchema;
  assert.equal(invoiceInputSchema.type, "object");
  assert.equal(invoiceInputSchema.properties.amount.type, "integer");
  assert.equal(invoiceInputSchema.properties.paid.type, "boolean");
  assert.deepEqual(invoiceInputSchema.properties.status, {
    type: "string",
    enum: ["draft", "paid"],
  });
  assert.equal(invoiceInputSchema.properties.items.type, "array");
  assert.equal(invoiceInputSchema.properties.items.items.type, "object");
  assert.equal(invoiceInputSchema.properties.items.items.properties.quantity.type, "integer");
  assert.deepEqual(invoiceInputSchema.required, ["amount", "paid", "status", "items"]);

  const manualInputSchema = {
    type: "object",
    properties: {
      value: { type: "string", minLength: 3 },
    },
    required: ["value"],
    additionalProperties: false,
  };

  const manualServer = mcp({
    name: "Manual inputSchema test server",
    version: "0.0.0-test",
  });

  manualServer.tool({
    name: "manual_schema",
    schema: z.object({ value: z.string().min(3) }),
    inputSchema: manualInputSchema,
    handler: ({ value }) => ({ value }),
  });

  assert.deepEqual(manualServer.getToolsList()[0].inputSchema, manualInputSchema);

  const invalidCall = await postJson(
    manualServer,
    jsonRequest("tools/call", {
      name: "manual_schema",
      arguments: { value: "no" },
    })
  );
  assert.equal(invalidCall.error.code, -32602);

  const validCall = await postJson(
    manualServer,
    jsonRequest("tools/call", {
      name: "manual_schema",
      arguments: { value: "yes" },
    })
  );
  assert.deepEqual(validCall.result, { value: "yes" });
}

run()
  .then(() => {
    console.log("PASS Zod JSON Schema publishing");
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
