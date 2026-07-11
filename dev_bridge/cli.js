#!/usr/bin/env node
// Companion CLI for the Dev Bridge Blockbench plugin.
// Runs JavaScript inside a live Blockbench instance and prints the result.
//
// Usage:
//   node cli.js "Cube.all.length"
//   node cli.js --file test.js
//   echo "return Project.name" | node cli.js
//   node cli.js --ping
//   node cli.js --port 9000 "return 1 + 1"

const fs = require("fs")

const args = process.argv.slice(2)
let port = 8797
let file = null
let ping = false
const codeParts = []

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" || args[i] === "-p") port = parseInt(args[++i])
  else if (args[i] === "--file" || args[i] === "-f") file = args[++i]
  else if (args[i] === "--ping") ping = true
  else if (args[i] === "--help" || args[i] === "-h") {
    console.log('Usage: node cli.js [--port <port>] [--file <path> | <code> | stdin] [--ping]')
    process.exit(0)
  }
  else codeParts.push(args[i])
}

async function main() {
  const base = `http://127.0.0.1:${port}`

  if (ping) {
    const res = await fetch(`${base}/ping`)
    console.log(JSON.stringify(await res.json(), null, 2))
    return 0
  }

  let code = null
  if (file) code = fs.readFileSync(file, "utf8")
  else if (codeParts.length) code = codeParts.join(" ")
  else if (!process.stdin.isTTY) code = fs.readFileSync(0, "utf8")

  if (!code) {
    console.error("No code provided. Use --help for usage.")
    return 2
  }

  // Bare expressions are more convenient with an implicit return
  if (!/\b(return|throw)\b/.test(code) && !code.includes(";") && !code.includes("\n")) {
    code = "return (" + code + ")"
  }

  const res = await fetch(`${base}/eval`, { method: "POST", body: code })
  const data = await res.json()
  for (const line of data.logs ?? []) console.log(line)
  if (data.ok) {
    if (data.result !== undefined) console.log(JSON.stringify(data.result, null, 2))
    return 0
  }
  console.error(data.error)
  return 1
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
