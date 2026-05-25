/**
 * Model Context Protocol (MCP) JSON-RPC 2.0 Type Definitions.
 *
 * This file contains standard type definitions for the MCP JSON-RPC 2.0 protocol,
 * ensuring complete type safety and compliance with the official specification.
 */

import type { Context } from "hono";

// JSON-RPC 2.0 Basics
export type JSONRPCId = string | number;

export interface JSONRPCRequest<TMethod extends string = string, TParams = any> {
  jsonrpc: "2.0";
  id: JSONRPCId;
  method: TMethod;
  params?: TParams;
}

export interface JSONRPCNotification<TMethod extends string = string, TParams = any> {
  jsonrpc: "2.0";
  method: TMethod;
  params?: TParams;
}

export interface JSONRPCResponseSuccess<TResult = any> {
  jsonrpc: "2.0";
  id: JSONRPCId;
  result: TResult;
}

export interface JSONRPCResponseError {
  jsonrpc: "2.0";
  id: JSONRPCId;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

export type JSONRPCResponse<TResult = any> = JSONRPCResponseSuccess<TResult> | JSONRPCResponseError;
export type JSONRPCMessage = JSONRPCRequest | JSONRPCNotification | JSONRPCResponse;

// Standard JSON-RPC Error Codes
export const JSONRPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// MCP Protocol Versions
export const MCP_VERSION = "2025-06-18";
export const SUPPORTED_MCP_PROTOCOL_VERSIONS = [
  "2024-11-05",
  "2025-03-26",
  "2025-06-18",
] as const;

// MCP Hono Server Options
export interface McpHonoOptions {
  name: string;
  version: string;
  description?: string;
  oauth?: OAuthResourceServerOptions;
}

export interface OAuthContext {
  token: string;
  subject?: string;
  scopes: string[];
  audience?: string | string[];
  issuer?: string;
  claims: Record<string, unknown>;
}

export interface OAuthTokenValidationResult {
  subject?: string;
  scopes?: string[] | string;
  audience?: string | string[];
  issuer?: string;
  claims?: Record<string, unknown>;
}

export interface OAuthProtectedResourceMetadata {
  resource: string;
  authorization_servers: string[];
  bearer_methods_supported: ["header"];
  scopes_supported?: string[];
  resource_documentation?: string;
}

export interface OAuthResourceServerOptions {
  issuer: string;
  authorizationServers?: string[];
  resource?: string | ((c: Context) => string | Promise<string>);
  resourceMetadataUrl?: string | ((c: Context) => string | Promise<string>);
  requiredScopes?: string[];
  scopesSupported?: string[];
  serviceDocumentation?: string;
  realm?: string;
  validateToken: (
    token: string,
    c: Context
  ) =>
    | OAuthTokenValidationResult
    | false
    | null
    | Promise<OAuthTokenValidationResult | false | null>;
}

// Lifecycle Requests
export interface InitializeParams {
  protocolVersion: string;
  capabilities: {
    roots?: { listChanged?: boolean };
    sampling?: Record<string, never>;
  };
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: {
    tools?: { listChanged?: boolean };
    resources?: { subscribe?: boolean; listChanged?: boolean };
    prompts?: { listChanged?: boolean };
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

// Tool Types
export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
}

export interface CallToolParams {
  name: string;
  arguments?: Record<string, any>;
}

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image";
  data: string; // base64
  mimeType: string;
}

export interface EmbeddedResourceContent {
  type: "resource";
  resource: {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string; // base64
  };
}

export type ToolContent = TextContent | ImageContent | EmbeddedResourceContent;

export interface CallToolResult {
  content: ToolContent[];
  isError?: boolean;
}

// Resource Types
export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ReadResourceParams {
  uri: string;
}

export interface ReadResourceResult {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string; // base64
  }>;
}

// Prompt Types
export interface PromptDefinition {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface GetPromptParams {
  name: string;
  arguments?: Record<string, string>;
}

export interface PromptMessage {
  role: "user" | "assistant";
  content: TextContent | ImageContent | EmbeddedResourceContent;
}

export interface GetPromptResult {
  description?: string;
  messages: PromptMessage[];
}

// Completion Types
export interface CompletionParams {
  ref: {
    type: "ref/prompt" | "ref/resource";
    name: string;
  };
  argument: {
    name: string;
    value: string;
  };
}

export interface CompletionResult {
  completion: {
    values: string[];
    total?: number;
    hasMore?: boolean;
  };
}
