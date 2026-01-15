const DEBUG = process.env.PERPLEXITY_DEBUG === "true";

export function debug(...args: unknown[]): void {
  if (DEBUG) {
    console.log("[perplexity-opencode]", ...args);
  }
}

export function info(...args: unknown[]): void {
  console.log("[perplexity-opencode]", ...args);
}

export function warn(...args: unknown[]): void {
  console.warn("[perplexity-opencode]", ...args);
}

export function error(...args: unknown[]): void {
  console.error("[perplexity-opencode]", ...args);
}
