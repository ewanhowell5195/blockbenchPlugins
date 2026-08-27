<div id="about-content">
  <p>This plugin runs a local server inside Blockbench that external tools can connect to, allowing JavaScript to be executed in the Blockbench context from a terminal, editor, or AI agent. It is intended for plugin development and automated testing.</p>
  <h2 class="markdown">Usage:</h2>
  <p>The server starts automatically and listens on <code>http://127.0.0.1:8797</code>. It can be toggled and the port changed from the Blockbench <strong>Settings</strong>, under General.</p>
  <p>Use the bundled <code>cli.js</code> to run code from a terminal:</p>
  <p><code>node cli.js "Cube.all.length"</code></p>
  <p><code>node cli.js --file test.js</code></p>
  <p><code>node cli.js --ping</code></p>
  <p><code>node cli.js --launch --wait</code> starts Blockbench if needed and waits for the bridge.</p>
  <p><code>node cli.js --reload path/to/plugin.js</code> unloads that plugin and loads the file in one step, and can be followed by code to run afterwards.</p>
  <p><code>node cli.js --watch path/to/plugin.js</code> does the same, then keeps watching the file and reloads on every save.</p>
  <p><code>node cli.js --screenshot out.png --selector "dialog"</code> saves a screenshot of the window, or of a single element when a CSS selector is given.</p>
  <p><code>node cli.js --logs</code> prints the console and error history.</p>
  <h2 class="markdown">Using an AI agent?</h2>
  <p>The Dev Bridge works well with AI coding agents. With Blockbench open, set your agent up once with this prompt:</p>
  <p><code>Fetch http://127.0.0.1:8797/skill and follow its instructions to set up the blockbench-dev-bridge skill for yourself. Then tell me what you set up.</code></p>
  <p>After that, just ask for what you need:</p>
  <p><code>Use the Blockbench Dev Bridge to help me test [thing].</code></p>
  <h2 class="markdown">Endpoints:</h2>
  <p><code>GET /ping</code> returns Blockbench, project, and open dialog status.</p>
  <p><code>POST /eval</code> with JavaScript as the request body runs it and returns <code>{ ok, result, logs }</code>. Scripts have access to a <code>require</code> scoped to this plugin's permissions, plus three async helpers: <code>sleep(ms)</code> and <code>waitFor(condition, timeout, interval)</code> on node timers that keep ticking while the window is minimised, and <code>sandbox(fn, format)</code> which runs the callback inside a scratch project that is always force-closed afterwards, so tests never touch open work.</p>
  <p><code>POST /reload</code> with <code>{ id, code }</code> unloads the plugin with that id and evaluates the code.</p>
  <p><code>POST /screenshot</code> with <code>{ selector }</code> returns a base64 PNG of the window or a matching element.</p>
  <p><code>GET /logs?since=N</code> returns console output, uncaught errors, and unhandled rejections recorded since entry N, including ones that happen outside evals.</p>
  <p>On load, the plugin requests access to every module Blockbench allows plugins to use, so bridge scripts can require anything without a blocking prompt appearing mid script. Choose "Always allow" on each prompt to make the grants permanent; denied modules simply prompt again on the next start or fail in scripts that use them.</p>
  <p>The server only listens on localhost. Only run this plugin on machines where you trust the local processes, since anything that can reach the port can execute code inside Blockbench, with access to every granted module.</p>
</div>
<style>
  .about {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  #about-content {
    overflow-y: auto;
    min-height: 128px;
  }
  #about-markdown-links {
    display: flex;
    justify-content: space-around;
    margin: 20px 20px 0;
  }
  #about-markdown-links > a {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 5px;
    text-decoration: none;
    flex-grow: 1;
    flex-basis: 0;
    color: var(--color-subtle_text);
    text-align: center;
  }
  #about-markdown-links > a:hover {
    background-color: var(--color-accent);
    color: var(--color-light);
  }
  #about-markdown-links > a > i {
    font-size: 32px;
    width: 100%;
    max-width: initial;
    height: 32px;
    text-align: center;
  }
  #about-markdown-links > a:hover > i {
    color: var(--color-light) !important;
  }
  #about-markdown-links > a > p {
    flex: 1;
    display: flex;
    align-items: center;
    margin: 0;
  }
</style>
<div id="about-markdown-links">
  <a href="https://ewanhowell.com/">
    <i class="material-icons icon" style="color: #33E38E;">language</i>
    <p>By Ewan Howell</p>
  </a>
  <a href="https://discord.ewanhowell.com/">
    <i class="fa_big icon fab fa-discord" style="color: #727FFF;"></i>
    <p>Ewan's Discord</p>
  </a>
</div>
