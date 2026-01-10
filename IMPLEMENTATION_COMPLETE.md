# Self-Review Implementation Complete! 🎉

## What's Been Built

I've successfully implemented a complete self-review capability into OpenCode core. Here's what was added:

### 1. Review Agent (`packages/opencode/src/agent/`)
- **New agent type**: `review` - specialized for validating implementations
- **Permissions**: Can use bash, browser, app_lifecycle, read, grep, glob, question, and skill tools
- **System prompt**: Comprehensive instructions for systematic testing and reporting (`agent/prompt/review.txt`)

### 2. Browser Tool (`packages/opencode/src/tool/browser.ts`)
- Detects if MCP browser servers (Puppeteer/Playwright) are configured
- Provides setup instructions if not available
- Guides agents to use MCP tools directly for browser automation
- Supports: navigate, screenshot, click, type, waitFor, evaluate, getContent, close

### 3. App Lifecycle Tool (`packages/opencode/src/tool/applifecycle.ts`)
- **Start applications**: Launches dev servers with output capture
- **Monitor**: Health checks, log retrieval, process listing
- **Stop**: Graceful shutdown with cleanup
- **Session-based**: Each session manages its own processes

###  4. Review Skills (`~/.opencode/skills/review/`)
- **Web App Review** (`web-app/SKILL.md`): Complete methodology for web application testing
- **API Review** (`api/SKILL.md`): Systematic API endpoint validation

### 5. Documentation (`docs/SELF_REVIEW.md`)
- Comprehensive guide with examples
- Setup instructions
- Troubleshooting tips
- Workflow patterns

## How to Use

### Quick Start

1. **Set up MCP browser server** (one-time setup):
   ```bash
   npm install -g @modelcontextprotocol/server-puppeteer
   ```

2. **Configure OpenCode** (`~/.opencode/config.json`):
   ```json
   {
     "mcp": {
       "puppeteer": {
         "type": "local",
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
       }
     }
   }
   ```

3. **Start a review**:
   ```
   Press Tab to switch to "review" agent
   
   "I have a web app in this directory. Requirements are in requirements.md.
   Please review the implementation.
   Start with: npm run dev
   URL: http://localhost:3000"
   ```

### Example Session

```
User: @review Please validate my todo app.

Requirements:
1. Homepage shows "My Todos" header
2. Can add todos via input form
3. Todos display in a list
4. Can mark todos complete

Start command: npm start
URL: http://localhost:3000

Agent will:
1. ✅ Start app with app_lifecycle
2. ✅ Wait for server ready
3. ✅ Navigate to URL with MCP puppeteer_navigate
4. ✅ Take screenshots with MCP puppeteer_screenshot
5. ✅ Test interactions with MCP puppeteer_click, puppeteer_type
6. ✅ Compare against requirements
7. ✅ Generate comprehensive report
```

## Architecture Benefits

### Why This Approach?

1. **Core Integration** - First-class feature, not a plugin
   - Works out of the box
   - Consistent with other agents
   - Unified permissions and configuration

2. **Leverages MCP** - Doesn't reinvent the wheel
   - Uses battle-tested browser automation
   - Can swap Puppeteer/Playwright/others
   - Community ecosystem of MCP servers

3. **Extensible** - Multiple extension points
   - Custom skills for specific domains
   - Plugin hooks for advanced features
   - Agent customization via config

4. **Skill-Based** - Structured methodologies
   - Consistent review processes
   - Knowledge sharing (SKILL.md files)
   - Community contributions

## What's Different from Original Plan

The browser tool is simpler than initially designed - it acts as a **guide** that:
- Detects available MCP servers
- Tells the agent which MCP tool to use
- Provides setup instructions if needed

This is actually better because:
- MCP tools already handle all browser operations perfectly
- No need to duplicate/wrap MCP functionality
- Agents can use MCP tools directly (more power, less abstraction)
- Simpler code, fewer bugs

## Next Steps

### For Testing

1. **Build OpenCode**:
   ```bash
   cd packages/opencode
   bun run build
   ```

2. **Run OpenCode**:
   ```bash
   ./dist/opencode-<platform>/bin/opencode
   ```

3. **Create a test app** and requirements file

4. **Switch to review agent** (Tab key)

5. **Ask for review**

### For Enhancement

Future improvements could include:
- Visual regression testing (compare screenshots)
- Accessibility testing integration
- Performance measurement tools
- Mobile device emulation
- Video recording of sessions
- Integration with test frameworks

## File Changes Summary

### New Files
- `packages/opencode/src/agent/prompt/review.txt`
- `packages/opencode/src/tool/browser.ts`
- `packages/opencode/src/tool/browser.txt`
- `packages/opencode/src/tool/applifecycle.ts`
- `packages/opencode/src/tool/applifecycle.txt`
- `~/.opencode/skills/review/web-app/SKILL.md`
- `~/.opencode/skills/review/api/SKILL.md`
- `docs/SELF_REVIEW.md`

### Modified Files
- `packages/opencode/src/agent/agent.ts` - Added review agent
- `packages/opencode/src/tool/registry.ts` - Added new tools

### Type Safety
✅ All TypeScript errors resolved
✅ Proper Tool.Info interface compliance
✅ Clean compilation

## Example Workflows

### Web App Review
```
@review My React app needs validation.

Requirements in: ./docs/requirements.md
Start: npm run dev  
URL: http://localhost:3000

Load skill: review/web-app for structured testing
```

### API Review
```
@review Validate my REST API.

OpenAPI spec: ./api-spec.yaml
Start: uvicorn main:app
Base URL: http://localhost:8000

Load skill: review/api for endpoint testing
```

### Custom Review
```
@review Check if the login button is blue (#0066cc) and clicking it shows a success message.

Start: npm start
URL: http://localhost:3000/login
```

## Success Criteria ✅

- [x] Review agent implemented and registered
- [x] Browser tool guides to MCP servers
- [x] App lifecycle tool manages processes
- [x] Review skills provide methodologies
- [x] Documentation complete
- [x] TypeScript compilation clean
- [x] Architecture leverages existing MCP infrastructure
- [x] Extensible through skills and plugins

## Ready to Test!

The self-review feature is now fully integrated into OpenCode. Build and test it out!

```bash
cd packages/opencode
bun run build
# Then test with your own apps!
```

Happy reviewing! 🚀

