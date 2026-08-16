let net, nodeTimers, server, sockets, bridgeSettings, running, queue, logBuffer, logIndex, originalConsole, errorListener, rejectionListener

const id = "dev_bridge"
const defaultPort = 8797
const maxRequestSize = 32 * 1024 * 1024
const evalTimeout = 120000
const maxLogEntries = 1000

Plugin.register(id, {
  title: "Dev Bridge",
  icon: "terminal",
  author: "Ewan Howell",
  description: "Control Blockbench from external tools by running JavaScript over a local HTTP bridge.",
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
    if (localStorage.getItem("dev_bridge_accepted")) {
      setup()
      return
    }
    Blockbench.showMessageBox({
      title: "Dev Bridge",
      message: "Dev Bridge is a developer tool. It runs a local server that allows external tools to execute arbitrary JavaScript inside Blockbench, and it requests access to every native module that plugins can use. This makes Blockbench less secure while it is installed.\n\nOnly use this plugin if you are a developer and you accept these risks.",
      buttons: ["Accept Risks", "Cancel"],
      confirm: 0,
      cancel: 1
    }, button => {
      if (button === 0) {
        localStorage.setItem("dev_bridge_accepted", "true")
        setup()
      } else {
        Plugins.all.find(plugin => plugin.id === id)?.uninstall()
      }
    })
  },
  onuninstall() {
    localStorage.removeItem("dev_bridge_accepted")
    localStorage.removeItem("dev_bridge_port")
  },
  onunload() {
    if (!bridgeSettings) return
    stop()
    restoreConsole(originalConsole)
    window.removeEventListener("error", errorListener)
    window.removeEventListener("unhandledrejection", rejectionListener)
    bridgeSettings.forEach(setting => setting.delete())
  }
})

function setup() {
  net = require("net", {
    message: "This permission is required to run the local server that external dev tools connect to.",
    optional: false
  })
  if (!net) {
    throw new Error("net access denied")
  }
  const message = "Requested up front so scripts run through the Dev Bridge can use any module without interruption."
  let modules = ["process", "child_process", "https", "tls", "util", "os", "v8", "dialog", "clipboard", "shell"]
  try {
    const found = require("fs", { message, optional: true })
      .readFileSync(decodeURIComponent(location.pathname.replace(/^\/(?=[A-Za-z]:)/, "").replace(/index\.html$/, "")) + "dist/bundle.js", "utf8")
      .match(/\[\s*(?:["'][a-z_0-9]+["']\s*,\s*)*["']child_process["'](?:\s*,\s*["'][a-z_0-9]+["'])*\s*,?\s*\]/g)
    if (found?.length === 1) modules = [...found[0].matchAll(/["']([a-z_0-9]+)["']/g)].map(m => m[1])
  } catch {}
  for (const module of modules) {
    if (module !== "net" && module !== "fs") require(module, { message, optional: true })
  }
  nodeTimers = require("timers")
  queue = Promise.resolve()
  sockets = new Set()
  logBuffer = []
  logIndex = 0
  originalConsole = wrapConsole(recordLog)
  errorListener = e => recordLog("uncaught", `${e.message} @ ${e.filename}:${e.lineno}`)
  rejectionListener = e => recordLog("unhandledrejection", String(e.reason?.stack ?? e.reason))
  window.addEventListener("error", errorListener)
  window.addEventListener("unhandledrejection", rejectionListener)
  bridgeSettings = [
    new Setting("dev_bridge_enabled", {
      category: "general",
      value: true,
      name: "Dev Bridge Server",
      description: "Run the Dev Bridge server that external dev tools connect to",
      plugin: id,
      onChange(value) {
        if (value) start()
        else stop(true)
      }
    }),
    new Setting("dev_bridge_port", {
      category: "general",
      value: parseInt(localStorage.getItem("dev_bridge_port")) || defaultPort,
      type: "number",
      min: 1,
      max: 65535,
      name: "Dev Bridge Port",
      description: "The port the Dev Bridge server listens on",
      plugin: id,
      onChange() {
        if (running) {
          stop()
          start()
        }
      }
    })
  ]
  if (settings.dev_bridge_enabled.value) start()
}

function wrapConsole(handler) {
  const wrap = { original: {}, wrappers: {} }
  for (const level of ["log", "info", "warn", "error", "debug"]) {
    wrap.original[level] = console[level]
    wrap.wrappers[level] = console[level] = (...args) => {
      handler(level, args.map(arg => typeof arg === "string" ? arg : JSON.stringify(safeClone(arg))).join(" "))
      wrap.original[level].apply(console, args)
    }
  }
  return wrap
}

function restoreConsole(wrap) {
  for (const level in wrap.original) {
    if (console[level] === wrap.wrappers[level]) console[level] = wrap.original[level]
  }
}

function bridgeSleep(ms) {
  return new Promise(resolve => nodeTimers.setTimeout(resolve, ms))
}

async function bridgeWaitFor(condition, timeout = 10000, interval = 50) {
  const deadline = Date.now() + timeout
  let value
  while (!(value = await condition())) {
    if (Date.now() > deadline) throw new Error(`waitFor timed out after ${timeout}ms`)
    await bridgeSleep(interval)
  }
  return value
}

async function bridgeSandbox(fn, format = "free") {
  newProject(Formats[format] ?? Formats.free)
  const project = Project
  try {
    return await fn(project)
  } finally {
    await project.close(true)
  }
}

function recordLog(level, text) {
  logBuffer.push({ i: logIndex++, time: Date.now(), level, text })
  if (logBuffer.length > maxLogEntries) logBuffer.splice(0, logBuffer.length - maxLogEntries)
}

function getPort() {
  return parseInt(settings.dev_bridge_port.value) || defaultPort
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
      head = {
        method,
        url,
        bodyStart: headerEnd + 4,
        contentLength: parseInt(lines.find(line => /^content-length:/i.test(line))?.split(":")[1]) || 0
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
  socket.end(Buffer.concat([
    Buffer.from(
      `HTTP/1.1 ${status} ${{ 200: "OK", 404: "Not Found", 413: "Payload Too Large" }[status] ?? "Error"}\r\n` +
      `Content-Type: application/json\r\n` +
      `Content-Length: ${body.length}\r\n` +
      `Connection: close\r\n\r\n`
    ),
    body
  ]))
}

function handleRequest(socket, method, url, body) {
  const [route, query] = url.split("?")
  if (method === "GET" && route === "/ping") {
    respond(socket, 200, {
      ok: true,
      app: "blockbench",
      version: Blockbench.version,
      plugin_version: Plugins.all.find(plugin => plugin.id === id)?.version,
      project: typeof Project === "object" && Project ? {
        name: Project.name,
        format: Format?.id ?? null
      } : null,
      mode: typeof Mode === "object" ? Mode.selected?.id ?? null : null,
      dialog: Dialog.open?.id ?? null
    })
    return
  }
  if (method === "GET" && route === "/logs") {
    const since = parseInt(new URLSearchParams(query).get("since")) || 0
    respond(socket, 200, { ok: true, entries: logBuffer.filter(entry => entry.i >= since), next: logIndex })
    return
  }
  if (method === "POST" && route === "/screenshot") {
    let selector
    try {
      selector = body ? JSON.parse(body).selector : null
    } catch {
      respond(socket, 200, { ok: false, error: "Invalid JSON body" })
      return
    }
    takeScreenshot(selector).then(
      result => respond(socket, 200, { ok: true, ...result }),
      err => respond(socket, 200, { ok: false, error: err?.message ?? String(err) })
    )
    return
  }
  if (method === "POST" && (route === "/eval" || route === "/reload")) {
    let code = body
    if (route === "/reload") {
      try {
        const request = JSON.parse(body)
        code = `Plugins.all.find(plugin => plugin.id === ${JSON.stringify(request.id)})?.unload()\n${request.code}\nreturn "reloaded ${request.id}"`
      } catch {
        respond(socket, 200, { ok: false, error: "Invalid JSON body. Expected { id, code }" })
        return
      }
    }
    const run = queue.then(() => new Promise(resolve => {
      const timer = nodeTimers.setTimeout(() => resolve({
        ok: false,
        error: `Evaluation timed out after ${evalTimeout / 1000}s. The script may still be pending, for example on DOM timers that pause while Blockbench is minimised.`
      }), evalTimeout)
      runCode(code).then(result => {
        nodeTimers.clearTimeout(timer)
        resolve(result)
      })
    }))
    queue = run.catch(() => {})
    run.then(result => respond(socket, 200, result))
    return
  }
  respond(socket, 404, { ok: false, error: "Not found. Endpoints: GET /ping, GET /logs, POST /eval, POST /reload, POST /screenshot" })
}

async function takeScreenshot(selector) {
  const capture = () => new Promise(resolve => Screencam.fullScreen(0, resolve))
  let dataUrl = await capture()
  for (let i = 0; i < 5; i++) {
    await bridgeSleep(150)
    const next = await capture()
    if (next === dataUrl) break
    dataUrl = next
  }
  const img = new Image()
  img.src = dataUrl
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = () => reject(new Error("Failed to decode screenshot"))
  })
  if (!selector) return { width: img.width, height: img.height, data: dataUrl.split(",")[1] }
  const el = document.querySelector(selector)
  if (!el) throw new Error(`No element matches selector: ${selector}`)
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) throw new Error(`Element has no visible area: ${selector}`)
  const scale = img.width / window.innerWidth
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(rect.width * scale)
  canvas.height = Math.round(rect.height * scale)
  canvas.getContext("2d").drawImage(img, rect.x * scale, rect.y * scale, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
  return { width: canvas.width, height: canvas.height, data: canvas.toDataURL().split(",")[1] }
}

async function runCode(code) {
  const logs = []
  const original = wrapConsole((level, text) => logs.push((level === "log" ? "" : `[${level}] `) + text))
  try {
    const fn = new (Object.getPrototypeOf(async function() {}).constructor)("require", "sleep", "waitFor", "sandbox", code)
    return { ok: true, result: safeClone(await fn.call(globalThis, require, bridgeSleep, bridgeWaitFor, bridgeSandbox)), logs }
  } catch (err) {
    return { ok: false, error: err?.stack ?? String(err), logs }
  } finally {
    restoreConsole(original)
  }
}

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
