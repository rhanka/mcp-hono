import type { McpHonoOptions, ToolDefinition, ResourceDefinition, PromptDefinition } from "./types.js";
import { foundation, semantic, component, toCssVariables } from "@sentropic/design-system-tokens";

/**
 * Returns a static Sentropic-aligned MCP developer console.
 * The console lists registered MCP capabilities and lets developers issue
 * live JSON-RPC requests against the current endpoint.
 */
export function getPlaygroundHtml(
  info: McpHonoOptions,
  tools: ToolDefinition[],
  resources: ResourceDefinition[],
  prompts: PromptDefinition[]
): string {
  const toolsJson = JSON.stringify(tools, null, 2);
  const resourcesJson = JSON.stringify(resources, null, 2);
  const promptsJson = JSON.stringify(prompts, null, 2);

  const foundationCss = toCssVariables(foundation, ":root", "st");
  const semanticCss = toCssVariables(semantic, ":root", "st");
  const componentCss = toCssVariables(component, ":root", "st");

  const firstType = tools.length > 0 ? "tool" : resources.length > 0 ? "resource" : "prompt";
  const firstIndex = 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(info.name || "Sentropic MCP Console")}</title>
  <style>
    ${foundationCss}
    ${semanticCss}
    ${componentCss}

    :root {
      --app-background: var(--st-surface-subtle, #f8fafc);
      --app-surface: var(--st-surface-default, #ffffff);
      --app-surface-raised: var(--st-card-background, #ffffff);
      --app-surface-inverse: var(--st-surface-inverse, #0f172a);
      --app-border: var(--st-border-subtle, #e2e8f0);
      --app-border-strong: var(--st-border-strong, #94a3b8);
      --app-text: var(--st-text-primary, #0f172a);
      --app-text-secondary: var(--st-text-secondary, #475569);
      --app-text-muted: var(--st-text-muted, #64748b);
      --app-link: var(--st-text-link, oklch(50% 0.134 242.749));
      --app-focus: var(--st-control-focus-ring, oklch(50% 0.134 242.749));
      --app-success: var(--st-feedback-success, #16a34a);
      --app-warning: var(--st-feedback-warning, #d97706);
      --app-error: var(--st-feedback-error, #dc2626);
      --app-info: var(--st-feedback-info, #2563eb);
      --app-category-tool: var(--st-data-category1, #4E79A7);
      --app-category-resource: var(--st-data-category4, #76B7B2);
      --app-category-prompt: var(--st-data-category5, #59A14F);
      --card-radius: var(--st-card-radius, 0.5rem);
      --button-radius: var(--st-button-radius, 0.375rem);
      --control-radius: var(--st-control-radius, 0.375rem);
      --control-height: var(--st-control-md-height, 2.5rem);
      --space-1: var(--st-spacing-1, 0.25rem);
      --space-2: var(--st-spacing-2, 0.5rem);
      --space-3: var(--st-spacing-3, 0.75rem);
      --space-4: var(--st-spacing-4, 1rem);
      --space-6: var(--st-spacing-6, 1.5rem);
      --space-8: var(--st-spacing-8, 2rem);
      --font-sans: var(--st-font-sans, Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      --font-mono: var(--st-font-mono, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace);
      --shadow-card: var(--st-card-shadow, 0 1px 2px rgb(15 23 42 / 0.08));
      --motion-fast: var(--st-motion-fast, 120ms);
      --motion-normal: var(--st-motion-normal, 180ms);
      --motion-easing: var(--st-motion-easing, cubic-bezier(0.4, 0, 0.2, 1));
    }

    * {
      box-sizing: border-box;
    }

    html {
      background: var(--app-background);
      color: var(--app-text);
      font-family: var(--font-sans);
      min-height: 100%;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: var(--app-background);
      color: var(--app-text);
    }

    button,
    input,
    select {
      font: inherit;
    }

    .icon-sprite {
      display: none;
    }

    .icon {
      width: 1rem;
      height: 1rem;
      flex: 0 0 auto;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
    }

    .app-shell {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: var(--st-z-header, 50);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-6);
      min-height: 4rem;
      padding: 0 var(--space-8);
      background: var(--app-surface);
      border-bottom: 1px solid var(--app-border);
      box-shadow: var(--shadow-card);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-width: 0;
    }

    .brand-mark {
      width: 2rem;
      height: 2rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--st-action-primary-text, #ffffff);
      background: var(--st-action-primary, oklch(50% 0.134 242.749));
      border-radius: var(--button-radius);
    }

    .brand-title {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
    }

    .brand-title strong {
      font-size: 1rem;
      line-height: 1.25;
      font-weight: 700;
      color: var(--app-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .brand-title span {
      font-size: 0.8125rem;
      line-height: 1.2;
      color: var(--app-text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .endpoint-group {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-2);
      min-width: 22rem;
    }

    .endpoint-control {
      min-width: 18rem;
      max-width: 28rem;
    }

    .content {
      width: min(100%, 1440px);
      margin: 0 auto;
      padding: var(--space-8);
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr);
      gap: var(--space-6);
      align-items: start;
    }

    .registry-panel,
    .console-panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      min-width: 0;
    }

    .card {
      background: var(--app-surface-raised);
      border: 1px solid var(--app-border);
      border-radius: var(--card-radius);
      box-shadow: var(--shadow-card);
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-4) var(--space-3);
      border-bottom: 1px solid var(--app-border);
    }

    .section-title {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
      color: var(--app-text);
      font-size: 0.875rem;
      font-weight: 700;
      line-height: 1.2;
    }

    .section-title span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .registry-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      max-height: 17.5rem;
      overflow: auto;
      padding: var(--space-3);
    }

    .registry-list::-webkit-scrollbar,
    pre::-webkit-scrollbar {
      width: 0.5rem;
      height: 0.5rem;
    }

    .registry-list::-webkit-scrollbar-thumb,
    pre::-webkit-scrollbar-thumb {
      background: var(--st-control-border, #e2e8f0);
      border-radius: var(--st-radius-pill, 999px);
    }

    .registry-item {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--space-2);
      align-items: center;
      min-height: 4rem;
      padding: var(--space-3);
      color: var(--app-text);
      text-align: left;
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: var(--control-radius);
      cursor: pointer;
      transition:
        border-color var(--motion-fast) var(--motion-easing),
        background var(--motion-fast) var(--motion-easing),
        box-shadow var(--motion-fast) var(--motion-easing);
    }

    .registry-item:hover {
      border-color: var(--st-control-hover-border, #94a3b8);
      background: var(--st-menu-item-hover-background, #f8fafc);
    }

    .registry-item:focus-visible,
    .btn:focus-visible,
    .control:focus-visible {
      outline: 3px solid color-mix(in srgb, var(--app-focus) 28%, transparent);
      outline-offset: 2px;
    }

    .registry-item.active {
      border-color: var(--st-border-interactive, oklch(50% 0.134 242.749));
      background: var(--st-side-nav-active-background, #f8fafc);
      box-shadow: inset 3px 0 0 var(--st-border-interactive, oklch(50% 0.134 242.749));
    }

    .item-main {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      min-width: 0;
    }

    .item-name {
      color: var(--app-text);
      font-size: 0.875rem;
      font-weight: 650;
      line-height: 1.25;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-meta {
      color: var(--app-text-secondary);
      font-size: 0.8125rem;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-uri {
      color: var(--app-link);
      font-family: var(--font-mono);
      font-size: 0.75rem;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      min-height: 1.5rem;
      padding: 0 var(--space-2);
      color: var(--app-text-secondary);
      background: var(--st-action-secondary, #f8fafc);
      border: 1px solid var(--app-border);
      border-radius: var(--st-radius-pill, 999px);
      font-size: 0.75rem;
      font-weight: 650;
      line-height: 1;
      white-space: nowrap;
    }

    .badge.status {
      color: var(--app-success);
      border-color: color-mix(in srgb, var(--app-success) 32%, var(--app-border));
      background: color-mix(in srgb, var(--app-success) 8%, var(--app-surface));
    }

    .badge.type-tool {
      color: var(--app-category-tool);
      border-color: color-mix(in srgb, var(--app-category-tool) 34%, var(--app-border));
      background: color-mix(in srgb, var(--app-category-tool) 9%, var(--app-surface));
    }

    .badge.type-resource {
      color: var(--app-category-resource);
      border-color: color-mix(in srgb, var(--app-category-resource) 34%, var(--app-border));
      background: color-mix(in srgb, var(--app-category-resource) 11%, var(--app-surface));
    }

    .badge.type-prompt {
      color: var(--app-category-prompt);
      border-color: color-mix(in srgb, var(--app-category-prompt) 34%, var(--app-border));
      background: color-mix(in srgb, var(--app-category-prompt) 10%, var(--app-surface));
    }

    .console-card {
      min-height: 42rem;
    }

    .console-body {
      display: grid;
      gap: var(--space-4);
      padding: var(--space-4);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--st-field-gap, 0.5rem);
      min-width: 0;
    }

    label,
    .label {
      color: var(--st-field-label-text, #0f172a);
      font-size: 0.75rem;
      font-weight: 700;
      line-height: 1.2;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .control {
      width: 100%;
      min-height: var(--control-height);
      padding: 0 var(--space-3);
      color: var(--st-control-text, #0f172a);
      background: var(--st-control-background, #ffffff);
      border: 1px solid var(--st-control-border, #e2e8f0);
      border-radius: var(--control-radius);
      transition:
        border-color var(--motion-fast) var(--motion-easing),
        box-shadow var(--motion-fast) var(--motion-easing);
    }

    .control::placeholder {
      color: var(--st-control-placeholder-text, #64748b);
    }

    .control:hover {
      border-color: var(--st-control-hover-border, #94a3b8);
    }

    .control:focus {
      border-color: var(--app-focus);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-focus) 18%, transparent);
      outline: none;
    }

    .params-panel {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-4);
      background: var(--st-empty-state-background, #f8fafc);
      border: 1px solid var(--st-empty-state-border, #e2e8f0);
      border-radius: var(--card-radius);
    }

    .params-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .fields-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-3);
    }

    .field-help {
      color: var(--st-field-help-text, #475569);
      font-size: 0.75rem;
      line-height: 1.35;
    }

    .required {
      color: var(--st-field-error-text, #dc2626);
    }

    .btn {
      min-height: var(--st-control-lg-height, 3rem);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: 0 var(--space-4);
      color: var(--st-button-primary-text, #ffffff);
      background: var(--st-button-primary-background, oklch(50% 0.134 242.749));
      border: 1px solid var(--st-button-primary-background, oklch(50% 0.134 242.749));
      border-radius: var(--button-radius);
      cursor: pointer;
      font-weight: 700;
      line-height: 1;
      transition:
        background var(--motion-fast) var(--motion-easing),
        border-color var(--motion-fast) var(--motion-easing),
        transform var(--motion-fast) var(--motion-easing);
    }

    .btn:hover {
      background: var(--st-color-blue-80, oklch(32% 0.11 242));
      border-color: var(--st-color-blue-80, oklch(32% 0.11 242));
    }

    .btn:active {
      transform: translateY(1px);
    }

    .btn:disabled {
      color: var(--st-control-disabled-text, #64748b);
      background: var(--st-control-disabled-background, #f8fafc);
      border-color: var(--st-control-border, #e2e8f0);
      cursor: not-allowed;
      transform: none;
    }

    .output-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-4);
    }

    .code-panel {
      display: grid;
      grid-template-rows: auto minmax(12rem, 1fr);
      min-width: 0;
      border: 1px solid var(--app-border);
      border-radius: var(--card-radius);
      overflow: hidden;
      background: var(--app-surface);
    }

    .code-header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 2.5rem;
      padding: 0 var(--space-3);
      color: var(--app-text-secondary);
      background: var(--st-data-table-header-background, #f8fafc);
      border-bottom: 1px solid var(--app-border);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    pre {
      margin: 0;
      min-height: 12rem;
      max-height: 22rem;
      overflow: auto;
      padding: var(--space-4);
      color: var(--st-graph-panel-text, #ffffff);
      background: var(--st-graph-panel-background, #0f172a);
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      line-height: 1.55;
    }

    .empty-state {
      display: grid;
      place-items: center;
      gap: var(--space-2);
      min-height: 5rem;
      padding: var(--space-4);
      color: var(--st-empty-state-message-text, #475569);
      background: var(--st-empty-state-background, #f8fafc);
      border: 1px dashed var(--st-empty-state-border, #e2e8f0);
      border-radius: var(--st-empty-state-radius, 0.5rem);
      text-align: center;
      font-size: 0.875rem;
    }

    .empty-state .icon {
      color: var(--app-text-muted);
    }

    @media (max-width: 1020px) {
      .topbar {
        align-items: stretch;
        flex-direction: column;
        padding: var(--space-4);
      }

      .endpoint-group {
        width: 100%;
        min-width: 0;
        justify-content: flex-start;
        flex-wrap: wrap;
      }

      .endpoint-control {
        min-width: min(100%, 18rem);
        flex: 1 1 18rem;
      }

      .content {
        padding: var(--space-4);
      }

      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .fields-grid,
      .output-grid {
        grid-template-columns: 1fr;
      }

      .registry-list {
        max-height: none;
      }
    }
  </style>
</head>
<body>
  ${renderIconSprite()}
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">${renderIcon("console")}</span>
        <div class="brand-title">
          <strong>${escapeHtml(info.name || "Sentropic MCP Console")}</strong>
          <span>${escapeHtml(info.description || "Model Context Protocol developer console")}</span>
        </div>
      </div>

      <div class="endpoint-group" aria-label="Server endpoint">
        <span class="badge status">${renderIcon("status")} Ready</span>
        <label class="label" for="server-url-input">Endpoint</label>
        <input class="control endpoint-control" type="text" id="server-url-input" value="" placeholder="http://localhost:3000/mcp">
        <span class="badge">v${escapeHtml(info.version)}</span>
        <span class="badge">Streamable HTTP</span>
      </div>
    </header>

    <main class="content">
      <div class="dashboard-grid">
        <aside class="registry-panel" aria-label="Registered MCP capabilities">
          ${renderRegistrySection("tool", "Tools", tools)}
          ${renderRegistrySection("resource", "Resources", resources)}
          ${renderRegistrySection("prompt", "Prompts", prompts)}
        </aside>

        <section class="console-panel" aria-label="Interactive JSON-RPC console">
          <div class="card console-card">
            <div class="section-header">
              <div class="section-title">
                ${renderIcon("console")}
                <span id="console-title">Interactive testing console</span>
              </div>
              <span class="badge type-${firstType}" id="type-badge">${firstType.toUpperCase()}</span>
            </div>

            <div class="console-body">
              <div class="field">
                <label for="item-select">Selected entity</label>
                <select id="item-select" class="control"></select>
              </div>

              <div class="params-panel" id="inputs-container">
                <div class="params-header">
                  <div class="section-title">
                    ${renderIcon("code")}
                    <span>Arguments and parameters</span>
                  </div>
                  <span class="badge" id="params-count">0 fields</span>
                </div>
                <div id="dynamic-fields" class="fields-grid"></div>
              </div>

              <button class="btn" id="execute-btn" type="button">
                ${renderIcon("send")}
                <span id="execute-label">Execute MCP JSON-RPC request</span>
              </button>

              <div class="output-grid">
                <div class="code-panel">
                  <div class="code-header">${renderIcon("code")} JSON-RPC request</div>
                  <pre><code id="request-payload">{}</code></pre>
                </div>
                <div class="code-panel">
                  <div class="code-header">${renderIcon("code")} JSON-RPC response</div>
                  <pre><code id="response-payload">{}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>

  <script>
    const registeredTools = ${toolsJson};
    const registeredResources = ${resourcesJson};
    const registeredPrompts = ${promptsJson};
    const registry = {
      tool: registeredTools,
      resource: registeredResources,
      prompt: registeredPrompts
    };

    let currentType = "${firstType}";
    let currentIndex = ${firstIndex};

    const selectors = {
      itemSelect: document.getElementById("item-select"),
      dynamicFields: document.getElementById("dynamic-fields"),
      paramsCount: document.getElementById("params-count"),
      consoleTitle: document.getElementById("console-title"),
      typeBadge: document.getElementById("type-badge"),
      requestPayload: document.getElementById("request-payload"),
      responsePayload: document.getElementById("response-payload"),
      executeBtn: document.getElementById("execute-btn"),
      executeLabel: document.getElementById("execute-label"),
      serverUrlInput: document.getElementById("server-url-input")
    };

    document.querySelectorAll(".registry-item").forEach((item) => {
      item.addEventListener("click", () => {
        selectItem(item.dataset.type, Number(item.dataset.index));
      });
    });

    selectors.itemSelect.addEventListener("change", () => {
      selectItem(currentType, Number(selectors.itemSelect.value));
    });

    selectors.dynamicFields.addEventListener("input", updateRequestPayload);
    selectors.executeBtn.addEventListener("click", executeRpcCall);

    window.addEventListener("load", () => {
      if (window.location.protocol.startsWith("http")) {
        selectors.serverUrlInput.value = window.location.origin + window.location.pathname;
      } else {
        selectors.serverUrlInput.value = "http://localhost:3000/mcp";
      }

      if (registeredTools.length > 0) {
        selectItem("tool", 0);
      } else if (registeredResources.length > 0) {
        selectItem("resource", 0);
      } else if (registeredPrompts.length > 0) {
        selectItem("prompt", 0);
      } else {
        renderNoSelection();
      }
    });

    function getItem(type, index) {
      return registry[type] && registry[type][index] ? registry[type][index] : null;
    }

    function getItemKey(type, item) {
      return type === "resource" ? item.uri : item.name;
    }

    function getItemLabel(type, item) {
      return type === "resource" ? item.name || item.uri : item.name;
    }

    function selectItem(type, index) {
      const item = getItem(type, index);
      if (!item) {
        renderNoSelection();
        return;
      }

      currentType = type;
      currentIndex = index;

      document.querySelectorAll(".registry-item").forEach((el) => {
        const active = el.dataset.type === type && Number(el.dataset.index) === index;
        el.classList.toggle("active", active);
        el.setAttribute("aria-pressed", active ? "true" : "false");
      });

      selectors.itemSelect.innerHTML = "";
      registry[type].forEach((optionItem, optionIndex) => {
        const option = document.createElement("option");
        option.value = String(optionIndex);
        option.textContent = getItemLabel(type, optionItem);
        option.selected = optionIndex === index;
        selectors.itemSelect.appendChild(option);
      });

      selectors.consoleTitle.textContent = "Test: " + getItemKey(type, item);
      selectors.typeBadge.textContent = type.toUpperCase();
      selectors.typeBadge.className = "badge type-" + type;
      generateFields(type, item);
    }

    function renderNoSelection() {
      selectors.itemSelect.innerHTML = "";
      selectors.consoleTitle.textContent = "Interactive testing console";
      selectors.typeBadge.textContent = "EMPTY";
      selectors.typeBadge.className = "badge";
      selectors.dynamicFields.innerHTML = emptyState("No tools, resources, or prompts are registered.");
      selectors.paramsCount.textContent = "0 fields";
      updateRequestPayload();
    }

    function generateFields(type, item) {
      selectors.dynamicFields.innerHTML = "";
      let fieldCount = 0;

      if (type === "tool") {
        const props = item.inputSchema && item.inputSchema.properties ? item.inputSchema.properties : null;
        const required = item.inputSchema && item.inputSchema.required ? item.inputSchema.required : [];

        if (props && Object.keys(props).length > 0) {
          Object.keys(props).forEach((key) => {
            selectors.dynamicFields.appendChild(createSchemaField(key, props[key], required.includes(key)));
            fieldCount += 1;
          });
        }
      } else if (type === "resource") {
        const uriParams = Array.from(getItemKey(type, item).matchAll(/\\{([^}]+)\\}/g)).map((match) => match[1]);
        uriParams.forEach((param) => {
          selectors.dynamicFields.appendChild(createTextField("param-" + param, param, true, "Value for URI pattern variable {" + param + "}"));
          fieldCount += 1;
        });
      } else if (type === "prompt") {
        const args = Array.isArray(item.arguments) ? item.arguments : [];
        args.forEach((arg) => {
          selectors.dynamicFields.appendChild(createTextField("input-arg-" + arg.name, arg.name, Boolean(arg.required), arg.description || ""));
          fieldCount += 1;
        });
      }

      if (fieldCount === 0) {
        const message =
          type === "tool"
            ? "This tool expects no arguments."
            : type === "resource"
              ? "This resource is a static URI and expects no parameters."
              : "This prompt expects no arguments.";
        selectors.dynamicFields.innerHTML = emptyState(message);
      }

      selectors.paramsCount.textContent = fieldCount === 1 ? "1 field" : fieldCount + " fields";
      updateRequestPayload();
    }

    function createSchemaField(key, prop, required) {
      if (prop.enum) {
        const group = createFieldShell(key, required, prop.description || "");
        const select = document.createElement("select");
        select.id = "input-" + key;
        select.className = "control";
        prop.enum.forEach((value) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          select.appendChild(option);
        });
        group.insertBefore(select, group.querySelector(".field-help"));
        return group;
      }

      const inputType = prop.type === "number" || prop.type === "integer" ? "number" : "text";
      const group = createTextField("input-" + key, key, required, prop.description || "", inputType);
      const input = group.querySelector("input");
      if (input && prop.default !== undefined) {
        input.value = prop.default;
      }
      return group;
    }

    function createTextField(id, labelText, required, helpText, inputType = "text") {
      const group = createFieldShell(labelText, required, helpText);
      const input = document.createElement("input");
      input.id = id;
      input.className = "control";
      input.type = inputType;
      input.placeholder = helpText || "";
      group.insertBefore(input, group.querySelector(".field-help"));
      return group;
    }

    function createFieldShell(labelText, required, helpText) {
      const group = document.createElement("div");
      group.className = "field";

      const label = document.createElement("label");
      label.textContent = labelText + (required ? " " : "");
      if (required) {
        const mark = document.createElement("span");
        mark.className = "required";
        mark.textContent = "*";
        label.appendChild(mark);
      }
      group.appendChild(label);

      const help = document.createElement("span");
      help.className = "field-help";
      help.textContent = helpText || "Optional value";
      group.appendChild(help);

      return group;
    }

    function emptyState(message) {
      return '<div class="empty-state"><svg class="icon icon-empty" aria-hidden="true"><use href="#icon-empty"></use></svg><span>' + escapeHtmlClient(message) + "</span></div>";
    }

    function updateRequestPayload() {
      selectors.requestPayload.textContent = JSON.stringify(buildRequestPayload(), null, 2);
    }

    function buildRequestPayload() {
      const item = getItem(currentType, currentIndex);
      if (!item) {
        return {};
      }

      let method = "";
      let params = {};

      if (currentType === "tool") {
        method = "tools/call";
        const props = item.inputSchema && item.inputSchema.properties ? item.inputSchema.properties : {};
        const args = {};

        Object.keys(props).forEach((key) => {
          const input = document.getElementById("input-" + key);
          if (input) {
            const rawValue = input.value;
            args[key] = props[key].type === "number" || props[key].type === "integer" ? Number(rawValue) : rawValue;
          }
        });

        params = { name: item.name, arguments: args };
      } else if (currentType === "resource") {
        method = "resources/read";
        let finalUri = item.uri;
        const uriParams = Array.from(item.uri.matchAll(/\\{([^}]+)\\}/g)).map((match) => match[1]);
        uriParams.forEach((param) => {
          const input = document.getElementById("param-" + param);
          if (input && input.value) {
            finalUri = finalUri.replace("{" + param + "}", input.value);
          }
        });
        params = { uri: finalUri };
      } else if (currentType === "prompt") {
        method = "prompts/get";
        const args = {};
        const promptArgs = Array.isArray(item.arguments) ? item.arguments : [];
        promptArgs.forEach((arg) => {
          const input = document.getElementById("input-arg-" + arg.name);
          if (input) {
            args[arg.name] = input.value;
          }
        });
        params = { name: item.name, arguments: args };
      }

      return {
        jsonrpc: "2.0",
        id: 1,
        method,
        params
      };
    }

    async function executeRpcCall() {
      const requestPayload = buildRequestPayload();
      selectors.requestPayload.textContent = JSON.stringify(requestPayload, null, 2);
      selectors.executeBtn.disabled = true;
      selectors.executeLabel.textContent = "Executing request";

      try {
        const response = await fetch(selectors.serverUrlInput.value || "", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(requestPayload)
        });

        const data = await response.json();
        selectors.responsePayload.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        selectors.responsePayload.textContent = JSON.stringify({
          jsonrpc: "2.0",
          id: requestPayload.id,
          error: {
            code: -32603,
            message: "HTTP execution failed: " + err.message
          }
        }, null, 2);
      } finally {
        selectors.executeBtn.disabled = false;
        selectors.executeLabel.textContent = "Execute MCP JSON-RPC request";
      }
    }

    function escapeHtmlClient(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
  </script>
</body>
</html>`;
}

function renderRegistrySection(
  type: "tool" | "resource" | "prompt",
  label: string,
  items: Array<ToolDefinition | ResourceDefinition | PromptDefinition>
): string {
  const emptyMessage = `No ${label.toLowerCase()} registered`;

  return `<section class="card">
    <div class="section-header">
      <div class="section-title">
        ${renderIcon(type)}
        <span>${label}</span>
      </div>
      <span class="badge">${items.length}</span>
    </div>
    <div class="registry-list" id="${type}s-list">
      ${
        items.length === 0
          ? `<div class="empty-state">${renderIcon("empty")}<span>${emptyMessage}</span></div>`
          : items.map((item, index) => renderRegistryItem(type, item, index)).join("")
      }
    </div>
  </section>`;
}

function renderRegistryItem(
  type: "tool" | "resource" | "prompt",
  item: ToolDefinition | ResourceDefinition | PromptDefinition,
  index: number
): string {
  const name = "uri" in item ? item.name : item.name;
  const meta = "uri" in item ? item.uri : item.description || "No description provided";
  const metaClass = "uri" in item ? "item-meta item-uri" : "item-meta";
  const active = type === "tool" && index === 0 ? " active" : "";

  return `<button class="registry-item${active}" type="button" data-type="${type}" data-index="${index}" aria-pressed="${active ? "true" : "false"}">
    <span class="item-main">
      <span class="item-name">${escapeHtml(name)}</span>
      <span class="${metaClass}">${escapeHtml(meta)}</span>
    </span>
    <span class="badge type-${type}">${type}</span>
  </button>`;
}

function renderIcon(name: string): string {
  return `<svg class="icon icon-${name}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
}

function renderIconSprite(): string {
  return `<svg class="icon-sprite" aria-hidden="true">
    <symbol id="icon-console" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="14" rx="2"></rect>
      <path d="M8 21h8"></path>
      <path d="M12 18v3"></path>
      <path d="m8 9 2 2-2 2"></path>
      <path d="M13 13h3"></path>
    </symbol>
    <symbol id="icon-tool" viewBox="0 0 24 24">
      <path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5L15 12l-3-3 2.7-2.7Z"></path>
    </symbol>
    <symbol id="icon-resource" viewBox="0 0 24 24">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
      <path d="m3.3 7 8.7 5 8.7-5"></path>
      <path d="M12 22V12"></path>
    </symbol>
    <symbol id="icon-prompt" viewBox="0 0 24 24">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"></path>
      <path d="M8 9h8"></path>
      <path d="M8 13h5"></path>
    </symbol>
    <symbol id="icon-send" viewBox="0 0 24 24">
      <path d="m22 2-7 20-4-9-9-4Z"></path>
      <path d="M22 2 11 13"></path>
    </symbol>
    <symbol id="icon-status" viewBox="0 0 24 24">
      <path d="M20 6 9 17l-5-5"></path>
    </symbol>
    <symbol id="icon-code" viewBox="0 0 24 24">
      <path d="m16 18 6-6-6-6"></path>
      <path d="m8 6-6 6 6 6"></path>
    </symbol>
    <symbol id="icon-empty" viewBox="0 0 24 24">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
      <path d="M8 12h8"></path>
    </symbol>
  </svg>`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
