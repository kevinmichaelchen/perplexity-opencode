# perplexity-opencode

OpenCode plugin for Perplexity AI web search integration.

This plugin automatically detects when you're asking for web searches or research and nudges the OpenCode agent to use the Perplexity MCP server.

## Features

- **Automatic detection**: Recognizes search-related keywords in your messages
- **Smart nudging**: Guides the agent to use Perplexity for web searches
- **Recency hints**: Suggests appropriate time filters for different query types
- **Citation support**: Encourages including sources in responses

## Prerequisites

1. **Perplexity API Key**: Get one from [Perplexity Settings](https://www.perplexity.ai/settings/api)
2. **perplexity-mcp**: The MCP server that provides the actual search functionality

## Installation

### Quick Install

```bash
bunx perplexity-opencode@latest install
```

This will:
1. Prompt for your Perplexity API key
2. Create `~/.config/opencode/perplexity.json` with your config
3. Add the plugin to `~/.config/opencode/opencode.json`
4. Configure the Perplexity MCP server
5. Add usage instructions to `~/.config/opencode/AGENTS.md`

### Non-Interactive Install

```bash
bunx perplexity-opencode@latest install --no-tui --api-key pplx-xxx
```

### Manual Installation

1. Install the MCP server:
   ```bash
   uv tool install perplexity-mcp
   ```

2. Add to `~/.config/opencode/opencode.json`:
   ```json
   {
     "plugin": ["perplexity-opencode@latest"],
     "mcp": {
       "perplexity": {
         "type": "stdio",
         "command": "uv",
         "args": ["run", "perplexity-mcp"],
         "env": {
           "PERPLEXITY_API_KEY": "pplx-xxx"
         }
       }
     }
   }
   ```

3. Create `~/.config/opencode/perplexity.json`:
   ```json
   {
     "apiKey": "pplx-xxx",
     "keywords": {
       "enabled": true
     }
   }
   ```

4. Restart OpenCode

## Configuration

### Config File (`~/.config/opencode/perplexity.json`)

```json
{
  "apiKey": "pplx-xxx",
  "keywords": {
    "enabled": true,
    "customPatterns": [
      "\\bmy-custom-trigger\\b"
    ]
  }
}
```

### Environment Variables

- `PERPLEXITY_API_KEY`: Your Perplexity API key
- `PERPLEXITY_DEBUG`: Set to `true` for debug logging

## Trigger Keywords

The plugin activates when it detects phrases like:

**Search triggers:**
- "search the web", "look up", "find information"
- "what is the latest", "recent news", "current events"
- "who is", "when did", "where is", "how much"
- "compare", "alternatives to", "vs"
- "perplexity", "ask perplexity"

**Research triggers (for deeper analysis):**
- "deep dive", "comprehensive research"
- "thorough investigation", "in-depth analysis"
- "detailed research", "detailed report"

## How It Works

1. **Message interception**: The plugin hooks into OpenCode's `chat.message` event
2. **Keyword detection**: Scans your message for search-related patterns
3. **Nudge injection**: Adds a synthetic hint message guiding the agent to use Perplexity
4. **Agent action**: The OpenCode agent sees the hint and uses the `perplexity_search_web` tool

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Type check
bun run typecheck

# Clean
bun run clean
```

## License

MIT
