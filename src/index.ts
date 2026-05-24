import { McpHono } from "./server.js";
import type { McpHonoOptions } from "./types.js";

/**
 * Factory helper to initialize a new McpHono server router instance.
 *
 * @param options Server configuration options (name, version, optional description)
 */
export function mcp(options: McpHonoOptions): McpHono {
  return new McpHono(options);
}

export { McpHono } from "./server.js";
export type {
  ToolRegistration,
  ResourceRegistration,
  PromptRegistration,
} from "./server.js";

export * from "./types.js";
export { getOAuthContext } from "./oauth.js";
export { getPlaygroundHtml } from "./playground.js";
