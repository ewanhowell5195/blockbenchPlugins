<div id="about-content">
  <p>This plugin adds a new format that allows you to create Minecraft Java Edition item models with unlimited rotation.</p>
  <h2>Getting started</h2>
  <p>To use this plugin, start by creating a new <strong>Free Rotation</strong> project from the start screen, or convert from a generic model of only cube elements.</p>
  <p>When exporting the model, check which display slots you would like the model to show in. The more you select, the larger the resulting file size will be.</p>
  <p>Display tab settings will be respected as long as size limits arn't reached.</p>
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
  #about-content > img {
    width: 100%;
    height: 128px;
    object-fit: contain;
    margin: 16px 0 24px;
    filter: drop-shadow(0 3px 10px #0006);
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