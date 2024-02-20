(() => {
  // CEM TEMPLATE LOADER

  let styles, loader, loaderDialog, modelData, loadingPromise

  const loaderData = {
    connection: null,
    loading: true,
    categories: {},
    category: null,
    loadTexture: true,
    entity: null,
    search: "",
    entities: [],
    built: false
  }

  async function loadCEMTemplateLoader() {
    styles = Blockbench.addCSS(`
      .spacer {
        flex: 1;
      }
      .cem-template-loader-links {
        display: flex;
        justify-content: space-around;
        margin: 20px 40px 0;
      }
      .cem-template-loader-links > a {
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
      .cem-template-loader-links > a:hover {
        background-color: var(--color-accent);
        color: var(--color-light);
      }
      .cem-template-loader-links > a > i {
        font-size: 32px;
        width: 100%;
        max-width: initial;
        height: 32px;
        text-align: center;
      }
      .cem-template-loader-links > a:hover > i {
        color: var(--color-light) !important;
      }
      .cem-template-loader-links > a > p {
        flex: 1;
        display: flex;
        align-items: center;
      }
      #format_page_cem_template_loader {
        padding-bottom: 0;
      }
      #format_page_cem_template_loader .format_target, #format_page_optifine_entity .format_target {
        margin-bottom: 6px;
      }
      #format_page_cem_template_loader div:nth-child(3), #format_page_cem_template_loader content {
        overflow-y: auto;
      }
    `)
    loader = new ModelLoader(id, {
      name,
      description,
      icon,
      onStart: () => openLoader,
      format_page: {
        component: {
          data: {
            connection
          },
          methods: {
            openLoader
          },
          template: `
            <div style="display:flex;flex-direction:column;height:100%">
              <p class="format_description">${description}</p>
              <p class="format_target"><b>Target</b> : <span>Minecraft: Java Edition with OptiFine</span> <span>Texturing Templates</span></p>
              <content>
                <h3 class="markdown">How to use:</h3>
                <p class="markdown">
                  <ul>
                    <li><p>Press <strong>Load CEM Template</strong> and select a model.</p></li>
                    <li><p>Select your load settings, load the model, then edit the model.</p></li>
                    <li><p>Export your model as an <strong>OptiFine JEM</strong> to <code>assets/minecraft/optifine/cem</code>, using the provided name.</p></li>
                  </ul>
                </p>
                <h3 class="markdown">Do:</h3>
                <p class="markdown">
                  <ul>
                    <li><p>Edit any of the cubes that were loaded with the template, add your own cubes, and create your own subgroups.</p></li>
                  </ul>
                </p>
                <h3 class="markdown">Do not:</h3>
                <p class="markdown">
                  <ul>
                    <li><p>Edit any of the groups that were loaded with the template, add your own root groups, or remove any built in animations.</p></li>
                  </ul>
                </p>
              </content>
              <div class="spacer"></div>
              <div class="cem-template-loader-links">${Object.values(links).map(e => `
                <a href="${e.link}">
                  ${Blockbench.getIconNode(e.icon, e.colour).outerHTML}
                  <p>${e.text}</p>
                </a>
              `).join("")}</div>
              <div class="button_bar">
                <button id="create_new_model_button" style="margin-top:20px;margin-bottom:24px;" @click="openLoader()">
                  <i class="material-icons">${icon}</i>
                  Load CEM Template
                </button>
              </div>
            </div>
          `
        }
      }
    })
    loaderDialog = new Dialog({
      id,
      title: name,
      width: 980,
      buttons: [],
      sidebar: {
        pages: {},
        onPageSwitch(page) {
          loaderDialog.content_vue.category = page
          loaderDialog.content_vue.$refs.entry.focus()
        }
      },
      lines: [`<style>
        #cem_template_loader > .dialog_wrapper {
          grid-template-rows: auto 0px;
          grid-template-columns: 160px auto;
          overflow: hidden;
          height: 512px;
          position: relative;
          display: grid;
        }
        #cem_template_loader > .dialog_wrapper:not(.has_sidebar) {
          grid-template-columns: auto;
        }
        #cem_template_loader .dialog_sidebar_pages {
          margin-bottom: 66px;
          overflow-y: auto;
        }
        #cem_template_loader .dialog_sidebar_pages::-webkit-scrollbar-track, .cem-models::-webkit-scrollbar-track {
          background-color: var(--color-back);
        }
        #cem_template_loader .dialog_content {
          margin: 0;
          max-height: initial;
        }
        #cem_template_loader h1 {
          margin: 0;
        }
        #cem_template_loader .hidden {
          display: none !important;
        }
        .cem-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          background-color: var(--color-ui);
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          padding: 40px;
          text-align: center;
          gap: 16px;
        }
        .cem-overlay > * {
          max-width: 512px;
        }
        #cem-report-issues {
          position: absolute;
          width: 160px;
          left: 0;
          bottom: 0;
          padding: 12px 0;
          border-top: 2px solid var(--color-border);
          z-index: 1;
          display: none;
        }
        .has_sidebar #cem-report-issues {
          display: initial;
        }
        #cem-report-issues > a {
          display: flex;
          text-decoration: none;
          justify-content: center;
          align-items: center;
          gap: 10px;
        }
        #cem-report-issues > a > div {
          text-decoration: underline;
        }
        #cem-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        #cem-footer {
          display: flex;
          padding: 8px;
          gap: 10px;
          flex-wrap: wrap;
        }
        #load-texture {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        #load-texture * {
          cursor: pointer;
        }
        #cem-buttons {
          display: flex;
          flex: 1;
          justify-content: end;
          gap: 4px;
        }
        #cem-buttons > :disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        #cem-buttons > :first-child:not(:disabled) {
          background-color: var(--color-accent);
        }
        #cem-header {
          padding: 0 8px 8px 16px;
        }
        #cem-details {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        #cem-search {
          position: relative;
          min-width: min(100%, 256px);
          display: flex;
          justify-content: end;
          margin-left: auto;
        }
        #cem-search > input {
          width: min(100%, 256px);
        }
        #cem-search > i {
          position: absolute;
          right: 6px;
          top: 5px;
          pointer-events: none;
        }
        #cem-description {
          min-width: min(100%, 256px);
          flex: 1 1 0px;
        }
        .cem-models {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          overflow-y: auto;
          padding: 0 8px 0 16px;
          margin-right: 8px;
        }
        .cem-models > div {
          min-width: 128px;
          border: 2px solid transparent;
          flex: 1;
          background-color: var(--color-back);
          cursor: pointer;
          padding: 2px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .cem-models > div.selected {
          border: 2px solid var(--color-accent);
          background-color: var(--color-button);
        }
        .cem-models > div > img {
          height: 66px;
          width: 100%;
          object-fit: contain;
          pointer-events: none;
        }
        .cem-models > div > :nth-child(2) {
          text-align: center;
          flex: 1;
          display: flex;
          align-items: center;
          max-height: 24px;
          min-height: 24px;
          line-height: 16px;
          margin: -2px 0 2px;
          text-transform: capitalize;
        }
        .cem-spacer {
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1;
        }
      </style>`],
      component: {
        data: loaderData,
        methods: {
          async load() {
            this.loading = true
            await loadModel(this.entity, this.loadTexture)
            loaderDialog.close()
          },
          reload() {
            window.cemTemplateLoaderReloaded = true
            plugin.reload()
          }
        },
        template: `
          <div id="cem-container">
            <div v-if="loading" class="cem-overlay">
              <h1>Loading...</h1>
            </div>
            <div v-if="connection?.failed" class="cem-overlay">
              <h1>Connection Failed</h1>
              <p>Failed to load CEM Template data.</p>
              <p>Please make sure you are connected to the internet, and can access this <a href="${root}/json/cem_template_models.json">cem_template_models.json</a> file.</p>
              <p>If you are unable to access the fonts.json file, it may be blocked by your computer or your internet service provider. If it is not your computer blocking it, you may be able to use a VPN to bypass the block. One good example is <a href="https://1.1.1.1/">Cloudflare WARP</a>, which is a free program that commonly resolves this issue.</p>
              <button @click="reload">Retry connection</button>
            </div>
            <div id="cem-header">
              <h1>{{ category }}</h1>
              <div id="cem-details">
                <div id="cem-description">{{ categories[category]?.description }}</div>
                <div id="cem-search">
                  <input type="text" placeholder="Search…" class="dark_bordered" v-model="search" ref="entry" @input="search = search.toLowerCase()">
                  <i class="material-icons">search</i>
                </div>
              </div>
            </div>
            <div v-if="connection" v-for="[name, c] of Object.entries(categories)" class="cem-models" :class="{ hidden: category !== name }">
              <div v-for="model of c.entities" :class="{ selected: entity === model.name, hidden: !model.name.includes(search) }" @click="entity = model.name">
                <img :src="connection.roots[connection.rootIndex] + '/images/minecraft/renders2/' + model.name + '.webp'" loading="lazy">
                <div>{{ model.display_name ?? model.name.replace(/_/g, ' ') }}</div>
              </div>
            </div>
            <div class="cem-spacer">
              <h3 v-if="!entities.filter(e => e[0] === category && e[1].includes(search)).length">No results</h3>
            </div>
            <div id="cem-footer">
              <label id="load-texture">
                <input type="checkbox" :checked="loadTexture" v-model="loadTexture">
                <div>Load vanilla texture</div>
              </label>
              <div id="cem-buttons">
                <button :disabled="!entity" @click="load">Load</button>
                <button>Cancel</button>
              </div>
            </div>
            <div id="cem-report-issues">
              <a href="https://github.com/ewanhowell5195/cemTemplateModels/issues">
                <i class="material-icons">bug_report</i>
                <div>Report issues</div>
              </a>
            </div>
          </div>
        `
      },
      async onBuild() {
        loaderData.connection = connection
        await loadCEMTemplateModels()
        this.sidebar.build()
        if (!modelData.categories) {
          return loaderData.$forceUpdate()
        }
        const categories = modelData.categories.map(e => [e.name, e])
        loaderData.categories = Object.fromEntries(categories)
        loaderData.entities = categories.flatMap(c => c[1].entities.map(e => [c[0], e.name]))
        loaderData.loading = false
        loaderData.built = true
      },
      onOpen() {
        this.content_vue.$refs.entry.focus()
        if (loaderData.built) {
          loaderData.loading = false
          this.content_vue.$forceUpdate()
        }
      }
    })
    MenuBar.addAction(new Action(id, {
      name,
      description,
      children: [
        new Action("cem_template_loader_placeholder", {
          name: `All Entities`,
          description: "All entities",
          icon: "icon-player",
          click: () => openLoader()
        })
      ],
      icon
    }), "tools")
    const script = document.createElement("script")
    script.innerHTML = `
      if (!window.cemTemplateModelsLoaded) {
        loadCEMTemplateModels()
      }
    `
    BarItems.cem_template_loader.menu_node.append(script)
    if (window.cemTemplateLoaderReloaded) {
      delete window.cemTemplateLoaderReloaded
      openLoader()
    } else if (Blockbench.isWeb) {
      const params = (new URL(location.href)).searchParams
      if (params.get("plugins")?.split(",").includes(id) && params.get("model") !== "") {
        if (!await MinecraftEULA.promptUser(id)) return
        await loadCEMTemplateModels()
        loadModel(params.get("model"), params.has("texture"))
      }
    }
  }

  function unloadCEMTemplateLoader() {
    styles.delete()
    loader.delete()
    loaderDialog.close()
    for (const child of BarItems.cem_template_loader.children) {
      child.delete()
    }
    BarItems.cem_template_loader.delete()
    delete window.loadCEMTemplateModels
    delete window.cemTemplateModelsLoaded
  }

  window.loadCEMTemplateModels = async () => {
    if (window.cemTemplateModelsLoaded) return loadingPromise
    loadingPromise = fetchData("json/cem_template_models.json")
    modelData = await loadingPromise
    window.cemTemplateModelsLoaded = true
    if (!modelData.categories) return
    loaderDialog.sidebar.page = modelData.categories[0].name
    loaderData.category = modelData.categories[0].name
    for (const category of modelData.categories) {
      for (let i = 0; i < category.entities.length; i++) {
        if (typeof category.entities[i] === "string") {
          category.entities[i] = { name: category.entities[i] }
        }
      }
    }
    modelData.entities = []
    for (const category of modelData.categories) {
      loaderDialog.sidebar.pages[category.name] = {
        label: category.name,
        icon: category.icon
      }
      modelData.entities.push(...category.entities)
    }
    BarItems.cem_template_loader_placeholder.delete()
    BarItems.cem_template_loader.children = modelData.categories.map(e => new Action(`cem_template_loader_${e.name.replace(/ /g, "_")}`, {
      name: `${e.name} Entities`,
      description: e.description,
      icon: e.icon,
      click: () => openLoader(e.name)
    }))
    if (MenuBar.menus.tools.label.classList.contains("opened")) {
      MenuBar.menus.tools.show()
    }
  }

  async function openLoader(category) {
    if (!await MinecraftEULA.promptUser(id)) return
    if (category) {
      loaderData.category = category
      loaderDialog.sidebar.page = category
      if (loaderDialog.content_vue) loaderDialog.sidebar.build()
    }
    loaderDialog.show()
  }

  const getBase64FromBlob = blob => new Promise(async fulfil => {
    const reader = new FileReader()
    reader.onloadend = () => fulfil(reader.result)
    reader.readAsDataURL(blob)
  })

  async function loadModel(entity, loadTexture) {
    const data = modelData.entities.find(e => e.name === entity)
    if (!data) return Blockbench.showQuickMessage("Unknown CEM template model", 2000)
    const model = modelData.models[data.model ?? data.name]
    newProject(Formats.optifine_entity)
    Formats.optifine_entity.codec.parse(JSON.parse(model.model), "")
    let textureLoaded
    if (loadTexture) {
      try {
        const textures = Array.isArray(data.texture_name) ? data.texture_name : [data.texture_name ?? data.name]
        for (const [i, name] of textures.entries()) {
          const texture = await fetchData(`images/minecraft/entities/${entity}${i || ""}.png`, () => null)
          if (!texture) throw Error
          new Texture({ name }).fromDataURL(await getBase64FromBlob(await texture.blob())).add()
        }
        textureLoaded = true
      } catch {
        Blockbench.showQuickMessage("Unable to load vanilla texture", 2000)
        loaderDialog.content_vue?.$forceUpdate()
      }
    }
    if (!textureLoaded) {
      const textureData = Array.isArray(model.texture_data) ? model.texture_data : [model.texture_data]
      const textures = Array.isArray(data.texture_name) && Array.isArray(model.texture_data) ? data.texture_name : [data.texture_name ?? data.name]
      for (const [i, name] of textures.entries()) {
        if (textureData[i]) new Texture({ name }).fromDataURL("data:image/png;base64," + textureData[i]).add()
        else TextureGenerator.addBitmap({
          name,
          color: new tinycolor("#00000000"),
          type: "template",
          rearrange_uv: false,
          resolution: "16"
        })
      }
    }
  }

  // OPTIFINE ENTITY RESTRICTIONS

  function loadOptiFineEntityRestrictions() {

  }

  function unloadOptiFineEntityRestrictions() {
    
  }

  // OPTIFINE ANIMATION EDITOR

  function loadOptiFineAnimationEditor() {

  }

  function unloadOptiFineAnimationEditor() {
    
  }

  // PLUGIN

  const connection = {
    roots: [
      `https://wynem.com/assets`,
      `https://raw.githubusercontent.com/ewanhowell5195/wynem/main/src/assets`,
      `https://cdn.jsdelivr.net/gh/ewanhowell5195/wynem/src/assets`
    ],
    rootIndex: 0
  }
  let root = connection.roots[0]
  const id = "cem_template_loader"
  const name = "CEM Template Loader"
  const icon = "keyboard_capslock"
  const description = "Load template Java Edition entity models for use with OptiFine CEM."
  const links = {
    website: {
      text: "By Ewan Howell",
      link: "https://ewanhowell.com/",
      icon: "language",
      colour: "#33E38E"
    },
    discord: {
      text: "Discord Server",
      link: "https://discord.ewanhowell.com/",
      icon: "fab.fa-discord",
      colour: "#727FFF"
    },
    tutorial: {
      text: "CEM Modelling Tutorial",
      link: "https://youtu.be/arj2eim42KI",
      icon: "fab.fa-youtube",
      colour: "#FF4444"
    }
  }
  const plugin = Plugin.register(id, {
    title: name,
    icon: "icon.png",
    author: "Ewan Howell",
    description: description + " Also includes an animation editor, so that you can create custom entity animations.",
    tags: ["Minecraft: Java Edition", "OptiFine", "Templates"],
    version: "8.0.0",
    min_version: "4.9.4",
    variant: "both",
    creation_date: "2020-02-02",
    onload() {
      loadCEMTemplateLoader()
      loadOptiFineEntityRestrictions()
      loadOptiFineAnimationEditor()
    },
    onunload() {
      unloadCEMTemplateLoader()
      unloadOptiFineEntityRestrictions()
      unloadOptiFineAnimationEditor()
    }
  })

  async function fetchData(path, fallback) {
    try {
      const r = await fetch(`${root}/${path}`)
      if (r.status !== 200 || r.headers.get("Content-Type")?.startsWith("text/html")) throw new Error
      if (r.headers.get("Content-Type")?.startsWith("text/plain") || r.headers.get("Content-Type")?.startsWith("application/json")) return r.json()
      return r
    } catch {
      for (let x = connection.rootIndex + 1; x < connection.roots.length; x++) {
        connection.rootIndex = x
        try {
          const r = await fetch(`${connection.roots[x]}/${path}`)
          if (r.status !== 200) throw new Error
          root = connection.roots[x]
          if (r.headers.get("Content-Type")?.startsWith("text/plain") || r.headers.get("Content-Type")?.startsWith("application/json")) return r.json()
          return r
        } catch {}
      }
      connection.failed = true
      return fallback ? fallback() : {}
    }
  }
})()