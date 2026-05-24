import type { McpHonoOptions, ToolDefinition, ResourceDefinition, PromptDefinition } from "./types.js";
import { foundation, semantic, component, toCssVariables } from "@sentropic/design-system-tokens";

/**
 * Returns a beautiful, highly polished, and premium dark-mode HTML playground.
 * Exposes registered tools, resources, and prompts, and features an interactive
 * testing console that performs live HTTP POST JSON-RPC requests.
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sentropic MCP-Hono Developer Console</title>
  <!-- Google Fonts: Outfit for sleek typography, Fira Code for code blocks -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  
  <style>
    ${foundationCss}
    ${semanticCss}
    ${componentCss}

    :root {
      --bg-color: var(--st-surface-subtle, #f8fafc);
      --card-bg: var(--st-surface-raised, #ffffff);
      --glass-border: var(--st-border-subtle, #e2e8f0);
      --glow-purple: rgba(37, 99, 235, 0.05);
      --text-main: var(--st-text-primary, #0f172a);
      --text-muted: var(--st-text-secondary, #475569);
      --primary: var(--st-action-primary, oklch(50% 0.134 242.749));
      --primary-hover: var(--st-color-blue-80, oklch(32% 0.11 242));
      --accent-cyan: var(--st-color-cyan-50, oklch(70.4% 0.14 182.503));
      --accent-green: var(--st-color-feedback-success, #16a34a);
      --accent-red: var(--st-color-feedback-error, #dc2626);
      --font-outfit: var(--st-font-sans, 'Inter', sans-serif);
      --font-code: var(--st-font-mono, monospace);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-color);
      color: var(--text-main);
      font-family: var(--font-outfit);
      min-height: 100vh;
      overflow-x: hidden;
      position: relative;
    }

    /* Ambient Space Background Glows (Disabled for brand parity) */
    body::before, body::after {
      display: none;
    }

    .app-container {
      position: relative;
      z-index: 1;
      max-width: 1440px;
      margin: 0 auto;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Header Styling - Aligned with Design System Contract */
    header {
      position: sticky;
      top: 0;
      z-index: var(--st-z-header, 50);
      background: var(--st-surface-default, #ffffff);
      border-bottom: 1px solid var(--st-border-subtle, #e2e8f0);
      border-radius: 0;
      padding: 0 2rem;
      height: 56px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: var(--st-shadow-subtle, 0 1px 2px rgb(15 23 42 / 0.08));
      animation: fadeInDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .title-group h1 {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--st-text-primary, #0f172a);
      letter-spacing: -0.2px;
    }

    .title-group p {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .server-badge {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .badge {
      background: var(--st-color-slate-10, #f8fafc);
      border: 1px solid var(--st-border-subtle, #e2e8f0);
      color: var(--text-muted);
      padding: 0.35rem 0.75rem;
      border-radius: var(--st-radius-pill, 999px);
      font-size: 0.8rem;
      font-weight: 600;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      background-color: var(--accent-green);
      border-radius: 50%;
      box-shadow: 0 0 6px var(--accent-green);
      animation: pulse 2s infinite;
    }

    /* Layout Split */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 2rem;
      animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
    }

    /* Left Sidebar: Registry */
    .registry-panel {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .card {
      background: var(--st-surface-raised, #ffffff);
      border: 1px solid var(--st-border-subtle, #e2e8f0);
      border-radius: var(--st-radius-lg, 0.5rem);
      padding: 1.5rem;
      box-shadow: var(--st-shadow-subtle, 0 1px 2px rgb(15 23 42 / 0.08));
    }

    .panel-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--st-text-primary, #0f172a);
      border-bottom: 1px solid var(--st-border-subtle, #e2e8f0);
      padding-bottom: 0.75rem;
    }

    .count-tag {
      font-size: 0.75rem;
      background: var(--st-color-slate-10, #f8fafc);
      border: 1px solid var(--st-border-subtle, #e2e8f0);
      color: var(--text-muted);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      color: var(--text-muted);
    }

    .registry-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 300px;
      overflow-y: auto;
      padding-right: 4px;
    }

    /* Custom Scrollbars */
    .registry-list::-webkit-scrollbar,
    .log-viewport::-webkit-scrollbar {
      width: 6px;
    }
    .registry-list::-webkit-scrollbar-thumb,
    .log-viewport::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 99px;
    }

    .registry-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 0.85rem 1rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    .registry-item:hover {
      background: var(--st-surface-subtle, #f8fafc);
      border-color: var(--st-border-strong, #94a3b8);
      transform: translateX(4px);
    }

    .registry-item.active {
      background: rgba(37, 99, 235, 0.06);
      border-color: var(--primary);
      box-shadow: var(--st-shadow-subtle, 0 1px 2px rgb(15 23 42 / 0.08));
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .item-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--st-text-primary, #0f172a);
    }

    .item-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-uri {
      font-family: var(--font-code);
      font-size: 0.75rem;
      color: var(--primary);
    }

    /* Right Main Console */
    .console-panel {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .interactive-card {
      min-height: 480px;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* Form Inputs */
    .console-form {
      display: grid;
      gap: 1.25rem;
      margin-top: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .custom-select, .custom-input {
      background: var(--st-surface-default, #ffffff);
      border: 1px solid var(--st-border-subtle, #e2e8f0);
      color: var(--st-text-primary, #0f172a);
      font-family: var(--font-outfit);
      font-size: 0.95rem;
      padding: 0.85rem 1rem;
      border-radius: var(--st-radius-md, 0.375rem);
      outline: none;
      transition: all 0.2s;
      width: 100%;
    }

    .custom-select:focus, .custom-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }

    .btn {
      background: var(--primary);
      color: #fff;
      font-family: var(--font-outfit);
      font-size: 1rem;
      font-weight: 600;
      border: none;
      border-radius: var(--st-radius-md, 0.375rem);
      padding: 1rem 2rem;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: var(--st-shadow-subtle, 0 1px 2px rgb(15 23 42 / 0.08));
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn:hover {
      transform: translateY(-1px);
      box-shadow: var(--st-shadow-medium, 0 8px 24px rgb(15 23 42 / 0.12));
      background: var(--primary-hover);
    }

    .btn:active {
      transform: translateY(0);
    }

    .btn:disabled {
      background: var(--st-surface-subtle, #f8fafc);
      color: var(--text-muted);
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }

    /* Output Visualizer */
    .output-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-top: 1.5rem;
      flex-grow: 1;
    }

    .code-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      height: 100%;
    }

    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .code-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    pre {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 1rem;
      font-family: var(--font-code);
      font-size: 0.85rem;
      color: #e5e7eb;
      overflow: auto;
      max-height: 280px;
      flex-grow: 1;
    }

    /* Interactive Live Playground Area */
    .playground-area {
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed var(--glass-border);
      border-radius: 16px;
      padding: 1.5rem;
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .interactive-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .field-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* Dynamic Toast / Status Notification */
    .status-panel {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #34d399;
      border-radius: 12px;
      font-size: 0.9rem;
      animation: fadeIn 0.4s ease;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      color: var(--text-muted);
      gap: 1rem;
    }

    .empty-state svg {
      width: 48px;
      height: 48px;
      stroke: var(--glass-border);
    }

    /* Keyframe Animations */
    @keyframes pulse {
      0% {
        transform: scale(0.9);
        opacity: 0.5;
      }
      50% {
        transform: scale(1.2);
        opacity: 1;
        box-shadow: 0 0 12px var(--accent-green);
      }
      100% {
        transform: scale(0.9);
        opacity: 0.5;
      }
    }

    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <header>
    <div class="brand-section">
      <div class="title-group">
        <span style="font-weight: 700; font-size: 1.1rem; color: var(--st-text-primary, #0f172a); letter-spacing: -0.2px;">Sentropic MCP Console</span>
      </div>
    </div>
    <div class="server-badge">
      <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--st-color-slate-10, #f8fafc); border: 1px solid var(--st-border-subtle, #e2e8f0); padding: 0.25rem 0.6rem; border-radius: 8px;">
        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; letter-spacing: 0.5px;">ENDPOINT:</span>
        <input type="text" id="server-url-input" style="background: transparent; border: none; color: var(--text-main); font-family: var(--font-code); font-size: 0.75rem; width: 220px; outline: none; border-bottom: 1px solid transparent; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='transparent'" value="" placeholder="http://localhost:3000/mcp">
      </div>
      <div class="status-dot"></div>
      <span class="badge" style="background: var(--st-color-slate-10, #f8fafc); border-color: var(--st-border-subtle, #e2e8f0); color: var(--text-muted);">v${info.version}</span>
      <span class="badge" style="background: rgba(37, 99, 235, 0.08); border-color: rgba(37, 99, 235, 0.2); color: var(--primary);">Streamable HTTP</span>
    </div>
  </header>

  <div class="app-container">

    <!-- Main Dashboard Split -->
    <div class="dashboard-grid">
      
      <!-- Sidebars: Tools, Resources, Prompts Lists -->
      <div class="registry-panel">
        
        <!-- Tools Section -->
        <div class="card">
          <div class="panel-title">
            <span>🛠️ Tools</span>
            <span class="count-tag">${tools.length}</span>
          </div>
          <div class="registry-list" id="tools-list">
            ${tools.length === 0 ? '<div class="item-desc">No tools registered</div>' : ''}
            ${tools.map((t, index) => `
              <div class="registry-item ${index === 0 ? 'active' : ''}" onclick="selectItem('tool', '${t.name}')">
                <div class="item-header">
                  <span class="item-name">${t.name}</span>
                </div>
                <div class="item-desc">${t.description || 'No description provided'}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Resources Section -->
        <div class="card">
          <div class="panel-title">
            <span>📦 Resources</span>
            <span class="count-tag">${resources.length}</span>
          </div>
          <div class="registry-list" id="resources-list">
            ${resources.length === 0 ? '<div class="item-desc" style="padding: 10px 0;">No resources registered</div>' : ''}
            ${resources.map(r => `
              <div class="registry-item" onclick="selectItem('resource', '${r.uri}')">
                <div class="item-header">
                  <span class="item-name">${r.name}</span>
                </div>
                <div class="item-uri">${r.uri}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Prompts Section -->
        <div class="card">
          <div class="panel-title">
            <span>📝 Prompts</span>
            <span class="count-tag">${prompts.length}</span>
          </div>
          <div class="registry-list" id="prompts-list">
            ${prompts.length === 0 ? '<div class="item-desc" style="padding: 10px 0;">No prompts registered</div>' : ''}
            ${prompts.map(p => `
              <div class="registry-item" onclick="selectItem('prompt', '${p.name}')">
                <div class="item-header">
                  <span class="item-name">${p.name}</span>
                </div>
                <div class="item-desc">${p.description || 'No description provided'}</div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

      <!-- Main Interactive Testing Console -->
      <div class="console-panel">
        
        <div class="card interactive-card">
          <div class="panel-title">
            <span id="console-title">Interactive Testing Console</span>
            <span class="badge" id="type-badge" style="background: rgba(13, 148, 136, 0.15); color: #2dd4bf; border-color: rgba(13, 148, 136, 0.3)">TOOL</span>
          </div>

          <!-- Dynamic Form Inputs -->
          <div class="console-form">
            <div class="form-group">
              <label for="item-select">Selected Entity</label>
              <select id="item-select" class="custom-select" onchange="onSelectDropdownChange()">
                <!-- Populated dynamically -->
              </select>
            </div>

            <!-- Dynamic Fields Generator -->
            <div class="playground-area" id="inputs-container">
              <div class="code-title" style="margin-bottom: 8px;">Arguments & Parameters</div>
              <div id="dynamic-fields" class="interactive-fields">
                <!-- Fields populated here -->
              </div>
            </div>

            <button class="btn" id="execute-btn" onclick="executeRpcCall()">
              <span>⚡ Execute MCP JSON-RPC Request</span>
            </button>
          </div>

          <!-- Output Display -->
          <div class="output-grid">
            
            <div class="code-container">
              <div class="code-header">
                <span class="code-title">JSON-RPC Request</span>
              </div>
              <pre><code id="request-payload">{}</code></pre>
            </div>

            <div class="code-container">
              <div class="code-header">
                <span class="code-title">JSON-RPC Response</span>
              </div>
              <pre><code id="response-payload">{}</code></pre>
            </div>

          </div>

        </div>

      </div>

    </div>

  </div>

  <script>
    // Injected Data from Server
    const registeredTools = ${toolsJson};
    const registeredResources = ${resourcesJson};
    const registeredPrompts = ${promptsJson};

    let currentType = 'tool';
    let currentName = '';

    window.addEventListener('load', () => {
      // Set initial item
      if (registeredTools.length > 0) {
        selectItem('tool', registeredTools[0].name);
      } else if (registeredResources.length > 0) {
        selectItem('resource', registeredResources[0].uri);
      } else if (registeredPrompts.length > 0) {
        selectItem('prompt', registeredPrompts[0].name);
      }
    });

    function selectItem(type, name) {
      currentType = type;
      currentName = name;

      // Update sidebar visual selections
      document.querySelectorAll('.registry-item').forEach(el => el.classList.remove('active'));
      const items = document.querySelectorAll('.registry-item');
      for (const el of items) {
        if (el.querySelector('.item-name').innerText === name || el.querySelector('.item-uri')?.innerText === name) {
          el.classList.add('active');
          break;
        }
      }

      // Populate Selector Dropdown
      const selector = document.getElementById('item-select');
      selector.innerHTML = '';
      
      const targetList = type === 'tool' ? registeredTools : type === 'resource' ? registeredResources : registeredPrompts;
      const keyField = type === 'resource' ? 'uri' : 'name';
      
      targetList.forEach(item => {
        const option = document.createElement('option');
        option.value = item[keyField];
        option.text = item.name || item[keyField];
        if (item[keyField] === name) {
          option.selected = true;
        }
        selector.appendChild(option);
      });

      // Update Console Headers
      document.getElementById('console-title').innerText = \`Test: \${name}\`;
      const typeBadge = document.getElementById('type-badge');
      typeBadge.innerText = type.toUpperCase();
      
      if (type === 'tool') {
        typeBadge.style.background = 'rgba(139, 92, 246, 0.15)';
        typeBadge.style.color = '#a78bfa';
        typeBadge.style.borderColor = 'rgba(139, 92, 246, 0.3)';
      } else if (type === 'resource') {
        typeBadge.style.background = 'rgba(6, 182, 212, 0.15)';
        typeBadge.style.color = '#22d3ee';
        typeBadge.style.borderColor = 'rgba(6, 182, 212, 0.3)';
      } else {
        typeBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        typeBadge.style.color = '#34d399';
        typeBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      }

      // Generate Dynamic Input Fields
      generateFields(type, name);
    }

    function onSelectDropdownChange() {
      const selector = document.getElementById('item-select');
      selectItem(currentType, selector.value);
    }

    function generateFields(type, name) {
      const container = document.getElementById('dynamic-fields');
      container.innerHTML = '';
      
      if (type === 'tool') {
        const tool = registeredTools.find(t => t.name === name);
        if (tool && tool.inputSchema && tool.inputSchema.properties) {
          const props = tool.inputSchema.properties;
          const required = tool.inputSchema.required || [];

          Object.keys(props).forEach(key => {
            const prop = props[key];
            const isReq = required.includes(key);

            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            const label = document.createElement('label');
            label.innerHTML = \`\${key} \${isReq ? '<span style="color:var(--accent-red)">*</span>' : ''}\`;
            formGroup.appendChild(label);

            let input;
            if (prop.enum) {
              input = document.createElement('select');
              input.className = 'custom-select';
              prop.enum.forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                opt.text = val;
                input.appendChild(opt);
              });
            } else {
              input = document.createElement('input');
              input.type = prop.type === 'number' ? 'number' : 'text';
              input.className = 'custom-input';
              input.placeholder = prop.description || '';
              if (prop.default !== undefined) {
                input.value = prop.default;
              }
            }
            input.id = \`input-\${key}\`;
            formGroup.appendChild(input);

            if (prop.description) {
              const desc = document.createElement('span');
              desc.className = 'field-desc';
              desc.innerText = prop.description;
              formGroup.appendChild(desc);
            }

            container.appendChild(formGroup);
          });
        } else {
          container.innerHTML = '<div style="color:var(--text-muted)">This tool expects no arguments.</div>';
        }
      } else if (type === 'resource') {
        // Resources don't take dynamic args standard, but may match URI parameters.
        const uriParams = [...name.matchAll(/\\{([^}]+)\\}/g)].map(m => m[1]);
        if (uriParams.length > 0) {
          uriParams.forEach(param => {
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            const label = document.createElement('label');
            label.innerHTML = \`\${param} <span style="color:var(--accent-red)">*</span>\`;
            formGroup.appendChild(label);

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'custom-input';
            input.id = \`param-\${param}\`;
            input.placeholder = \`Value for URI pattern variable {\${param}}\`;
            formGroup.appendChild(input);

            container.appendChild(formGroup);
          });
        } else {
          container.innerHTML = '<div style="color:var(--text-muted)">This resource is a static URI and expects no parameters.</div>';
        }
      } else if (type === 'prompt') {
        const prompt = registeredPrompts.find(p => p.name === name);
        if (prompt && prompt.arguments && prompt.arguments.length > 0) {
          prompt.arguments.forEach(arg => {
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            const label = document.createElement('label');
            label.innerHTML = \`\${arg.name} \${arg.required ? '<span style="color:var(--accent-red)">*</span>' : ''}\`;
            formGroup.appendChild(label);

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'custom-input';
            input.id = \`input-\&arg-\${arg.name}\`;
            input.placeholder = arg.description || '';
            formGroup.appendChild(input);

            if (arg.description) {
              const desc = document.createElement('span');
              desc.className = 'field-desc';
              desc.innerText = arg.description;
              formGroup.appendChild(desc);
            }

            container.appendChild(formGroup);
          });
        } else {
          container.innerHTML = '<div style="color:var(--text-muted)">This prompt expects no arguments.</div>';
        }
      }
      
      // Update RPC request display
      updateRequestPayload();
    }

    function updateRequestPayload() {
      const requestPayload = buildRequestPayload();
      document.getElementById('request-payload').innerText = JSON.stringify(requestPayload, null, 2);
    }

    function buildRequestPayload() {
      const id = 1;
      let method = '';
      let params = {};

      if (currentType === 'tool') {
        method = 'tools/call';
        const tool = registeredTools.find(t => t.name === currentName);
        let args = {};
        
        if (tool && tool.inputSchema && tool.inputSchema.properties) {
          Object.keys(tool.inputSchema.properties).forEach(key => {
            const input = document.getElementById(\`input-\${key}\`);
            if (input) {
              let val = input.value;
              if (tool.inputSchema.properties[key].type === 'number') {
                val = Number(val);
              }
              args[key] = val;
            }
          });
        }
        params = { name: currentName, arguments: args };
      } else if (currentType === 'resource') {
        method = 'resources/read';
        let finalUri = currentName;
        const uriParams = [...currentName.matchAll(/\\{([^}]+)\\}/g)].map(m => m[1]);
        uriParams.forEach(param => {
          const input = document.getElementById(\`param-\${param}\`);
          if (input && input.value) {
            finalUri = finalUri.replace(\`{\${param}}\`, input.value);
          }
        });
        params = { uri: finalUri };
      } else if (currentType === 'prompt') {
        method = 'prompts/get';
        const prompt = registeredPrompts.find(p => p.name === currentName);
        let args = {};
        if (prompt && prompt.arguments) {
          prompt.arguments.forEach(arg => {
            const input = document.getElementById(\`input-\&arg-\${arg.name}\`);
            if (input) {
              args[arg.name] = input.value;
            }
          });
        }
        params = { name: currentName, arguments: args };
      }

      return {
        jsonrpc: '2.0',
        id,
        method,
        params
      };
    }

    // Attach keyup event listeners to input fields to update payload live
    document.getElementById('dynamic-fields').addEventListener('input', () => {
      updateRequestPayload();
    });

    async function executeRpcCall() {
      const requestPayload = buildRequestPayload();
      document.getElementById('request-payload').innerText = JSON.stringify(requestPayload, null, 2);
      
      const executeBtn = document.getElementById('execute-btn');
      executeBtn.disabled = true;
      executeBtn.innerText = 'Executing Request...';

      const serverUrl = document.getElementById('server-url-input').value || '';

      try {
        const response = await fetch(serverUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestPayload)
        });
        
        const data = await response.json();
        document.getElementById('response-payload').innerText = JSON.stringify(data, null, 2);
      } catch (err) {
        document.getElementById('response-payload').innerText = JSON.stringify({
          jsonrpc: '2.0',
          id: requestPayload.id,
          error: {
            code: -32603,
            message: \`HTTP Execution Failed: \${err.message}\`
          }
        }, null, 2);
      } finally {
        executeBtn.disabled = false;
        executeBtn.innerText = '⚡ Execute MCP JSON-RPC Request';
      }
    }

    // Auto-detect and populate server endpoint URL at load time
    const serverUrlInput = document.getElementById('server-url-input');
    if (serverUrlInput) {
      if (window.location.protocol.startsWith('http')) {
        serverUrlInput.value = window.location.origin + window.location.pathname;
      } else {
        serverUrlInput.value = 'http://localhost:3000/mcp';
      }
    }
  </script>
</body>
</html>`;
}
