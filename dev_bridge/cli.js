#!/usr/bin/env node
// Companion CLI for the Dev Bridge Blockbench plugin.
// Runs JavaScript inside a live Blockbench instance and prints the result.
//
// Usage:
//   node cli.js "Cube.all.length"
//   node cli.js --file test.js
//   echo "return Project.name" | node cli.js
//   node cli.js --ping
//   node cli.js --wait 60
//   node cli.js --launch "return Blockbench.version"
//   node cli.js --reload path/to/plugin.js "BarItems.my_action.click()"
//   node cli.js --screenshot out.png --selector "dialog#my_dialog"
//   node cli.js --logs 120
//   node cli.js --port 9000 "return 1 + 1"
//
// Flags combine and run in order: launch/wait, reload, eval, logs, screenshot.

const fs = require("fs")
const path = require("path")
const { spawn } = require("child_process")

const args = process.argv.slice(2)
let port = 8797
let file = null
let ping = false
let wait = null
let launch = false
let reload = null
let watch = null
let screenshot = null
let selector = null
let logs = null
const codeParts = []

const numericNext = i => args[i + 1] !== undefined && !isNaN(parseFloat(args[i + 1]))

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" || args[i] === "-p") port = parseInt(args[++i])
  else if (args[i] === "--file" || args[i] === "-f") file = args[++i]
  else if (args[i] === "--ping") ping = true
  else if (args[i] === "--wait" || args[i] === "-w") wait = numericNext(i) ? parseFloat(args[++i]) : 60
  else if (args[i] === "--launch") launch = true
  else if (args[i] === "--reload" || args[i] === "-r") reload = args[++i]
  else if (args[i] === "--watch") watch = args[++i]
  else if (args[i] === "--screenshot" || args[i] === "-s") screenshot = args[++i]
  else if (args[i] === "--selector") selector = args[++i]
  else if (args[i] === "--logs" || args[i] === "-l") logs = numericNext(i) ? parseInt(args[++i]) : 0
  else if (args[i] === "--help" || args[i] === "-h") {
    console.log("Usage: node cli.js [--port <port>] [--launch] [--wait [secs]] [--reload <plugin.js> | --watch <plugin.js>] [--file <path> | <code> | stdin] [--logs [since]] [--screenshot <out.png> [--selector <css>]] [--ping]")
    process.exit(0)
  }
  else codeParts.push(args[i])
}

async function tryPing(base) {
  try {
    const res = await fetch(`${base}/ping`)
    return await res.json()
  } catch {
    return null
  }
}

async function post(base, route, body) {
  const res = await fetch(`${base}${route}`, { method: "POST", body })
  return res.json()
}

function printEval(data) {
  for (const line of data.logs ?? []) console.log(line)
  if (data.ok) {
    if (data.result !== undefined) console.log(JSON.stringify(data.result, null, 2))
    return 0
  }
  console.error(data.error)
  return 1
}

async function main() {
  const base = `http://127.0.0.1:${port}`

  if (launch && !await tryPing(base)) {
    const exe = process.env.BLOCKBENCH_PATH ?? path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Blockbench", "Blockbench.exe")
    if (!fs.existsSync(exe)) {
      console.error(`Blockbench not found at ${exe}. Set BLOCKBENCH_PATH to override.`)
      return 3
    }
    spawn(exe, [], { detached: true, stdio: "ignore" }).unref()
    wait ??= 90
  }

  if (wait !== null) {
    const deadline = Date.now() + wait * 1000
    let up = await tryPing(base)
    while (!up && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 500))
      up = await tryPing(base)
    }
    if (!up) {
      console.error(`Dev Bridge did not come up on port ${port} within ${wait}s`)
      return 3
    }
    console.log(`Dev Bridge up (Blockbench ${up.version})`)
  }

  if (ping) {
    const data = await tryPing(base)
    if (!data) throw Object.assign(new Error("unreachable"), { cause: { code: "ECONNREFUSED" } })
    console.log(JSON.stringify(data, null, 2))
    return 0
  }

  let exitCode = 0

  let code = null
  if (file) code = fs.readFileSync(file, "utf8")
  else if (codeParts.length) code = codeParts.join(" ")
  else if (!process.stdin.isTTY) code = fs.readFileSync(0, "utf8")

  if (code && !/\b(return|throw)\b/.test(code) && !code.includes(";") && !code.includes("\n")) {
    code = "return (" + code + ")"
  }

  const reloadPlugin = async target => printEval(await post(base, "/reload", JSON.stringify({
    id: path.basename(target).replace(/\.js$/, ""),
    code: fs.readFileSync(target, "utf8")
  })))

  if (watch) {
    const run = async () => {
      await reloadPlugin(watch)
      if (code) printEval(await post(base, "/eval", code))
    }
    await run()
    let timer = null
    fs.watch(watch, () => {
      clearTimeout(timer)
      timer = setTimeout(() => run().catch(err => console.error(err.message)), 150)
    })
    console.log(`Watching ${watch} (Ctrl+C to stop)`)
    return new Promise(() => {})
  }

  if (reload) {
    exitCode = await reloadPlugin(reload)
    if (exitCode) return exitCode
  }

  if (code) {
    exitCode = printEval(await post(base, "/eval", code))
    if (exitCode) return exitCode
  }

  if (logs !== null) {
    const data = await (await fetch(`${base}/logs?since=${logs}`)).json()
    for (const entry of data.entries) console.log(`[${new Date(entry.time).toLocaleTimeString()}] [${entry.level}] ${entry.text}`)
    console.log(`next: ${data.next}`)
  }

  if (screenshot) {
    const data = await post(base, "/screenshot", JSON.stringify({ selector }))
    if (!data.ok) {
      console.error(data.error)
      return 1
    }
    fs.writeFileSync(screenshot, Buffer.from(data.data, "base64"))
    console.log(`Saved ${data.width}x${data.height} screenshot to ${screenshot}`)
  }

  if (!ping && !reload && !code && logs === null && !screenshot && wait === null) {
    console.error("No code provided. Use --help for usage.")
    return 2
  }
  return exitCode
}

main().then(
  exitCode => process.exit(exitCode),
  err => {
    if (err.cause?.code === "ECONNREFUSED" || err.cause?.code === "ECONNRESET") {
      console.error(`Could not reach the Dev Bridge on port ${port}. Is Blockbench running with the Dev Bridge plugin enabled?`)
    } else {
      console.error(err.message)
    }
    process.exit(3)
  }
)
