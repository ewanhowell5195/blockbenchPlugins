let net, nodeTimers, server, sockets, actions, running, queue

const id = "dev_bridge"
const name = "Dev Bridge"
const icon = "terminal"
const description = "Control Blockbench from external tools by running JavaScript over a local HTTP bridge."
const defaultPort = 8797
const maxRequestSize = 32 * 1024 * 1024
const evalTimeout = 120000

Plugin.register(id, {
  title: name,
  icon,
  author: "Ewan Howell",
  description,
  tags: ["Development", "Testing", "Utility"],
  version: "1.0.0",
  min_version: "5.0.0",
  variant: "desktop",
  website: "https://ewanhowell.com/plugins/dev-bridge/",
  repository: "https://github.com/ewanhowell5195/blockbenchPlugins/tree/main/dev_bridge",
  bug_tracker: "https://github.com/ewanhowell5195/blockbenchPlugins/issues/new?title=[Dev Bridge]",
  creation_date: "2026-07-10",
  has_changelog: true,
  onload() {
    net = require("net", {
      message: "This permission is required to run the local server that external dev tools connect to.",
      optional: false
    })
    if (!net) {
      throw new Error("net access denied")
    }
    // Node timers keep running while the window is minimised, unlike DOM
    // timers which Chromium throttles; used so a stalled script cannot
    // lock the eval queue permanently
    nodeTimers = require("timers")
    queue = Promise.resolve()
    sockets = new Set()
    actions = [
      new Action("dev_bridge_start", {
        plugin: id,
        name: "Start Dev Bridge server",
        icon: "play_arrow",
        condition: () => !running,
        click: () => start()
      }),
      new Action("dev_bridge_stop", {
        plugin: id,
        name: "Stop Dev Bridge server",
        icon: "stop",
        condition: () => running,
        click: () => stop(true)
      }),
      new Action("dev_bridge_port", {
        plugin: id,
        name: "Set Dev Bridge port",
        icon: "settings_ethernet",
        click() {
          Blockbench.textPrompt("Dev Bridge Port", getPort().toString(), value => {
            const port = parseInt(value)
            if (!(port > 0 && port < 65536)) {
              Blockbench.showQuickMessage("Invalid port")
              return
            }
            localStorage.setItem("dev_bridge_port", port)
            if (running) {
              stop()
              start()
            }
          })
        }
      })
    ]
    MenuBar.addAction({
      name,
      id,
      children: actions,
      icon
    }, "help.developer.1")
    start()
  },
  onunload() {
    stop()
    actions.forEach(action => action.delete())
    MenuBar.removeAction(`help.developer.${id}`)
  }
})

function getPort() {
  return parseInt(localStorage.getItem("dev_bridge_port")) || defaultPort
}

function start() {
  if (running) return
  const port = getPort()
  server = net.createServer(handleSocket)
  server.on("error", err => {
    running = false
    Blockbench.showQuickMessage(`Dev Bridge failed to start: ${err.code === "EADDRINUSE" ? `port ${port} is already in use` : err.message}`, 3000)
  })
  server.listen(port, "127.0.0.1", () => {
    running = true
    console.log(`Dev Bridge listening on http://127.0.0.1:${port}`)
  })
}

function stop(announce) {
  if (server) {
    server.close()
    server = null
  }
  for (const socket of sockets) socket.destroy()
  sockets.clear()
  if (running && announce) Blockbench.showQuickMessage("Dev Bridge stopped", 3000)
  running = false
}

// Minimal HTTP/1.1 handling over a raw TCP socket, since Blockbench
// plugins can require "net" but not "http"
function handleSocket(socket) {
  sockets.add(socket)
  socket.on("close", () => sockets.delete(socket))
  socket.on("error", () => socket.destroy())

  let buffer = Buffer.alloc(0)
  let head = null

  socket.on("data", chunk => {
    buffer = Buffer.concat([buffer, chunk])
    if (buffer.length > maxRequestSize) {
      respond(socket, 413, { ok: false, error: "Request too large" })
      return
    }
    if (!head) {
      const headerEnd = buffer.indexOf("\r\n\r\n")
      if (headerEnd === -1) return
      const lines = buffer.subarray(0, headerEnd).toString().split("\r\n")
      const [method, url] = lines[0].split(" ")
      const headers = {}
      for (const line of lines.slice(1)) {
        const colon = line.indexOf(":")
        if (colon !== -1) headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim()
      }
      head = {
        method,
        url,
        bodyStart: headerEnd + 4,
        contentLength: parseInt(headers["content-length"]) || 0
      }
    }
    if (buffer.length - head.bodyStart >= head.contentLength) {
      const body = buffer.subarray(head.bodyStart, head.bodyStart + head.contentLength).toString()
      handleRequest(socket, head.method, head.url, body)
    }
  })
}

function respond(socket, status, data) {
  const body = Buffer.from(JSON.stringify(data))
  const statusText = { 200: "OK", 404: "Not Found", 413: "Payload Too Large" }[status] ?? "Error"
  socket.end(Buffer.concat([
    Buffer.from(
      `HTTP/1.1 ${status} ${statusText}\r\n` +
      `Content-Type: application/json\r\n` +
      `Content-Length: ${body.length}\r\n` +
      `Connection: close\r\n\r\n`
    ),
    body
  ]))
}

function handleRequest(socket, method, url, body) {
  if (method === "GET" && url === "/ping") {
    respond(socket, 200, {
      ok: true,
      app: "blockbench",
      version: Blockbench.version,
      plugin_version: Plugins.all.find(plugin => plugin.id === id)?.version,
      project: typeof Project === "object" && Project ? {
        name: Project.name,
        format: Format?.id ?? null
      } : null
    })
    return
  }
  if (method === "POST" && url === "/eval") {
    // queue runs so parallel requests cannot interleave console capture,
    // with a timeout so one stalled script cannot block the queue forever
    const run = queue.then(() => new Promise(resolve => {
      const timer = nodeTimers.setTimeout(() => resolve({
        ok: false,
        error: `Evaluation timed out after ${evalTimeout / 1000}s. The script may still be pending, for example on DOM timers that pause while Blockbench is minimised.`
      }), evalTimeout)
      runCode(body).then(result => {
        nodeTimers.clearTimeout(timer)
        resolve(result)
      })
    }))
    queue = run.catch(() => {})
    run.then(result => respond(socket, 200, result))
    return
  }
  respond(socket, 404, { ok: false, error: "Not found. Endpoints: GET /ping, POST /eval" })
}

async function runCode(code) {
  const logs = []
  const original = {}
  for (const level of ["log", "info", "warn", "error", "debug"]) {
    original[level] = console[level]
    console[level] = (...args) => {
      logs.push((level === "log" ? "" : `[${level}] `) + args.map(arg => typeof arg === "string" ? arg : JSON.stringify(safeClone(arg))).join(" "))
      original[level].apply(console, args)
    }
  }
  try {
    const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor
    const fn = new AsyncFunction(code)
    const result = await fn.call(globalThis)
    return { ok: true, result: safeClone(result), logs }
  } catch (err) {
    return { ok: false, error: err?.stack ?? String(err), logs }
  } finally {
    for (const level in original) console[level] = original[level]
  }
}

// Convert any value into something JSON-serialisable, guarding against
// circular references and enormous objects like THREE scenes
function safeClone(value, depth = 0, seen = new WeakSet()) {
  if (value === null || value === undefined) return value
  const type = typeof value
  if (type === "string" || type === "boolean") return value
  if (type === "number") return Number.isFinite(value) ? value : String(value)
  if (type === "bigint") return value.toString() + "n"
  if (type === "function") return `[Function: ${value.name || "anonymous"}]`
  if (type === "symbol") return value.toString()
  if (value instanceof Error) return { error: value.message, stack: value.stack }
  if (seen.has(value)) return "[Circular]"
  if (depth >= 8) return Array.isArray(value) ? `[Array(${value.length})]` : `[Object${value.constructor?.name ? " " + value.constructor.name : ""}]`
  seen.add(value)
  const cap = 1000
  if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    const arr = Array.from(value.length > cap ? Array.prototype.slice.call(value, 0, cap) : value, item => safeClone(item, depth + 1, seen))
    if (value.length > cap) arr.push(`[... ${value.length - cap} more]`)
    return arr
  }
  if (value instanceof Map) return safeClone(Object.fromEntries(value), depth + 1, seen)
  if (value instanceof Set) return safeClone([...value], depth + 1, seen)
  const out = {}
  let count = 0
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue
    if (count >= cap) {
      out["..."] = "truncated"
      break
    }
    try {
      out[key] = safeClone(value[key], depth + 1, seen)
    } catch (err) {
      out[key] = `[Error reading property: ${err.message}]`
    }
    count++
  }
  return out
}
