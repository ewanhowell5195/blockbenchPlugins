const fs = require("fs")

globalThis.Plugin = {
  register: () => {}
}

globalThis.Formats = {}

require("./resource_pack_utilities.js")

const utilities = Object.values(resourcePackUtilities).sort((a, b) => a.name.localeCompare(b.name))

const description = `<p>This plugin contains a collection of utilities to assist with resource pack creation.</p>
  <h2>How to use</h2>
  <p>To use this plugin, go <strong>Tools > Resource Pack Utilities</strong>, then select the utility you would like to use.</p>
  <h2>Utilities</h2>`

fs.writeFileSync("about.md", `
<div id="about-content">
  ${description}
  <ul>
    ${utilities.map(e => `<li>
      <h3>${e.name}</h3>
      <p>${e.description}</p>
    </li>`).join(`\n    `)}
  </ul>
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
  #about-content h3 {
    margin-bottom: -4px;
    font-weight: 600;
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
    <i class="material-icons icon" style="color: rgb(51, 227, 142);">language</i>
    <p>By Ewan Howell</p>
  </a>
  <a href="https://discord.ewanhowell.com/">
    <i class="fa_big icon fab fa-discord" style="color: rgb(114, 127, 255);"></i>
    <p>Discord Server</p>
  </a>
</div>
`.trim())

const data = JSON.parse(fs.readFileSync("E:/Programming/GitHub/ewanhowell/src/assets/json/plugins/resource-pack-utilities.json"))

data.description = description + `<ul>${utilities.map(e => `<li><h3 style="margin-bottom: 4px;">${e.name}</h3><p>${e.description}</p>`).join("")}</ul>`

fs.writeFileSync("E:/Programming/GitHub/ewanhowell/src/assets/json/plugins/resource-pack-utilities.json", JSON.stringify(data, null, 2))