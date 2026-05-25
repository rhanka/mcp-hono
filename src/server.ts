import { Hono } from "hono";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import {
  authorizeOAuthRequest,
  createOAuthProtectedResourceMetadata,
} from "./oauth.js";
import type {
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCId,
  ToolDefinition,
  ToolInputSchema,
  ResourceDefinition,
  PromptDefinition,
  CallToolParams,
  ReadResourceParams,
  GetPromptParams,
  McpHonoOptions,
  OAuthResourceServerOptions,
} from "./types.js";
import { JSONRPC_ERRORS, MCP_VERSION, SUPPORTED_MCP_PROTOCOL_VERSIONS } from "./types.js";
import { getPlaygroundHtml } from "./playground.js";

export interface ToolRegistration<TSchema extends z.ZodObject<any> | undefined = undefined> {
  name: string;
  description?: string;
  schema?: TSchema;
  inputSchema?: ToolInputSchema;
  handler: (
    args: TSchema extends z.ZodObject<any> ? z.infer<TSchema> : Record<string, any>,
    c: Context
  ) => Promise<any> | any;
}

export interface ResourceRegistration {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: (c: Context, params?: Record<string, string>) => Promise<any> | any;
}

export interface PromptRegistration {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
  handler: (args: Record<string, string>, c: Context) => Promise<any> | any;
}

interface ActiveSession {
  id: string;
  sendSSE: (event: string, data: string) => Promise<void>;
  disconnected?: boolean;
}

export class McpHono extends Hono {
  private serverInfo: McpHonoOptions;
  private oauth?: OAuthResourceServerOptions;
  private toolsRegistry = new Map<string, {
    description?: string;
    schema?: z.ZodObject<any>;
    inputSchema?: ToolInputSchema;
    handler: (args: any, c: Context) => Promise<any> | any;
  }>();

  private resourcesRegistry = new Map<string, {
    name: string;
    description?: string;
    mimeType?: string;
    handler: (c: Context, params?: Record<string, string>) => Promise<any> | any;
  }>();

  private promptsRegistry = new Map<string, {
    description?: string;
    arguments?: Array<{ name: string; description?: string; required?: boolean }>;
    handler: (args: Record<string, string>, c: Context) => Promise<any> | any;
  }>();

  private sessions = new Map<string, ActiveSession>();

  constructor(options: McpHonoOptions) {
    super();
    this.serverInfo = options;
    this.oauth = options.oauth;

    this.setupRoutes();
  }

  /**
   * Registers a type-safe tool in the MCP server.
   */
  public tool<TSchema extends z.ZodObject<any> | undefined = undefined>(
    options: ToolRegistration<TSchema>
  ): this {
    this.toolsRegistry.set(options.name, {
      description: options.description,
      schema: options.schema as z.ZodObject<any> | undefined,
      inputSchema: options.inputSchema,
      handler: options.handler,
    });
    return this;
  }

  /**
   * Registers a static or dynamic resource in the MCP server.
   */
  public resource(options: ResourceRegistration): this {
    this.resourcesRegistry.set(options.uri, {
      name: options.name,
      description: options.description,
      mimeType: options.mimeType,
      handler: options.handler,
    });
    return this;
  }

  /**
   * Registers a prompt template in the MCP server.
   */
  public prompt(options: PromptRegistration): this {
    this.promptsRegistry.set(options.name, {
      description: options.description,
      arguments: options.arguments,
      handler: options.handler,
    });
    return this;
  }

  /**
   * Gets a list of all registered tools formatted for the MCP specification.
   */
  public getToolsList(): ToolDefinition[] {
    const list: ToolDefinition[] = [];
    for (const [name, tool] of this.toolsRegistry.entries()) {
      list.push({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema ?? (tool.schema
          ? this.zodToJsonSchema(tool.schema)
          : { type: "object", properties: {} }),
      });
    }
    return list;
  }

  /**
   * Gets a list of all registered resources formatted for the MCP specification.
   */
  public getResourcesList(): ResourceDefinition[] {
    const list: ResourceDefinition[] = [];
    for (const [uri, resource] of this.resourcesRegistry.entries()) {
      list.push({
        uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      });
    }
    return list;
  }

  /**
   * Gets a list of all registered prompts formatted for the MCP specification.
   */
  public getPromptsList(): PromptDefinition[] {
    const list: PromptDefinition[] = [];
    for (const [name, prompt] of this.promptsRegistry.entries()) {
      list.push({
        name,
        description: prompt.description,
        arguments: prompt.arguments,
      });
    }
    return list;
  }

  /**
   * Set up Hono routing handlers for GET and POST endpoints.
   */
  private setupRoutes() {
    if (this.oauth) {
      this.get("/.well-known/oauth-protected-resource", async (c) => {
        return c.json(await createOAuthProtectedResourceMetadata(this.oauth!, c));
      });
    }

    // 1. GET Route: Server-Sent Events (SSE) or HTML Developer Playground
    this.get("/", async (c) => {
      const oauthResponse = await this.authorizeRequest(c);
      if (oauthResponse) {
        return oauthResponse;
      }

      const accept = c.req.header("Accept") || "";

      // Browser or HTML request -> serve playground
      if (accept.includes("text/html")) {
        return c.html(getPlaygroundHtml(this.serverInfo, this.getToolsList(), this.getResourcesList(), this.getPromptsList()));
      }

      // SSE upgrade requested
      if (accept.includes("text/event-stream")) {
        const sessionId = c.req.query("sessionId") || c.req.header("Mcp-Session-Id") || crypto.randomUUID();
        c.header("Mcp-Session-Id", sessionId);

        return streamSSE(c, async (stream) => {
          const session: ActiveSession = {
            id: sessionId,
            sendSSE: async (event, data) => {
              await stream.writeSSE({ event, data });
            },
          };

          this.sessions.set(sessionId, session);

          // Prime the stream with an initial message
          await stream.writeSSE({
            event: "endpoint",
            data: JSON.stringify({ message: "MCP Stream established", sessionId }),
          });

          // Keep stream alive
          while (!session.disconnected) {
            await new Promise((resolve) => setTimeout(resolve, 30000));
            try {
              await stream.writeSSE({ event: "ping", data: "{}" });
            } catch {
              session.disconnected = true;
              break;
            }
          }

          this.sessions.delete(sessionId);
        });
      }

      // Default JSON response
      return c.json({
        mcp: true,
        name: this.serverInfo.name,
        version: this.serverInfo.version,
        description: this.serverInfo.description,
        protocolVersion: MCP_VERSION,
        supportedProtocolVersions: SUPPORTED_MCP_PROTOCOL_VERSIONS,
        supportedTransports: ["Streamable HTTP", "SSE"],
      });
    });

    // 2. POST Route: Direct JSON-RPC execution
    this.post("/", async (c) => {
      try {
        const oauthResponse = await this.authorizeRequest(c);
        if (oauthResponse) {
          return oauthResponse;
        }

        const body = await c.req.json();
        const sessionId = c.req.header("Mcp-Session-Id") || c.req.query("sessionId") || "";

        // Support standard JSON-RPC batching or single requests
        if (Array.isArray(body)) {
          const responses = await Promise.all(
            body.map((req) => this.processRpcRequest(req, c, sessionId))
          );
          // Filter out responses to notifications (which return null)
          const validResponses = responses.filter(Boolean);
          return validResponses.length > 0 ? c.json(validResponses) : c.body(null, 204);
        }

        const response = await this.processRpcRequest(body, c, sessionId);
        if (!response) {
          return c.body(null, 204); // Notification, no response
        }

        // Return MCP Session Id header if session was passed
        if (sessionId) {
          c.header("Mcp-Session-Id", sessionId);
        }

        return c.json(response);
      } catch (err: any) {
        return c.json(
          this.createErrorResponse(
            null,
            JSONRPC_ERRORS.PARSE_ERROR,
            `Parse error: ${err.message}`
          ),
          400
        );
      }
    });
  }

  private async authorizeRequest(c: Context): Promise<Response | null> {
    if (!this.oauth) {
      return null;
    }

    const result = await authorizeOAuthRequest(this.oauth, c);
    if (result.ok) {
      return null;
    }

    c.header("WWW-Authenticate", result.wwwAuthenticate);
    return c.json(
      {
        error: result.error,
        error_description: result.errorDescription,
      },
      result.status
    );
  }

  /**
   * Process a single JSON-RPC request and route it to the appropriate registry.
   */
  private async processRpcRequest(
    request: any,
    c: Context,
    sessionId?: string
  ): Promise<JSONRPCResponse | null> {
    if (!this.isValidRpcRequest(request)) {
      return this.createErrorResponse(
        request?.id ?? null,
        JSONRPC_ERRORS.INVALID_REQUEST,
        "Invalid request"
      );
    }

    const { id, method, params } = request;

    try {
      switch (method) {
        case "initialize":
          return this.createSuccessResponse(id, {
            protocolVersion: this.negotiateProtocolVersion(params),
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false },
            },
            serverInfo: {
              name: this.serverInfo.name,
              version: this.serverInfo.version,
            },
          });

        case "initialized":
          // Client confirms handshake complete (Notification)
          return null;

        case "ping":
          return this.createSuccessResponse(id, {});

        case "tools/list":
          return this.createSuccessResponse(id, {
            tools: this.getToolsList(),
          });

        case "tools/call":
          return await this.handleToolCall(id, params, c);

        case "resources/list":
          return this.createSuccessResponse(id, {
            resources: this.getResourcesList(),
          });

        case "resources/read":
          return await this.handleResourceRead(id, params, c);

        case "prompts/list":
          return this.createSuccessResponse(id, {
            prompts: this.getPromptsList(),
          });

        case "prompts/get":
          return await this.handlePromptGet(id, params, c);

        default:
          return this.createErrorResponse(
            id,
            JSONRPC_ERRORS.METHOD_NOT_FOUND,
            `Method not found: ${method}`
          );
      }
    } catch (err: any) {
      return this.createErrorResponse(
        id,
        JSONRPC_ERRORS.INTERNAL_ERROR,
        err.message || "Internal server error"
      );
    }
  }

  /**
   * Handle executing a tool call and validating parameters.
   */
  private async handleToolCall(
    id: JSONRPCId,
    params: any,
    c: Context
  ): Promise<JSONRPCResponse> {
    const toolParams = params as CallToolParams;
    if (!toolParams || !toolParams.name) {
      return this.createErrorResponse(
        id,
        JSONRPC_ERRORS.INVALID_PARAMS,
        "Missing tool name parameter"
      );
    }

    const tool = this.toolsRegistry.get(toolParams.name);
    if (!tool) {
      return this.createErrorResponse(
        id,
        JSONRPC_ERRORS.INVALID_PARAMS,
        `Tool not found: ${toolParams.name}`
      );
    }

    let args = toolParams.arguments || {};

    // Validate using Zod schema if provided
    if (tool.schema) {
      const parsed = tool.schema.safeParse(args);
      if (!parsed.success) {
        return this.createErrorResponse(
          id,
          JSONRPC_ERRORS.INVALID_PARAMS,
          `Invalid arguments: ${parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
        );
      }
      args = parsed.data;
    }

    try {
      const result = await tool.handler(args, c);
      return this.createSuccessResponse(id, result);
    } catch (err: any) {
      return this.createSuccessResponse(id, {
        content: [{ type: "text", text: `Error calling tool: ${err.message}` }],
        isError: true,
      });
    }
  }

  /**
   * Handle reading a resource.
   */
  private async handleResourceRead(
    id: JSONRPCId,
    params: any,
    c: Context
  ): Promise<JSONRPCResponse> {
    const resourceParams = params as ReadResourceParams;
    if (!resourceParams || !resourceParams.uri) {
      return this.createErrorResponse(
        id,
        JSONRPC_ERRORS.INVALID_PARAMS,
        "Missing resource URI parameter"
      );
    }

    // Direct match check
    let resource = this.resourcesRegistry.get(resourceParams.uri);
    let matchedParams: Record<string, string> = {};

    // Dynamic match if direct fails (supporting simple parameters like {name})
    if (!resource) {
      for (const [uriPattern, res] of this.resourcesRegistry.entries()) {
        const pattern = uriPattern.replace(/\{([^}]+)\}/g, "([^/]+)");
        const regex = new RegExp(`^${pattern}$`);
        const match = resourceParams.uri.match(regex);
        if (match) {
          resource = res;
          // Extract variables
          const paramNames = [...uriPattern.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
          paramNames.forEach((name, i) => {
            matchedParams[name] = match[i + 1];
          });
          break;
        }
      }
    }

    if (!resource) {
      return this.createErrorResponse(
        id,
        JSONRPC_ERRORS.INVALID_PARAMS,
        `Resource not found: ${resourceParams.uri}`
      );
    }

    try {
      const result = await resource.handler(c, matchedParams);
      return this.createSuccessResponse(id, result);
    } catch (err: any) {
      return this.createErrorResponse(
        id,
        JSONRPC_ERRORS.INTERNAL_ERROR,
        `Error reading resource: ${err.message}`
      );
    }
  }

  private negotiateProtocolVersion(params: any): string {
    const requestedVersion = params?.protocolVersion;

    if (
      typeof requestedVersion === "string" &&
      SUPPORTED_MCP_PROTOCOL_VERSIONS.includes(
        requestedVersion as (typeof SUPPORTED_MCP_PROTOCOL_VERSIONS)[number]
      )
    ) {
      return requestedVersion;
    }

    return MCP_VERSION;
  }

  /**
   * Handle getting a prompt template.
   */
  private async handlePromptGet(
    id: JSONRPCId,
    params: any,
    c: Context
  ): Promise<JSONRPCResponse> {
    const promptParams = params as GetPromptParams;
    if (!promptParams || !promptParams.name) {
      return this.createErrorResponse(
        id,
        JSONRPC_ERRORS.INVALID_PARAMS,
        "Missing prompt name parameter"
      );
    }

    const prompt = this.promptsRegistry.get(promptParams.name);
    if (!prompt) {
      return this.createErrorResponse(
        id,
        JSONRPC_ERRORS.INVALID_PARAMS,
        `Prompt not found: ${promptParams.name}`
      );
    }

    const args = promptParams.arguments || {};

    try {
      const result = await prompt.handler(args, c);
      return this.createSuccessResponse(id, result);
    } catch (err: any) {
      return this.createErrorResponse(
        id,
        JSONRPC_ERRORS.INTERNAL_ERROR,
        `Error generating prompt: ${err.message}`
      );
    }
  }

  /**
   * Basic validation of JSON-RPC 2.0 structure.
   */
  private isValidRpcRequest(request: any): request is JSONRPCRequest {
    return (
      request &&
      request.jsonrpc === "2.0" &&
      typeof request.method === "string" &&
      (request.id === undefined ||
        typeof request.id === "string" ||
        typeof request.id === "number")
    );
  }

  private createSuccessResponse(id: JSONRPCId, result: any): JSONRPCResponse {
    return {
      jsonrpc: "2.0",
      id,
      result,
    };
  }

  private createErrorResponse(
    id: JSONRPCId | null,
    code: number,
    message: string
  ): JSONRPCResponse {
    return {
      jsonrpc: "2.0",
      id: id!,
      error: {
        code,
        message,
      },
    };
  }

  /**
   * Web-Native lightweight Zod to JSON Schema converter.
   * Eliminates the need for external large packages.
   */
  private zodToJsonSchema(schema: z.ZodObject<any>): ToolInputSchema {
    const toJSONSchema = (z as any).toJSONSchema;
    if (typeof toJSONSchema === "function") {
      try {
        return toJSONSchema(schema, { target: "draft-7" });
      } catch {
        return this.zodObjectToJsonSchema(schema);
      }
    }

    return this.zodObjectToJsonSchema(schema);
  }

  private zodObjectToJsonSchema(schema: z.ZodObject<any>): ToolInputSchema {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    const shape = this.getZodObjectShape(schema);
    for (const [key, value] of Object.entries(shape)) {
      const zodType = value as z.ZodTypeAny;
      const jsonType = this.parseZodType(zodType);
      if (jsonType) {
        properties[key] = jsonType;
      }
      if (!this.isZodOptional(zodType)) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  private parseZodType(zodType: z.ZodTypeAny): any {
    let typeInfo: any = {};

    if (zodType.description) {
      typeInfo.description = zodType.description;
    }

    const currentType = this.unwrapZodType(zodType);
    const def = this.getZodDef(currentType);
    const typeName = def?.typeName ?? def?.type;

    switch (typeName) {
      case "ZodString":
      case "string":
        typeInfo.type = "string";
        break;
      case "ZodNumber":
      case "number":
        typeInfo.type = this.isZodInteger(currentType, def) ? "integer" : "number";
        break;
      case "ZodBoolean":
      case "boolean":
        typeInfo.type = "boolean";
        break;
      case "ZodEnum":
      case "enum":
        typeInfo.type = "string";
        typeInfo.enum = this.getZodEnumValues(def);
        break;
      case "ZodArray":
      case "array":
        typeInfo.type = "array";
        typeInfo.items = this.parseZodType(def.element ?? def.type);
        break;
      case "ZodObject":
      case "object":
        typeInfo = {
          ...typeInfo,
          ...this.zodObjectToJsonSchema(currentType as z.ZodObject<any>),
        };
        break;
      default:
        typeInfo.type = "string";
    }

    return typeInfo;
  }

  private getZodObjectShape(schema: z.ZodObject<any>): Record<string, any> {
    const def = this.getZodDef(schema);
    const shape = (schema as any).shape ?? def?.shape;
    return typeof shape === "function" ? shape() : shape ?? {};
  }

  private getZodDef(zodType: any): any {
    return zodType?._def ?? zodType?._zod?.def ?? zodType?.def;
  }

  private unwrapZodType(zodType: z.ZodTypeAny): any {
    let currentType: any = zodType;

    while (true) {
      const def = this.getZodDef(currentType);
      const typeName = def?.typeName ?? def?.type;
      if (
        typeName !== "ZodOptional" &&
        typeName !== "ZodNullable" &&
        typeName !== "optional" &&
        typeName !== "nullable"
      ) {
        return currentType;
      }
      currentType = def.innerType;
    }
  }

  private isZodOptional(zodType: z.ZodTypeAny): boolean {
    if (typeof (zodType as any).isOptional === "function" && (zodType as any).isOptional()) {
      return true;
    }

    const def = this.getZodDef(zodType);
    const typeName = def?.typeName ?? def?.type;
    return typeName === "ZodOptional" || typeName === "optional";
  }

  private getZodEnumValues(def: any): string[] {
    if (Array.isArray(def?.values)) {
      return def.values;
    }

    if (def?.entries) {
      return Object.values(def.entries);
    }

    return [];
  }

  private isZodInteger(zodType: any, def: any): boolean {
    if (zodType?.isInt === true || ["safeint", "int32", "int64"].includes(zodType?.format)) {
      return true;
    }

    if (!Array.isArray(def?.checks)) {
      return false;
    }

    return def.checks.some((check: any) => {
      const checkDef = check?.def ?? check?._zod?.def ?? check;
      return (
        check?.kind === "int" ||
        checkDef?.kind === "int" ||
        check?.isInt === true ||
        ["safeint", "int32", "int64"].includes(check?.format) ||
        (checkDef?.check === "number_format" &&
          ["safeint", "int32", "int64"].includes(checkDef?.format))
      );
    });
  }
}
