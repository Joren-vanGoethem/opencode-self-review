import z from "zod"
import { Tool } from "./tool"
import DESCRIPTION from "./applifecycle.txt"
import { Log } from "../util/log"
import { Instance } from "../project/instance"
import { spawn, type ChildProcess } from "child_process"
import { setTimeout as sleep } from "timers/promises"

const log = Log.create({ service: "applifecycle-tool" })

interface AppProcess {
  name: string
  process: ChildProcess
  command: string
  workdir: string
  output: string[]
  startTime: number
  ready: boolean
}

// Store running processes per session
const sessionProcesses = new Map<string, Map<string, AppProcess>>()

function getSessionProcesses(sessionID: string): Map<string, AppProcess> {
  if (!sessionProcesses.has(sessionID)) {
    sessionProcesses.set(sessionID, new Map())
  }
  return sessionProcesses.get(sessionID)!
}

export const AppLifecycleTool = Tool.define("app_lifecycle", async () => {
  return {
    description: DESCRIPTION,
    parameters: z.object({
      action: z
        .enum(["start", "stop", "health_check", "get_logs", "list"])
        .describe("The lifecycle action to perform"),
      name: z
        .string()
        .optional()
        .describe("Unique name for this application instance (required for start, stop, health_check, get_logs)"),
      command: z
        .string()
        .optional()
        .describe("Command to execute (required for start action, e.g., 'npm run dev')"),
      workdir: z
        .string()
        .optional()
        .describe("Working directory to run command in (defaults to project directory)"),
      waitFor: z
        .string()
        .optional()
        .describe(
          "String to watch for in output that indicates app is ready (e.g., 'Server listening', 'localhost:3000')",
        ),
      waitTimeout: z
        .number()
        .optional()
        .default(30000)
        .describe("Timeout in milliseconds to wait for ready signal"),
      url: z
        .string()
        .optional()
        .describe("URL to check for health_check action (e.g., 'http://localhost:3000')"),
      maxLines: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum number of log lines to return (for get_logs action)"),
      description: z
        .string()
        .describe("Clear description of what this application is and why you're managing it"),
    }),
    async execute(params, ctx) {
      const { action, description } = params
      const processes = getSessionProcesses(ctx.sessionID)

      try {
        switch (action) {
          case "start": {
            if (params.name == null || !params.command) {
              throw new Error("name and command are required for start action")
            }

            // Check if already running
            if (processes.has(params.name)) {
              throw new Error(
                `Application '${params.name}' is already running. Stop it first or use a different name.`,
              )
            }

            const workdir = params.workdir || Instance.directory

            log.info("starting application", {
              name: params.name,
              command: params.command,
              workdir,
              description,
            })

            // Parse command (simple approach - split on spaces, handle quotes later if needed)
            const parts = params.command.match(/(?:[^\s"]+|"[^"]*")+/g) || []
            const cmd = parts[0]
            if (!cmd) {
              throw new Error(`Invalid command format: ${params.command}`)
            }

            const args = parts.slice(1).map((arg) => arg.replace(/^"|"$/g, ""))

            const proc = spawn(cmd, args, {
              cwd: workdir,
              shell: true,
              stdio: ["ignore", "pipe", "pipe"],
              detached: false,
            })

            const appProcess: AppProcess = {
              name: params.name,
              process: proc,
              command: params.command,
              workdir,
              output: [],
              startTime: Date.now(),
              ready: false,
            }

            // Capture output
            proc.stdout?.on("data", (data) => {
              const text = data.toString()
              appProcess.output.push(...text.split("\n"))
              // Keep only recent output to prevent memory issues
              if (appProcess.output.length > 1000) {
                appProcess.output = appProcess.output.slice(-1000)
              }

              // Check if ready
              if (params.waitFor && text.includes(params.waitFor)) {
                appProcess.ready = true
              }
            })

            proc.stderr?.on("data", (data) => {
              const text = data.toString()
              appProcess.output.push(...text.split("\n"))
              if (appProcess.output.length > 1000) {
                appProcess.output = appProcess.output.slice(-1000)
              }
            })

            proc.on("error", (error) => {
              log.error("application process error", { name: params.name, error })
              appProcess.output.push(`ERROR: ${error.message}`)
            })

            proc.on("exit", (code, signal) => {
              log.info("application process exited", { name: params.name, code, signal })
              appProcess.output.push(`Process exited with code ${code}, signal ${signal}`)
              processes.delete(params.name!)
            })

            processes.set(params.name, appProcess)

            // Wait for ready signal if specified
            if (params.waitFor) {
              const startWait = Date.now()
              while (!appProcess.ready && Date.now() - startWait < params.waitTimeout) {
                if (proc.exitCode !== null) {
                  const logs = appProcess.output.slice(-20).join("\n")
                  throw new Error(
                    `Application exited before becoming ready. Recent output:\n${logs}`,
                  )
                }
                await sleep(500)
              }

              if (!appProcess.ready) {
                const logs = appProcess.output.slice(-20).join("\n")
                return {
                  title: "Application started (ready signal pending)",
                  metadata: { action, description, name: params.name },
                  output: [
                    `⚠️ Application started but ready signal not detected within ${params.waitTimeout}ms`,
                    `Waiting for: "${params.waitFor}"`,
                    "",
                    "Recent output:",
                    logs,
                    "",
                    "The application may still be starting. Check logs with get_logs action.",
                  ].join("\n"),
                }
              }
            } else {
              // Wait a bit for initial output
              await sleep(2000)
            }

            const recentOutput = appProcess.output.slice(-20).join("\n")
            return {
              title: "Application started",
              metadata: { action, description, name: params.name, pid: proc.pid },
              output: [
                `✅ Application '${params.name}' started successfully`,
                `Command: ${params.command}`,
                `Working directory: ${workdir}`,
                `PID: ${proc.pid}`,
                params.waitFor ? `Ready signal detected: "${params.waitFor}"` : "",
                "",
                "Recent output:",
                recentOutput,
                "",
                "Use health_check to verify the application is responding.",
                "Use get_logs to view more output.",
                "Use stop when done testing.",
              ]
                .filter(Boolean)
                .join("\n"),
            }
          }

          case "stop": {
            if (!params.name) {
              throw new Error("name is required for stop action")
            }

            const app = processes.get(params.name)
            if (!app) {
              throw new Error(`Application '${params.name}' is not running`)
            }

            log.info("stopping application", { name: params.name })

            // Try graceful shutdown first
            app.process.kill("SIGTERM")

            // Wait a bit for graceful shutdown
            await sleep(2000)

            // Force kill if still running
            if (app.process.exitCode === null) {
              app.process.kill("SIGKILL")
            }

            processes.delete(params.name)

            return {
              title: "Application stopped",
              metadata: { action, description, name: params.name },
              output: `✅ Application '${params.name}' stopped successfully`,
            }
          }

          case "health_check": {
            if (!params.name) {
              throw new Error("name is required for health_check action")
            }

            const app = processes.get(params.name)
            if (!app) {
              throw new Error(`Application '${params.name}' is not running`)
            }

            const isRunning = app.process.exitCode === null
            if (!isRunning) {
              return {
                title: "Application stopped",
                metadata: { action, description, name: params.name },
                output: `❌ Application '${params.name}' has stopped. Exit code: ${app.process.exitCode}`,
              }
            }

            // If URL provided, try to fetch it
            if (params.url) {
              try {
                const response = await fetch(params.url, {
                  method: "GET",
                  signal: AbortSignal.timeout(5000),
                })

                return {
                  title: "Health check passed",
                  metadata: { action, description, name: params.name, url: params.url, status: response.status },
                  output: [
                    `✅ Health check passed for '${params.name}'`,
                    `URL: ${params.url}`,
                    `Status: ${response.status} ${response.statusText}`,
                    `Runtime: ${Math.round((Date.now() - app.startTime) / 1000)}s`,
                  ].join("\n"),
                }
              } catch (error: any) {
                return {
                  title: "Health check failed",
                  metadata: { action, description, name: params.name, url: params.url, error: error.message },
                  output: [
                    `⚠️ Application is running but health check failed`,
                    `URL: ${params.url}`,
                    `Error: ${error.message}`,
                    "",
                    "The application may still be starting or the URL may be incorrect.",
                    "Check logs with get_logs action for more details.",
                  ].join("\n"),
                }
              }
            }

            return {
              title: "Application running",
              metadata: { action, description, name: params.name },
              output: [
                `✅ Application '${params.name}' is running`,
                `Runtime: ${Math.round((Date.now() - app.startTime) / 1000)}s`,
                `PID: ${app.process.pid}`,
                "",
                "Provide a URL parameter to perform HTTP health check.",
              ].join("\n"),
            }
          }

          case "get_logs": {
            if (!params.name) {
              return {
                title: "Get logs failed",
                metadata: { action, description },
                output: "name is required for get_logs action",
              }
            }

            const app = processes.get(params.name)
            if (!app) {
              return {
                title: "Get logs failed",
                metadata: { action, description },
                output: `Application '${params.name}' is not running`,
              }
            }

            const maxLines = params.maxLines || 100
            const logs = app.output.slice(-maxLines).join("\n")

            return {
              title: "Application logs",
              metadata: { action, description, name: params.name, lines: app.output.length } as any,
              output: [
                `📋 Logs for '${params.name}' (last ${Math.min(maxLines, app.output.length)} lines):`,
                "",
                logs,
                "",
                `Total output lines: ${app.output.length}`,
                `Runtime: ${Math.round((Date.now() - app.startTime) / 1000)}s`,
              ].join("\n"),
            }
          }

          case "list": {
            if (processes.size === 0) {
              return {
                title: "No applications running",
                metadata: { action, description } as any,
                output: "No applications currently running in this session.",
              }
            }

            const list = []
            list.push("Running applications:")
            list.push("")

            for (const [name, app] of processes) {
              const runtime = Math.round((Date.now() - app.startTime) / 1000)
              const status = app.process.exitCode === null ? "✅ Running" : "❌ Stopped"
              list.push(`- ${name}: ${status}`)
              list.push(`  Command: ${app.command}`)
              list.push(`  Runtime: ${runtime}s`)
              list.push(`  PID: ${app.process.pid}`)
              list.push("")
            }

            return {
              title: "Running applications",
              metadata: { action, description, count: processes.size } as any,
              output: list.join("\n"),
            }
          }

          default:
            return {
              title: "Unknown action",
              metadata: { action, description } as any,
              output: `Unknown action: ${action}`,
            }
        }
      } catch (error: any) {
        log.error("app lifecycle tool error", { action, error: error.message })
        return {
          title: `App lifecycle ${action} failed`,
          metadata: { action, description, error: error.message } as any,
          output: `App lifecycle ${action} failed: ${error.message}`,
        }
      }
    },
  }
})

// Cleanup function to kill all processes when session ends
export function cleanupSessionProcesses(sessionID: string) {
  const processes = sessionProcesses.get(sessionID)
  if (!processes) return

  for (const [name, app] of processes) {
    if (app.process.exitCode === null) {
      log.info("cleaning up application process", { sessionID, name })
      app.process.kill("SIGTERM")
      setTimeout(() => {
        if (app.process.exitCode === null) {
          app.process.kill("SIGKILL")
        }
      }, 2000)
    }
  }

  sessionProcesses.delete(sessionID)
}

