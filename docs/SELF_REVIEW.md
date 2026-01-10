# Self-Review Mode

OpenCode now includes a built-in self-review capability that allows AI agents to start applications, interact with them through browser automation, and validate implementations against requirements.

## Overview

The self-review feature consists of:

1. **Review Agent** - A specialized agent for validating implementations
2. **Browser Tool** - Automated browser interaction via MCP servers
3. **App Lifecycle Tool** - Start, stop, and monitor applications
4. **Review Skills** - Structured methodologies for different types of testing

## Quick Start

### 1. Set Up MCP Browser Server

First, install a browser automation MCP server:

```bash
npm install -g @modelcontextprotocol/server-puppeteer
```

Then add it to your OpenCode config (`~/.opencode/config.json`):

```json
{
  "mcp": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

### 2. Switch to Review Agent

In OpenCode, press `Tab` to cycle through agents until you reach the **review** agent.

### 3. Start a Review

Provide your requirements and ask the agent to review:

```
I have a web application in this directory. Here are the requirements:
[paste requirements or reference a requirements.md file]

Please review the implementation to verify it meets all requirements.
The dev server starts with: npm run dev
It runs on http://localhost:3000
```

The agent will:
- Start your application
- Wait for it to be ready
- Navigate and interact with it
- Take screenshots
- Compare against requirements
- Provide a detailed report

## Tools

### Browser Tool

Interact with web applications through browser automation:

```
browser action="navigate" url="http://localhost:3000" description="Load homepage"
browser action="waitFor" selector="#app" description="Wait for app to load"
browser action="screenshot" description="Capture initial state"
browser action="click" selector="button.submit" description="Click submit button"
browser action="type" selector="input[name='email']" text="test@example.com" description="Enter email"
browser action="evaluate" script="document.querySelector('.count').textContent" description="Get counter value"
```

**Actions:**
- `navigate` - Load a URL
- `screenshot` - Capture page or element
- `click` - Click an element
- `type` - Type into an input
- `waitFor` - Wait for element to appear
- `evaluate` - Execute JavaScript
- `getContent` - Extract text content
- `close` - Close browser

### App Lifecycle Tool

Manage application processes:

```
app_lifecycle action="start" name="webapp" command="npm run dev" waitFor="localhost:3000" description="Start web server"
app_lifecycle action="health_check" name="webapp" url="http://localhost:3000" description="Check if server is responding"
app_lifecycle action="get_logs" name="webapp" maxLines=50 description="View recent logs"
app_lifecycle action="stop" name="webapp" description="Stop the server"
```

**Actions:**
- `start` - Launch an application
- `stop` - Terminate an application
- `health_check` - Verify app is responding
- `get_logs` - Retrieve recent output
- `list` - Show all running apps

## Review Skills

Skills provide structured methodologies for different review types:

### Web Application Review

```
Load the skill: skill name="review/web-app"
```

This skill provides a comprehensive workflow for:
- Analyzing requirements
- Starting the application
- Systematic testing of all features
- Visual validation
- Interaction testing
- Edge case validation
- Structured reporting

### API Review

```
Load the skill: skill name="review/api"
```

For reviewing API implementations:
- Endpoint testing
- Request/response validation
- Authentication testing
- Error handling
- Integration testing

## Example Workflows

### Review a Web App

```
@review I need you to validate my todo app against the requirements in requirements.md.

The app starts with: npm run dev
It runs on: http://localhost:3000

Use the review/web-app skill to guide your testing.
```

### Review an API

```
@review Please verify my REST API matches the OpenAPI spec in api-spec.yaml.

Start the API with: python -m uvicorn main:app --reload
Base URL: http://localhost:8000

Use the review/api skill for systematic testing.
```

### Custom Review

```
@review I've implemented a new feature. Requirements:
1. Button should be blue (#0066cc)
2. Clicking it should show a success message
3. Message should fade out after 3 seconds

Start with: npm start
URL: http://localhost:3000
```

## Configuration

### Review Agent Permissions

The review agent has access to:
- `bash` - Run commands (start servers, etc.)
- `browser` - Browser automation
- `app_lifecycle` - Manage application processes
- `read` - Read files (requirements, code)
- `grep` - Search files
- `glob` - Find files
- `question` - Ask for clarification
- `skill` - Load review methodologies

### Customizing the Agent

Add to your `~/.opencode/config.json`:

```json
{
  "agent": {
    "review": {
      "model": "anthropic/claude-3-5-sonnet-20241022",
      "temperature": 0.1,
      "prompt": "Custom additional instructions...",
      "permission": {
        "write": "allow"  // If you want the agent to fix issues
      }
    }
  }
}
```

## Creating Custom Review Skills

Create a skill at `~/.opencode/skills/my-review/SKILL.md`:

```markdown
---
name: my-review
description: Custom review methodology for my specific needs
---

# My Custom Review Skill

## Workflow
1. [Your steps]
2. [More steps]

## Validation Checklist
- [ ] Item 1
- [ ] Item 2

## Reporting Template
[Your template]
```

## Tips

### Effective Requirements

Write clear, testable requirements:

```markdown
❌ Bad: "The UI should look nice"
✅ Good: "The header should be #1a1a1a background with 16px padding"

❌ Bad: "Forms should work"
✅ Good: "Submitting the contact form with valid data should show a success message"
```

### Iterative Testing

The review agent works best with specific, focused requests:

```
First, verify the homepage loads correctly and displays all required sections.
```

Then:

```
Now test the login flow: invalid credentials should show an error, valid credentials should redirect to /dashboard.
```

### Screenshot Analysis

Screenshots are saved to `.opencode/truncated/` - reference them in your reports.

### Debugging

If the application doesn't start:

```
app_lifecycle action="get_logs" name="myapp" maxLines=100
```

If browser interactions fail:

```
browser action="screenshot" description="Current page state"
browser action="evaluate" script="document.body.innerHTML" description="Full page HTML"
```

## Limitations

- Browser automation requires MCP server setup
- Applications must expose HTTP endpoints for health checks
- Screenshots are static (no video recording yet)
- Browser runs in headless mode (no visual debugging)

## Troubleshooting

### Browser Tool Not Available

```
Error: Browser automation not available
```

**Solution:** Install and configure MCP browser server (see Quick Start)

### Application Won't Start

**Check logs:**
```
app_lifecycle action="get_logs" name="myapp"
```

**Common issues:**
- Wrong command or directory
- Port already in use
- Missing dependencies

### Elements Not Found

**Solutions:**
- Use `waitFor` before interacting with dynamic elements
- Check selector with `evaluate`: `document.querySelector('your-selector')`
- Take a screenshot to see current page state

## Advanced Usage

### Parallel Testing

Test multiple scenarios simultaneously:

```
Run these tests in parallel:
1. Test homepage layout
2. Test about page content
3. Test contact form validation
```

### Continuous Integration

Use review agent in CI/CD:

```bash
#!/bin/bash
# ci-review.sh
opencode --agent review --message "Review the app against requirements.md. Start with: npm run dev"
```

### Visual Regression

Compare screenshots across runs:

```
Take a screenshot of the homepage and save it as homepage-baseline.png
[Make changes]
Take another screenshot and compare it to the baseline
```

## Contributing

To extend the self-review capability:

1. **Add new browser actions** - Edit `packages/opencode/src/tool/browser.ts`
2. **Add app lifecycle features** - Edit `packages/opencode/src/tool/applifecycle.ts`
3. **Create review skills** - Add to `~/.opencode/skills/review/`
4. **Enhance the agent** - Edit `packages/opencode/src/agent/prompt/review.txt`

## Future Enhancements

Planned features:
- [ ] Video recording of test sessions
- [ ] Visual regression testing with image diffs
- [ ] Mobile device emulation
- [ ] Accessibility testing integration
- [ ] Performance measurement
- [ ] Cross-browser testing
- [ ] Integration with testing frameworks (Cypress, Playwright)

## Feedback

Found issues or have suggestions? Please open an issue on GitHub or discuss in Discord.

