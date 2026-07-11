<div id="about-content">
  <p>This plugin runs a local server inside Blockbench that external tools can connect to, allowing JavaScript to be executed in the Blockbench context from a terminal, editor, or AI agent. It is intended for plugin development and automated testing.</p>
  <h2 class="markdown">Usage:</h2>
  <p>The server starts automatically and listens on <code>http://127.0.0.1:8797</code>. Manage it from <strong>Help &gt; Developer &gt; Dev Bridge</strong>, where you can start, stop, and change the port.</p>
  <p>Use the bundled <code>cli.js</code> to run code from a terminal:</p>
  <p><code>node cli.js "Cube.all.length"</code></p>
  <p><code>node cli.js --file test.js</code></p>
  <p><code>node cli.js --ping</code></p>
  <h2 class="markdown">Endpoints:</h2>
  <p><code>GET /ping</code> returns Blockbench and project status.</p>
  <p><code>POST /eval</code> with JavaScript as the request body runs it and returns <code>{ ok, result, logs }</code>.</p>
  <p>The server only listens on localhost. Only run this plugin on machines where you trust the local processes, since anything that can reach the port can execute code inside Blockbench.</p>
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
