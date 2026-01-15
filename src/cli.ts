#!/usr/bin/env node
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import * as readline from "node:readline";

const OPENCODE_CONFIG_DIR = join(homedir(), ".config", "opencode");
const PERPLEXITY_CONFIG_PATH = join(OPENCODE_CONFIG_DIR, "perplexity.json");
const AGENTS_MD_PATH = join(OPENCODE_CONFIG_DIR, "AGENTS.md");
const PLUGIN_NAME = "perplexity-opencode@latest";

const PERPLEXITY_AGENTS_INSTRUCTIONS = `
---
name: perplexity
description: Use Perplexity MCP server for web search and research. Invoke when needing to search the web for current information, news, documentation, or factual queries.
---

# How to use Perplexity

Perplexity provides AI-powered web search with citations. Use it when you need up-to-date information from the web.

## When to Use Perplexity

- **Current events and news**: Latest updates, breaking news, recent developments
- **Factual queries**: Who, what, when, where, how questions
- **Documentation lookups**: Finding official docs, API references, guides
- **Comparisons**: Comparing technologies, products, alternatives
- **Research**: Investigating topics, gathering information

## Available Tool

### perplexity_search_web

Search the web using Perplexity AI.

**Parameters:**
- \`query\` (required): The search query
- \`recency\` (optional): Filter by time period
  - \`day\`: Last 24 hours
  - \`week\`: Last 7 days
  - \`month\`: Last 30 days (default)
  - \`year\`: Last year

**Example Usage:**

\`\`\`
// For recent news
perplexity_search_web(query="latest TypeScript 5.4 features", recency="week")

// For general information
perplexity_search_web(query="best practices for React error boundaries")

// For historical context
perplexity_search_web(query="history of JavaScript frameworks", recency="year")
\`\`\`

## Best Practices

1. **Be specific**: Use clear, focused queries for better results
2. **Use recency filters**: Match the filter to your needs
   - Breaking news: \`day\`
   - Recent developments: \`week\`
   - General info: \`month\`
   - Historical: \`year\`
3. **Include citations**: Perplexity returns sources - always cite them in your responses
4. **Multiple queries**: For comprehensive research, use multiple targeted searches
5. **Cross-reference**: For important facts, verify across multiple queries
`;

function stripJsoncComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function confirm(rl: readline.Interface, question: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(`${question} (y/n) `, (answer) => {
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function findOpencodeConfig(): string | null {
  const candidates = [
    join(OPENCODE_CONFIG_DIR, "opencode.jsonc"),
    join(OPENCODE_CONFIG_DIR, "opencode.json"),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

function addPluginToConfig(configPath: string): boolean {
  try {
    const content = readFileSync(configPath, "utf-8");

    if (content.includes("perplexity-opencode")) {
      console.log("  Plugin already registered in config");
      return true;
    }

    const jsonContent = stripJsoncComments(content);
    let config: Record<string, unknown>;

    try {
      config = JSON.parse(jsonContent);
    } catch {
      console.error("  Failed to parse config file");
      return false;
    }

    const plugins = (config.plugin as string[]) || [];
    plugins.push(PLUGIN_NAME);
    config.plugin = plugins;

    if (configPath.endsWith(".jsonc")) {
      if (content.includes('"plugin"')) {
        const newContent = content.replace(
          /("plugin"\s*:\s*\[)([^\]]*?)(\])/,
          (_match, start, middle, end) => {
            const trimmed = middle.trim();
            if (trimmed === "") {
              return `${start}\n    "${PLUGIN_NAME}"\n  ${end}`;
            }
            return `${start}${middle.trimEnd()},\n    "${PLUGIN_NAME}"\n  ${end}`;
          }
        );
        writeFileSync(configPath, newContent);
      } else {
        const newContent = content.replace(
          /^(\s*\{)/,
          `$1\n  "plugin": ["${PLUGIN_NAME}"],`
        );
        writeFileSync(configPath, newContent);
      }
    } else {
      writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    console.log(`  Added plugin to ${configPath}`);
    return true;
  } catch (err) {
    console.error("  Failed to update config:", err);
    return false;
  }
}

function addMcpServerToConfig(configPath: string, apiKey: string): boolean {
  try {
    const content = readFileSync(configPath, "utf-8");
    const jsonContent = stripJsoncComments(content);
    let config: Record<string, unknown>;

    try {
      config = JSON.parse(jsonContent);
    } catch {
      console.error("  Failed to parse config file");
      return false;
    }

    const mcp = (config.mcp as Record<string, unknown>) || {};

    if (mcp.perplexity) {
      console.log("  MCP server 'perplexity' already configured");
      return true;
    }

    // Perplexity uses local transport with uv
    mcp.perplexity = {
      type: "local",
      command: ["uv", "tool", "run", "perplexity-mcp"],
      environment: {
        PERPLEXITY_API_KEY: apiKey,
      },
    };

    config.mcp = mcp;

    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("  Added MCP server 'perplexity' to config");
    return true;
  } catch (err) {
    console.error("  Failed to add MCP server:", err);
    return false;
  }
}

function createNewConfig(apiKey: string): boolean {
  mkdirSync(OPENCODE_CONFIG_DIR, { recursive: true });

  const configPath = join(OPENCODE_CONFIG_DIR, "opencode.json");
  const config = {
    plugin: [PLUGIN_NAME],
    mcp: {
      perplexity: {
        type: "local",
        command: ["uv", "tool", "run", "perplexity-mcp"],
        environment: {
          PERPLEXITY_API_KEY: apiKey,
        },
      },
    },
  };

  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`  Created ${configPath}`);
  return true;
}

function createPerplexityConfig(apiKey: string): boolean {
  mkdirSync(OPENCODE_CONFIG_DIR, { recursive: true });

  const config = {
    apiKey,
    keywords: {
      enabled: true,
    },
  };

  writeFileSync(PERPLEXITY_CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`  Created ${PERPLEXITY_CONFIG_PATH}`);
  return true;
}

function updateAgentsMd(): boolean {
  mkdirSync(OPENCODE_CONFIG_DIR, { recursive: true });

  try {
    if (existsSync(AGENTS_MD_PATH)) {
      const content = readFileSync(AGENTS_MD_PATH, "utf-8");

      if (content.includes("# How to use Perplexity")) {
        console.log("  Perplexity instructions already in AGENTS.md");
        return true;
      }

      const newContent = content.trimEnd() + "\n\n" + PERPLEXITY_AGENTS_INSTRUCTIONS.trim() + "\n";
      writeFileSync(AGENTS_MD_PATH, newContent);
      console.log("  Appended Perplexity instructions to AGENTS.md");
    } else {
      writeFileSync(AGENTS_MD_PATH, PERPLEXITY_AGENTS_INSTRUCTIONS.trim() + "\n");
      console.log(`  Created ${AGENTS_MD_PATH} with Perplexity instructions`);
    }
    return true;
  } catch (err) {
    console.error("  Failed to update AGENTS.md:", err);
    return false;
  }
}

interface InstallOptions {
  tui: boolean;
  apiKey?: string;
}

async function install(options: InstallOptions): Promise<number> {
  console.log("\n Perplexity OpenCode Plugin Installer\n");

  const rl = options.tui ? createReadline() : null;

  // Step 1: Get API key
  console.log("Step 1: Configure API Key");
  let apiKey = options.apiKey || process.env.PERPLEXITY_API_KEY || "";

  if (!apiKey && options.tui && rl) {
    console.log("Get your API key from: https://www.perplexity.ai/settings/api");
    apiKey = await prompt(rl, "Enter your Perplexity API key (pplx-...): ");
  }

  if (!apiKey) {
    console.log("  No API key provided. You can set PERPLEXITY_API_KEY environment variable later.");
    console.log("  Get your API key at: https://www.perplexity.ai/settings/api\n");
  } else if (!apiKey.startsWith("pplx-")) {
    console.log("  Warning: API key should start with 'pplx-'");
  } else {
    console.log("  API key configured");
  }

  // Step 2: Create Perplexity config file
  console.log("\nStep 2: Create Perplexity Config");
  if (apiKey) {
    createPerplexityConfig(apiKey);
  } else {
    console.log("  Skipped (no API key)");
  }

  // Step 3: Register plugin and MCP server in OpenCode config
  console.log("\nStep 3: Configure OpenCode");
  const configPath = findOpencodeConfig();

  if (configPath) {
    if (options.tui && rl) {
      const shouldModify = await confirm(rl, `Modify ${configPath}?`);
      if (shouldModify) {
        addPluginToConfig(configPath);
        if (apiKey) {
          addMcpServerToConfig(configPath, apiKey);
        }
      } else {
        console.log("  Skipped.");
      }
    } else {
      addPluginToConfig(configPath);
      if (apiKey) {
        addMcpServerToConfig(configPath, apiKey);
      }
    }
  } else {
    if (options.tui && rl) {
      const shouldCreate = await confirm(rl, "No OpenCode config found. Create one?");
      if (shouldCreate && apiKey) {
        createNewConfig(apiKey);
      } else {
        console.log("  Skipped.");
      }
    } else if (apiKey) {
      createNewConfig(apiKey);
    }
  }

  // Step 4: Add Perplexity instructions to AGENTS.md
  console.log("\nStep 4: Add Perplexity Instructions to AGENTS.md");
  if (options.tui && rl) {
    const shouldUpdate = await confirm(rl, "Add Perplexity usage instructions to ~/.config/opencode/AGENTS.md?");
    if (shouldUpdate) {
      updateAgentsMd();
    } else {
      console.log("  Skipped.");
    }
  } else {
    updateAgentsMd();
  }

  // Step 5: Install perplexity-mcp
  console.log("\nStep 5: Install Perplexity MCP Server");
  console.log("  The plugin requires the perplexity-mcp server for actual web search.");
  console.log("  Installation options:");
  console.log("");
  console.log("  1. Install globally (recommended):");
  console.log("     uv tool install perplexity-mcp");
  console.log("");
  console.log("  2. Add to your project:");
  console.log("     uv add perplexity-mcp");
  console.log("");
  console.log("  Prerequisite: uv must be installed");
  console.log("     curl -LsSf https://astral.sh/uv/install.sh | sh");
  console.log("     or: brew install uv");
  console.log("");
  console.log("  For more installation methods, see:");
  console.log("  https://github.com/kevinmichaelchen/perplexity-mcp#installation");

  // Summary
  console.log("\n" + "-".repeat(50));
  console.log("\n Setup Complete!\n");

  if (!apiKey) {
    console.log("Next steps:");
    console.log("1. Get your API key from: https://www.perplexity.ai/settings/api");
    console.log("2. Set the environment variable:");
    console.log('   export PERPLEXITY_API_KEY="pplx-..."');
    console.log("   Or edit ~/.config/opencode/perplexity.json");
    console.log("3. Install the MCP server (see Step 5 above)");
  } else {
    console.log("Perplexity plugin is configured!");
    console.log("");
    console.log("IMPORTANT: The plugin requires the MCP server to function.");
    console.log("Install it using one of the commands shown in Step 5 above.");
    console.log("Without it, the plugin will be registered but won't work.");
  }

  console.log("\nKeyword triggers enabled:");
  console.log('  - "search the web...", "look up...", "find information..."');
  console.log('  - "what is the latest...", "recent news..."');
  console.log('  - "research...", "investigate..."');
  console.log('  - "compare...", "alternatives to..."');

  console.log("\nRestart OpenCode to activate the plugin.\n");

  if (rl) rl.close();
  return 0;
}

function printHelp(): void {
  console.log(`
perplexity-opencode - Perplexity AI web search plugin for OpenCode

Commands:
  install                Install and configure the plugin
    --no-tui             Non-interactive mode
    --api-key <key>      Provide API key directly

Examples:
  bunx perplexity-opencode@latest install
  bunx perplexity-opencode@latest install --no-tui --api-key pplx-xxx
`);
}

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "help" || args[0] === "--help" || args[0] === "-h") {
  printHelp();
  process.exit(0);
}

if (args[0] === "install") {
  const noTui = args.includes("--no-tui");
  const apiKeyIndex = args.indexOf("--api-key");
  const apiKey = apiKeyIndex !== -1 ? args[apiKeyIndex + 1] : undefined;

  install({ tui: !noTui, apiKey }).then((code) => process.exit(code));
} else {
  console.error(`Unknown command: ${args[0]}`);
  printHelp();
  process.exit(1);
}
