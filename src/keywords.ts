import { config } from "./config.js";

export type KeywordMatch = {
  type: "search" | "research";
  matchedText: string;
};

// Patterns that trigger Perplexity web search
const SEARCH_PATTERNS = [
  // Direct search requests
  /\bsearch\s+(the\s+)?(web|internet|online)\b/i,
  /\bweb\s+search\b/i,
  /\blook\s+up\b/i,
  /\bfind\s+(me\s+)?(information|info|details)\s+(about|on|for)\b/i,
  /\bwhat('s|\s+is)\s+(the\s+)?(latest|current|recent)\b/i,

  // Research-oriented
  /\bresearch\b/i,
  /\binvestigate\b/i,
  /\bfind\s+out\b/i,

  // News and current events
  /\b(latest|recent|current)\s+(news|updates|developments)\b/i,
  /\bwhat('s|\s+is)\s+happening\b/i,
  /\bbreaking\s+news\b/i,

  // Documentation and reference
  /\bfind\s+(the\s+)?docs?\b/i,
  /\bdocumentation\s+for\b/i,
  /\bhow\s+do\s+(I|you|we)\b/i,
  /\bwhat\s+is\s+the\s+best\s+way\b/i,

  // Factual queries
  /\bwho\s+(is|was|are|were)\b/i,
  /\bwhen\s+(did|was|is|will)\b/i,
  /\bwhere\s+(is|are|can|do)\b/i,
  /\bhow\s+(much|many|long|far)\b/i,

  // Comparison and alternatives
  /\bcompare\b/i,
  /\balternatives?\s+to\b/i,
  /\bvs\.?\b/i,
  /\bversus\b/i,

  // Perplexity-specific triggers
  /\bperplexity\b/i,
  /\bask\s+perplexity\b/i,
  /\buse\s+perplexity\b/i,
];

// More specific research patterns (deeper analysis)
const RESEARCH_PATTERNS = [
  /\bdeep\s+(dive|research|analysis)\b/i,
  /\bcomprehensive\s+(search|research|analysis)\b/i,
  /\bthorough(ly)?\s+(research|investigate|search)\b/i,
  /\bin[- ]depth\s+(research|analysis)\b/i,
  /\bdetailed\s+(research|analysis|report)\b/i,
];

function removeCodeBlocks(text: string): string {
  // Remove fenced code blocks
  let result = text.replace(/```[\s\S]*?```/g, "");
  // Remove inline code
  result = result.replace(/`[^`]+`/g, "");
  return result;
}

function compileCustomPatterns(): RegExp[] {
  const customPatterns = config.keywords?.customPatterns ?? [];
  return customPatterns
    .map((pattern) => {
      try {
        return new RegExp(pattern, "i");
      } catch {
        console.warn(`Invalid custom keyword pattern: ${pattern}`);
        return null;
      }
    })
    .filter((p): p is RegExp => p !== null);
}

export function detectKeywords(message: string): KeywordMatch | null {
  if (!config.keywords?.enabled) {
    return null;
  }

  const cleanedMessage = removeCodeBlocks(message);
  const customPatterns = compileCustomPatterns();

  // Check research patterns first (more specific)
  for (const pattern of RESEARCH_PATTERNS) {
    const match = cleanedMessage.match(pattern);
    if (match) {
      return { type: "research", matchedText: match[0] };
    }
  }

  // Check custom patterns
  for (const pattern of customPatterns) {
    const match = cleanedMessage.match(pattern);
    if (match) {
      return { type: "search", matchedText: match[0] };
    }
  }

  // Check search patterns
  for (const pattern of SEARCH_PATTERNS) {
    const match = cleanedMessage.match(pattern);
    if (match) {
      return { type: "search", matchedText: match[0] };
    }
  }

  return null;
}

export function getSearchNudge(): string {
  return `<perplexity-hint>
The user's message suggests they want to search the web for information.

You have access to the Perplexity MCP server with the following tool:
- **perplexity_search_web**: Search the web using Perplexity AI
  - Parameters:
    - query (required): The search query
    - recency (optional): Filter by "day", "week", "month", or "year"

Use this tool to find current, accurate information from the web. Perplexity provides AI-powered search with citations.

Example usage:
- For recent news: use recency="day" or recency="week"
- For general information: use recency="month" (default)
- For historical context: use recency="year"
</perplexity-hint>`;
}

export function getResearchNudge(): string {
  return `<perplexity-hint>
The user wants comprehensive research on a topic.

You have access to the Perplexity MCP server with the **perplexity_search_web** tool.

For in-depth research:
1. Break the topic into multiple focused queries
2. Use different recency filters to get both recent and historical context
3. Cross-reference information from multiple searches
4. Synthesize findings into a comprehensive response with citations

The Perplexity API returns results with citations - always include these in your response to support your findings.
</perplexity-hint>`;
}
