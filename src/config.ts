import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface PerplexityConfig {
  apiKey: string;
  mcpUrl?: string;
  model?: string;
  keywords?: {
    enabled?: boolean;
    customPatterns?: string[];
  };
}

const CONFIG_DIR = join(homedir(), ".config", "opencode");
const CONFIG_FILE = "perplexity.json";
const CONFIG_FILE_JSONC = "perplexity.jsonc";

function stripJsonComments(jsonString: string): string {
  // Remove single-line comments
  let result = jsonString.replace(/\/\/.*$/gm, "");
  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");
  return result;
}

function loadConfigFile(): Partial<PerplexityConfig> {
  const jsonPath = join(CONFIG_DIR, CONFIG_FILE);
  const jsoncPath = join(CONFIG_DIR, CONFIG_FILE_JSONC);

  let configPath: string | null = null;
  if (existsSync(jsonPath)) {
    configPath = jsonPath;
  } else if (existsSync(jsoncPath)) {
    configPath = jsoncPath;
  }

  if (!configPath) {
    return {};
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const stripped = stripJsonComments(content);
    return JSON.parse(stripped);
  } catch (error) {
    console.error(`Error reading Perplexity config from ${configPath}:`, error);
    return {};
  }
}

function loadConfig(): PerplexityConfig {
  const fileConfig = loadConfigFile();

  const apiKey =
    fileConfig.apiKey || process.env.PERPLEXITY_API_KEY || "";

  const mcpUrl =
    fileConfig.mcpUrl ||
    process.env.PERPLEXITY_MCP_URL ||
    "stdio://perplexity-mcp";

  const model =
    fileConfig.model || process.env.PERPLEXITY_MODEL || "sonar";

  const keywords = {
    enabled: fileConfig.keywords?.enabled ?? true,
    customPatterns: fileConfig.keywords?.customPatterns ?? [],
  };

  return {
    apiKey,
    mcpUrl,
    model,
    keywords,
  };
}

export const config = loadConfig();

export function isConfigured(): boolean {
  return !!config.apiKey;
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigFilePath(): string {
  return join(CONFIG_DIR, CONFIG_FILE);
}
