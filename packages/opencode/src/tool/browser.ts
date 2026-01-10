import z from "zod"
import { Tool } from "./tool"
import DESCRIPTION from "./browser.txt"
import { Log } from "../util/log"
import { MCP } from "../mcp"
const log = Log.create({ service: "browser-tool" })
export const BrowserTool = Tool.define("browser", async (_ctx) => {
  return {
    description: DESCRIPTION + "\n\nNOTE: This tool provides guidance. Use MCP browser tools (puppeteer_* or playwright_*) directly for actual browser automation.",
    parameters: z.object({
      action: z
        .enum(["navigate", "screenshot", "click", "type", "waitFor", "evaluate", "getContent", "close"])
        .describe("The browser action to perform"),
      description: z
        .string()
        .describe(
          "Clear description of what this browser action is testing/validating",
        ),
    }),
    async execute(params: any, _ctx) {
      const { action, description } = params
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
            "Browser automation not available. To use browser tools:",
            "",
            "1. Install an MCP browser server:",
            "   npm install -g @modelcontextprotocol/server-puppeteer",
            "   or",
            "   npm install -g @playwright/mcp-server",
            "",
            "2. Add to your OpenCode config (~/.opencode/config.json):",
            '   "mcp": {',
            '     "puppeteer": {',
            '       "type": "local",',
            '       "command": "npx",',
            '       "args": ["-y", "@modelcontextprotocol/server-puppeteer"]',
            "     }",
            "   }",
            "",
            "3. Restart OpenCode",
            "",
            "Alternatively, test manually and report results.",
          ].join("\n")
          return {
            title: "Browser tool not configured",
            metadata: { action, description } as any,
            output,
          }
        }
        const [serverName] = browserServer
        log.info("MCP browser server available", { server: serverName, action, description })
        // Provide guidance on which MCP tool to use
        const mcpToolName = serverName.includes("puppeteer") 
          ? `puppeteer_${action}` 
          : action
        const output = [
          `✅ MCP browser server "${serverName}" is connected and ready.`,
          "",
          `To perform "${action}" (${description}):`,
          `Use the MCP tool: ${mcpToolName}`,
          "",
          "The MCP server provides direct browser automation capabilities.",
          "All browser actions, screenshots, and results are handled automatically by MCP tools.",
        ].join("\n")
        return {
          title: `Use MCP tool: ${mcpToolName}`,
          metadata: { action, description, mcpServer: serverName, mcpTool: mcpToolName } as any,
          output,
        }
      } catch (error: any) {
        log.error("browser tool error", { action, error: error.message })
        return {
          title: `Browser ${action} check failed`,
          metadata: { action, description, error: error.message } as any,
          output: `Failed to check browser availability: ${error.message}`,
        }
      }
    },
  }
})
