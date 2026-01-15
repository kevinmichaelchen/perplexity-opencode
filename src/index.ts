import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import type { Part } from "@opencode-ai/sdk";

import { isConfigured } from "./config.js";
import {
  detectKeywords,
  getSearchNudge,
  getResearchNudge,
} from "./keywords.js";
import { debug } from "./services/logger.js";

export const PerplexityPlugin: Plugin = async (ctx: PluginInput) => {
  const { directory } = ctx;

  debug("Plugin initialized", { directory, configured: isConfigured() });

  if (!isConfigured()) {
    debug("Plugin disabled - PERPLEXITY_API_KEY not set");
  }

  return {
    "chat.message": async (input, output) => {
      if (!isConfigured()) return;

      const start = Date.now();

      try {
        const textParts = output.parts.filter(
          (p): p is Part & { type: "text"; text: string } => p.type === "text"
        );

        if (textParts.length === 0) {
          debug("chat.message: no text parts found");
          return;
        }

        const userMessage = textParts.map((p) => p.text).join("\n");

        if (!userMessage.trim()) {
          debug("chat.message: empty message, skipping");
          return;
        }

        debug("chat.message: processing", {
          messagePreview: userMessage.slice(0, 100),
          partsCount: output.parts.length,
        });

        const match = detectKeywords(userMessage);

        if (match) {
          const nudgeText =
            match.type === "research" ? getResearchNudge() : getSearchNudge();
          debug(`chat.message: ${match.type} keyword detected`, {
            matchedText: match.matchedText,
          });

          const nudgePart: Part = {
            id: `perplexity-${match.type}-nudge-${Date.now()}`,
            sessionID: input.sessionID,
            messageID: output.message.id,
            type: "text",
            text: nudgeText,
            synthetic: true,
          };

          output.parts.push(nudgePart);

          const duration = Date.now() - start;
          debug(`chat.message: ${match.type} nudge injected`, {
            duration,
            matchedText: match.matchedText,
          });
        }
      } catch (error) {
        debug("chat.message: ERROR", { error: String(error) });
      }
    },
  };
};

export default PerplexityPlugin;
