import z from "zod"
import { Tool } from "./tool"
import DESCRIPTION from "./browser.txt"
import { Log } from "../util/log"
import { MCP } from "../mcp"
const log = Log.create({ service: "browser-tool" })
export const BrowserTool = Tool.define("browser", async (_ctx) => {
  return {
    description: DESCRIPTION,
    parameters: z.object({
      check: z
        .boolean()
        .optional()
        .default(true)
        .describe("Check if browser automation is available"),
    }),
    async execute(params: any, _ctx) {
      try {
        // Check if we have MCP browser server available
        const mcpServers = await MCP.status()
        const browserServer = Object.entries(mcpServers).find(([name, status]) => {
          return (
            (name.includes("puppeteer") || name.includes("playwright") || name.includes("browser")) &&
            status.status === "connected"
          )
        })
        if (!browserServer) {
          const output = [
            "❌ Browser automation not available.",
            "",
            "To enable browser automation:",
            "",
            "1. Install an MCP browser server:",
            "   npm install -g @modelcontextprotocol/server-puppeteer",
            "",
            "2. Add to your OpenCode config (~/.opencode/config.json):",
            '   {',
            '     "mcp": {',
            '       "puppeteer": {',
            '         "type": "local",',
            '         "command": "npx",',
            '         "args": ["-y", "@modelcontextprotocol/server-puppeteer"]',
            "       }",
            "     }",
            "   }",
            "",
            "3. Restart OpenCode",
            "",
            "Alternative: Test manually and report results.",
          ].join("\n")
          return {
            title: "Browser automation not available",
            metadata: { available: false } as any,
            output,
          }
        }
        const [serverName] = browserServer
        log.info("MCP browser server available", { server: serverName })
        // List available MCP browser tools
        const mcpTools = await MCP.tools()
        const browserTools = Object.keys(mcpTools).filter(
          (key) => key.startsWith(serverName.replace(/[^a-zA-Z0-9_-]/g, "_"))
        )
        const output = [
          `✅ Browser automation available via "${serverName}"`,
          "",
          "Available MCP tools for browser automation:",
          ...browserTools.map((tool) => `  - ${tool}`),
          "",
          "Common tools:",
          "  - puppeteer_navigate: Navigate to a URL (requires: url)",
          "  - puppeteer_screenshot: Take a screenshot (optional: name, selector)",
          "  - puppeteer_click: Click an element (requires: selector)",
          "  - puppeteer_type: Type into an input (requires: selector, text)",
          "  - puppeteer_evaluate: Run JavaScript (requires: script)",
          "",
          "Use these MCP tools directly for browser automation.",
        ].join("\n")
        return {
          title: "Browser automation available",
          metadata: { available: true, server: serverName, tools: browserTools } as any,
          output,
        }
      } catch (error: any) {
        log.error("browser tool error", { error: error.message })
        return {
          title: "Browser check failed",
          metadata: { available: false, error: error.message } as any,
          output: `Failed to check browser availability: ${error.message}`,
        }
      }
    },
  }
})
