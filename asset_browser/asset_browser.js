(() => {
  const child_process = require("node:child_process")
  const os = require("node:os")

  let dialog, action

  const id = "asset_browser"
  const name = "Asset Browser"
  const icon = "folder_zip"
  const description = "Browse the Minecraft assets from within Blockbench."

  const manifest = {
    latest: {},
    types: {
      release: "Release",
      snapshot: "Snapshot",
      bedrock: "Bedrock Release",
      "bedrock-preview": "Bedrock Preview"
    },
    versions: []
  }

  const titleCase = str => str.replace(/_|-/g, " ").replace(/\w\S*/g, str => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase())
  const getVersion = id => manifest.versions.find(e => e.id === id)

  const image = new Image
  image.src = "data:image/png;base64,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"

  Plugin.register(id, {
    title: name,
    icon: "icon.png",
    author: "Ewan Howell",
    description,
    tags: ["Minecraft", "Assets", "Browser"],
    version: "1.0.0",
    min_version: "4.12.0",
    variant: "desktop",
    creation_date: "2025-03-09",
    has_changelog: true,
    website: "https://ewanhowell.com/plugins/asset-browser/",
    repository: "https://github.com/ewanhowell5195/blockbenchPlugins/tree/main/asset-browser",
    bug_tracker: "https://github.com/ewanhowell5195/blockbenchPlugins/issues/new?title=[Asset Browser]",
    onload() {
      let directory
      if (os.platform() === "win32") {
        directory = PathModule.join(os.homedir(), "AppData", "Roaming", ".minecraft")
      } else if (os.platform() === "darwin") {
        directory = PathModule.join(os.homedir(), "Library", "Application Support", "minecraft")
      } else {
        directory = PathModule.join(os.homedir(), ".minecraft")
      }
      new Setting("minecraft_directory", {
        value: directory,
        category: "defaults",
        type: "click",
        name: `${name} - Minecraft Directory`,
        description: "The location of your .minecraft folder",
        icon: "folder_open",
        click() {
          const dir = Blockbench.pickDirectory({
            title: "Select your .minecraft folder",
            startpath: settings.minecraft_directory.value
          })
          if (dir) {
            settings.minecraft_directory.value = dir
            Settings.saveLocalStorages()
          }
        }
      })
      new Setting("cache_directory", {
        value: "",
        category: "defaults",
        type: "click",
        name: `${name} - Cache Directory`,
        description: "The location to cache downloaded content",
        icon: "database",
        click() {
          const dir = Blockbench.pickDirectory({
            title: "Select a folder to cache downloaded content",
            startpath: settings.cache_directory.value
          })
          if (dir) {
            settings.cache_directory.value = dir
            Settings.saveLocalStorages()
          }
        }
      })
      dialog = new Dialog({
        id,
        title: name,
        width: 780,
        resizable: true,
        buttons: [],
        lines: [`<style>#${id} {
          user-select: none;

          .dialog_wrapper {
            height: calc(100% - 30px);
          }

          .dialog_content {
            height: 100%;
            max-height: 100%;
            margin: 0;
          }

          #${id}-container {
            height: 100%;
          }

          #index,
          #browser {
            display: flex;
            flex-direction: column;
            gap: 16px;
            height: 100%;
          }

          #index {
            padding: 16px;
          }

          #breadcrumbs {
            display: flex;
            padding: 8px;
            gap: 24px;
            background-color: var(--color-back);

            > div {
              padding: 4px 8px;
              cursor: pointer;
              position: relative;

              &:not(:last-child)::after {
                content: "chevron_right";
                font-family: "Material Icons";
                position: absolute;
                pointer-events: none;
                top: 50%;
                right: -12px;
                transform: translate(50%, -50%);
                font-size: 20px;
                opacity: 0.5;
              }

              &:hover {
                background-color: var(--color-selected);
              }
            }
          }

          #files {
            display: grid;
            grid-template-columns: repeat(auto-fit, 114px);
            gap: 10px;
            max-height: 100%;
            overflow-y: auto;
            padding: 0 16px 16px;

            > div {
              display: flex;
              align-items: center;
              text-align: center;
              flex-direction: column;
              padding: 0 4px 4px;
              cursor: pointer;
              font-size: 14px;
              word-break: break-word;

              &.selected {
                background-color: var(--color-selected);
              }

              > i, > img, canvas {
                min-width: 64px;
                min-height: 64px;
                max-width: 64px;
                max-height: 64px;
                font-size: 64px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 8px 0 4px;
              }

              > img, canvas {
                object-fit: contain;
                background: conic-gradient(var(--color-dark) .25turn, var(--color-back) .25turn .5turn, var(--color-dark) .5turn .75turn, var(--color-back) .75turn) top left/12px 12px;
              }

              > .fa {
                font-size: 52px;
              }
            }
          }
        }</style>`],
        component: {
          data: {
            type: "release",
            manifest,
            selectedVersions: {},
            version: null,
            jar: null,
            path: [],
            tree: {},
            textureObserver: null,
            loadedTextures: {},
            lastInteracted: null,
            selected: []
          },
          components: {
            "animated-texture": animatedTexureComponent()
          },
          computed: {
            currentFolderContents() {
              let current = this.tree
              for (const part of this.path) {
                if (!current[part]) return []
                current = current[part]
              }
              const entries = Object.entries(current).sort(([ka, va], [kb, vb]) => {
                if (typeof va === "object" && typeof vb === "string") return -1
                if (typeof vb === "object" && typeof va === "string") return 1
                return naturalSorter(ka, kb)
              })
              this.lastInteracted = entries[0][0]
              return entries
            }
          },
          watch: {
            path() {
              this.$nextTick(() => this.observeImages())
              this.selected = []
            }
          },
          methods: {
            updateVersion() {
              this.version = this.selectedVersions[this.type]
            },
            async loadVersion() {
              this.path = []
              this.loadedTextures = {}
              this.jar = await getVersionJar(this.version)
              this.tree = {}
              for (const path of Object.keys(this.jar.files)) {
                const parts = path.split("/")
                if (this.type === "bedrock" || this.type === "bedrock-preview") {
                  parts.splice(0, 1) 
                }
                let current = this.tree
                for (const [index, part] of parts.entries()) {
                  if (!current[part]) {
                    current[part] = index === parts.length - 1 ? path : {}
                  }
                  current = current[part]
                }
              }
              if (this.tree.resource_pack?.textures?.["flipbook_textures.json"]) {
                this.jar.flipbook = JSON.parse(this.jar.files[this.tree.resource_pack.textures["flipbook_textures.json"]].content.toString().replace(/\/\/.*$/gm, ""))
                this.jar.flipbook.push({
                  flipbook_texture: "textures/flame_atlas"
                })
              }
              this.$nextTick(() => this.observeImages())
            },
            hasAnimation(file) {
              if (this.jar.files[file].animation === false) return
              if (this.jar.files[file].animation) return true
              if (this.jar.flipbook) {
                const split = file.split("/")
                if (split[1] === "resource_pack") {
                  const texture = split.slice(2).join("/").slice(0, -4)
                  const anim = this.jar.flipbook.find(e => e.flipbook_texture === texture)
                  if (anim) {
                    this.jar.files[file].animation = {
                      animation: {
                        frametime: anim.ticks_per_frame,
                        interpolate: anim.blend_frames ?? true,
                        frames: anim.frames
                      }
                    }
                    return true
                  }
                }
                this.jar.files[file].animation = false
                return
              }
              const mcmeta = this.jar.files[file + ".mcmeta"]
              if (mcmeta) {
                try {
                  const data = JSON.parse(mcmeta.content)
                  if (data.animation) {
                    this.jar.files[file].animation = data
                    return true
                  }
                } catch {}
                this.jar.files[file].animation = false
              }
            },
            observeImages() {
              if (!this.$refs.texture) return

              this.textureObserver?.disconnect()
              
              this.textureObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                  if (entry.isIntersecting) {
                    if (!this.loadedTextures[entry.target.dataset.file]) {
                      this.$set(this.loadedTextures, entry.target.dataset.file, "data:image/png;base64," + this.jar.files[entry.target.dataset.value].content.toString("base64"))
                    }
                    this.textureObserver.unobserve(entry.target)
                  }
                })
              }, { threshold: 0.1 })


              this.$refs.texture.forEach(el => this.textureObserver.observe(el))
            },
            select(file, event) {
              const keys = this.currentFolderContents.map(entry => entry[0])

              if (event.shiftKey && this.lastInteracted) {
                const start = keys.indexOf(this.lastInteracted)
                const end = keys.indexOf(file)
                const range = keys.slice(Math.min(start, end), Math.max(start, end) + 1)
                if (event.ctrlKey && !this.selected.includes(this.lastInteracted)) {
                  this.selected = this.selected.filter(f => !range.includes(f))
                } else {
                  this.selected = event.ctrlKey ? Array.from(new Set(this.selected.concat(range))) : range
                }
              } else if (!event.ctrlKey) {
                this.selected = [file]
              } else {
                const index = this.selected.indexOf(file)
                if (index !== -1) {
                  this.selected.splice(index, 1)
                } else {
                  this.selected.push(file)
                }
              }

              this.lastInteracted = file
            },
            openFile(file, name) {
              if (file.endsWith(".png")) {
                Codecs.image.load([{
                  content: "data:image/png;base64," + this.jar.files[file].content.toString("base64")
                }], name)
                dialog.close()
              } else if (Codec.getAllExtensions().includes(PathModule.extname(file).slice(1))) {
                loadModelFile({
                  content: this.jar.files[file].content.toString(),
                  path: name
                })
                dialog.close()
              } else {
                const extension = PathModule.extname(file)
                const tempPath = PathModule.join(os.tmpdir(), `${PathModule.basename(name, extension)}_${new Date().toISOString().replace(/[:.]/g, "-")}${extension}`)
                fs.writeFileSync(tempPath, this.jar.files[file].content)
                exec(`"${tempPath}"`)
              }
            }
          },
          template: `
            <div id="${id}-container">
              <div v-if="!jar" id="index">
                <select-input v-model="type" :options="manifest.types" @input="updateVersion" />
                <template v-for="id in Object.keys(manifest.types)">
                  <select-input v-if="type === id" v-model="selectedVersions[id]" :options="Object.fromEntries(manifest.versions.filter(e => e.type === id).map(e => [e.id, e.id]))" @input="updateVersion" />
                </template>
                <button @click="loadVersion">Load</button>
                
              </div>
              <div v-else id="browser">
                <div id="breadcrumbs">
                  <div @click="jar = null">Versions</div>
                  <div @click="path = []">{{ version }}</div>
                  <div v-for="[i, part] of path.entries()" @click="path = path.slice(0, i + 1)">{{ part }}</div>
                </div>
                <div id="files">
                  <template v-for="[file, value] of currentFolderContents">
                    <div v-if="typeof value === 'object'" @click="select(file, $event)" @dblclick="path.push(file)" :class="{ selected: selected.includes(file) }">
                      <i class="material-icons">folder</i>
                      <div>{{ file.replace(/(_|\\.)/g, '$1​') }}</div>
                    </div>
                    <div v-else-if="value.endsWith('.png') && hasAnimation(value)" @click="select(file, $event)" @dblclick="openFile(value, file)" :class="{ selected: selected.includes(file) }">
                      <animated-texture :image="jar.files[value].image" :mcmeta="jar.files[value].animation" />
                      <i v-else class="material-icons">image</i>
                      <div>{{ file.replace(/(_|\\.)/g, '$1​') }}</div>
                    </div>
                    <div v-else-if="value.endsWith('.png')" @click="select(file, $event)" @dblclick="openFile(value, file)" :class="{ selected: selected.includes(file) }" ref="texture" :data-file="file" :data-value="value">
                      <img v-if="loadedTextures[file]" :src="loadedTextures[file]">
                      <i v-else class="material-icons">image</i>
                      <div>{{ file.replace(/(_|\\.)/g, '$1​') }}</div>
                    </div>
                    <div v-else @click="select(file, $event)" @dblclick="openFile(value, file)" :class="{ selected: selected.includes(file) }">
                      <i v-if="file.endsWith('.json')" class="material-icons">data_object</i>
                      <i v-else-if="file.endsWith('.fsh') || file.endsWith('.vsh') || file.endsWith('.glsl')" class="material-icons">ev_shadow</i>
                      <i v-else-if="file.endsWith('.mcmeta')" class="material-icons">theaters</i>
                      <i v-else-if="file.endsWith('.tga')" class="material-icons">image</i>
                      <i v-else class="material-icons">draft</i>
                      <div>{{ file.replace(/(_|\\.)/g, '$1​') }}</div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          `
        },
        async onBuild() {
          const [data, bedrock] = await Promise.all([
            fetch("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json").then(e => e.json()),
            fetch("https://api.github.com/repos/Mojang/bedrock-samples/releases").then(e => e.json())
          ])
          for (const version of bedrock) {
            data.versions.push({
              id: version.tag_name,
              type: version.prerelease ? "bedrock-preview" : "bedrock",
              data: {
                downloads: {
                  client: {
                    url: `https://github.com/Mojang/bedrock-samples/archive/refs/tags/${version.tag_name}.zip`
                  }
                }
              }
            })
          }
          for (const version of data.versions) {
            if (!manifest.types[version.type]) {
              manifest.types[version.type] = titleCase(version.type)
            }
          }
          for (const type of Object.keys(manifest.types)) {
            this.content_vue.selectedVersions[type] = data.versions.find(e => e.type === type)?.id
          }
          manifest.latest = data.latest
          manifest.versions = data.versions
          this.content_vue.version = manifest.versions.find(e => e.type === "release").id
          this.object.style.height = "512px"
        },
        onOpen() {
          setTimeout(async () => {
            if (!await MinecraftEULA.promptUser(id)) return dialog.close()
            if (!await exists(settings.minecraft_directory.value)) {
              new Dialog({
                title: "The .minecraft directory was not found",
                lines: ['When prompted, please select your <code class="rpu-code">.minecraft</code> folder'],
                width: 450,
                buttons: ["dialog.ok"],
                onClose() {
                  const dir = Blockbench.pickDirectory({
                    title: "Select your .minecraft folder",
                    startpath: settings.minecraft_directory.value
                  })
                  if (dir) {
                    settings.minecraft_directory.value = dir
                    Settings.saveLocalStorages()
                  } else {
                    Blockbench.showQuickMessage("No folder was selected")
                    dialog.close()
                  }
                }
              }).show()
            }
          }, 0)
        }
      })
      action = new Action({
        id,
        name,
        description,
        icon,
        click: () => dialog.show()
      })
      MenuBar.addAction(action, "tools")
      dialog.show()
    },
    onunload() {
      dialog.close()
      action.delete()
    }
  })

  function animatedTexureComponent() {
    return {
      template: `
        <div ref="container" class="animated-texture">
          <canvas ref="canvas"></canvas>
        </div>
      `,
      props: {
        image: HTMLImageElement,
        mcmeta: {
          type: Object,
          default: () => ({})
        }
      },
      data() {
        return {
          ctx: null,
          frames: [],
          frame: 0,
          frameTime: 0,
          lastTick: 0,
          playRate: 1,
          paused: false,
          imageDecoded: false,
          interpolate: false,
          boundTick: null
        }
      },
      mounted() {
        this.boundTick = this.tick.bind(this)
        this.ctx = this.$refs.canvas.getContext("2d")
        this.$refs.canvas.width = 16
        this.$refs.canvas.height = 16

        this.image.decode().then(() => {
          this.imageDecoded = true
          this.setMCMETA(this.mcmeta)
          if (!this.paused && "animation" in this.mcmeta) {
            this.play()
          }
        })
      },
      destroyed() {
        this.pause()
      },
      methods: {
        setMCMETA(mcmeta) {
          this.frames = []
          this.frame = 0
          this.frameTime = 0
          if (mcmeta.blur === true) {
            this.$refs.canvas.classList.add("blur")
          }
          if ("animation" in mcmeta) {
            const dft = mcmeta.animation.frametime || 1
            this.interpolate = mcmeta.animation.interpolate || false
            const ar = this.image.width / this.image.height
            let fw, fh
            if (!mcmeta.animation.width && !mcmeta.animation.height) {
              if (ar >= 1) {
                fw = this.image.height
                fh = this.image.height
              } else {
                fw = this.image.width
                fh = this.image.width
              }
            } else {
              fw = mcmeta.animation.width || this.image.width
              fh = mcmeta.animation.height || this.image.height
            }
            this.$refs.canvas.width = fw
            this.$refs.canvas.height = fh
            const fcx = this.image.width / fw
            const frames = mcmeta.animation.frames || Array(fcx * this.image.height / fh).fill(0).map((_, i) => i)
            frames.forEach(frame => {
              const index = typeof frame === "number" ? frame : frame.index
              const duration = typeof frame === "number" ? dft : frame.time || dft
              this.frames.push({
                index,
                duration: duration * 50,
                x: (index % fcx) * fw,
                y: Math.floor(index / fcx) * fh
              })
            })
          } else {
            this.paused = true
          }
        },
        play() {
          if (this.imageDecoded) {
            this.paused = false
            this.lastTick = performance.now()
            requestAnimationFrame(this.boundTick)
          }
        },
        pause() {
          this.paused = true
        },
        tick(now) {
          if (this.paused || this.frames.length === 0) return
          requestAnimationFrame(this.boundTick)
          this.frameTime += (now - this.lastTick) * this.playRate
          this.lastTick = now
          while (this.frameTime >= this.frames[this.frame].duration) {
            this.frameTime %= this.frames[this.frame].duration
            this.frame = (this.frame + 1) % this.frames.length
          }
          this.draw()
        },
        draw() {
          const frame = this.frames[this.frame]
          this.ctx.globalCompositeOperation = "copy"
          this.ctx.globalAlpha = 1
          this.ctx.drawImage(this.image, frame.x, frame.y, this.$refs.canvas.width, this.$refs.canvas.height, 0, 0, this.$refs.canvas.width, this.$refs.canvas.height)
          if (this.interpolate) {
            const nextFrame = this.frames[(this.frame + 1) % this.frames.length]
            this.ctx.globalCompositeOperation = "source-atop"
            this.ctx.globalAlpha = this.frameTime / frame.duration
            this.ctx.drawImage(this.image, nextFrame.x, nextFrame.y, this.$refs.canvas.width, this.$refs.canvas.height, 0, 0, this.$refs.canvas.width, this.$refs.canvas.height)
          }
        }
      }
    }
  }

  async function cacheDirectory() {
    if (!await exists(settings.cache_directory.value)) {
      return new Promise(fulfil => {
        new Dialog({
          title: "The cache directory was not found",
          lines: ["When prompted, please select a folder to cache downloaded content"],
          width: 512,
          buttons: ["dialog.ok"],
          onClose() {
            let dir
            while (!dir) {
              dir = Blockbench.pickDirectory({
                title: "Select a folder to cache downloaded content",
                startpath: settings.cache_directory.value
              })
            }
            settings.cache_directory.value = dir
            Settings.saveLocalStorages()
            fulfil()
          }
        }).show()
      })
    }
  }

  function exists(path) {
    return new Promise(async fulfil => {
      try {
        await fs.promises.access(path)
        fulfil(true)
      } catch {
        fulfil(false)
      }
    })
  }

  const td = new TextDecoder
  function parseZip(zip) {
    const ua = new Uint8Array(zip)
    const dv = new DataView(zip)

    const offEOCD = ua.findLastIndex((e, i, a) => e === 0x50 && a[i+1] === 0x4b && a[i+2] === 0x05 && a[i+3] === 0x06)
    const offCenDir = dv.getUint32(offEOCD + 16, true)
    const recordCount = dv.getUint16(offEOCD + 10, true)

    const parsedZip = {
      buffer: zip,
      array: ua,
      view: dv,
      eocdOffset: offEOCD,
      centralDirOffset: offCenDir,
      fileCount: recordCount,
      files: {}
    }

    for (let i = 0, o = offCenDir; i < recordCount; i++) {
      const n = dv.getUint16(o + 28, true)
      const m = dv.getUint16(o + 30, true)
      const k = dv.getUint16(o + 32, true)
      const encodedPath = ua.subarray(o + 46, o + 46 + n)
      const filePath = td.decode(encodedPath)

      if (!filePath.endsWith("/") && !/\.(class|nbt|mcassetsroot|mf|sf|dsa|rsa|jfc|xml|md)$|(?:^|\/)[^\/\.]+$|(?:^|\/)\./i.test(filePath)) {
        const h = dv.getUint32(o + 42, true)
        const q = dv.getUint16(h + 8,  true)
        const t = dv.getUint16(h + 10, true)
        const d = dv.getUint16(h + 12, true)
        const s = dv.getUint32(o + 20, true)
        const a = dv.getUint32(o + 24, true)
        const e = dv.getUint16(h + 28, true)

        parsedZip.files[filePath] = {
          path: filePath,
          compressedSize: s,
          size: a,
          crc32: dv.getUint32(o + 16, true),
          timeValue: t,
          dateValue: d,
          encodedPath,
          compressionMethod: q,
          compressedContent: ua.subarray(h + 30 + n + e, h + 30 + n + e + s),
          get image() {
            const img = new Image
            img.src = "data:image/png;base64," + this.content.toString("base64")
            return img
          }
        }
        if (q === 0) {
          parsedZip.files[filePath].content = Buffer.from(parsedZip.files[filePath].compressedContent)
        } else {
          Object.defineProperty(parsedZip.files[filePath], "content", {
            configurable: true,
            enumerable: true,
            get() {
              const c = zlib.inflateRawSync(this.compressedContent)
              Object.defineProperty(this, "content", {
                value: c,
                configurable: true,
                enumerable: true
              })
              return c
            }
          })
        }
      }

      o += 46 + n + m + k
    }

    return parsedZip
  }

  async function getVersionData(id) {
    const version = getVersion(id)
    if (version.data) {
      return version.data
    }
    const vanillaDataPath = PathModule.join(settings.minecraft_directory.value, "versions", id, id + ".json")
    if (await exists(vanillaDataPath)) {
      version.data = JSON.parse(await fs.promises.readFile(vanillaDataPath))
      return version.data
    }
    await cacheDirectory()
    const cacheDataPath = PathModule.join(settings.cache_directory.value, `data_${id}.json`)
    if (await exists(cacheDataPath)) {
      version.data = JSON.parse(await fs.promises.readFile(cacheDataPath))
      return version.data
    }
    version.data = await fetch(version.url).then(e => e.json())
    await fs.promises.writeFile(cacheDataPath, JSON.stringify(version.data), "utf-8")
    return version.data
  }

  async function getVersionJar(id) {
    let jar
    const jarPath = PathModule.join(settings.minecraft_directory.value, "versions", id, id + ".jar")
    if (await exists(jarPath)) {
      jar = parseZip((await fs.promises.readFile(jarPath)).buffer)
    } else {
      await cacheDirectory()
      const jarPath = PathModule.join(settings.cache_directory.value, id + ".jar")
      if (await exists(jarPath)) {
        jar = parseZip((await fs.promises.readFile(jarPath)).buffer)
      } else {
        const version = await getVersionData(id)
        const client = await fetch(version.downloads.client.url).then(e => e.arrayBuffer())
        fs.promises.writeFile(jarPath, new Uint8Array(client))
        jar = parseZip(client)
      }
    }
    return jar
  }

  function naturalSorter(as, bs) {
    let a, b, a1, b1, i = 0, n, L,
    rx = /(\.\d+)|(\d+(\.\d+)?)|([^\d.]+)|(\.\D+)|(\.$)/g
    if (as === bs) {
      return 0
    }
    if (typeof as !== 'string') {
      a = as.toString().toLowerCase().match(rx)
    } else {
      a = as.toLowerCase().match(rx)
    }
    if (typeof bs !== 'string') {
      b = bs.toString().toLowerCase().match(rx)
    } else {
      b = bs.toLowerCase().match(rx)
    }
    L = a.length
    while (i < L) {
      if (!b[i]) return 1
      a1 = a[i],
      b1 = b[i++]
      if (a1 !== b1) {
        n = a1 - b1
        if (!isNaN(n)) return n
        return a1 > b1 ? 1 : -1
      }
    }
    return b[i] ? -1 : 0
  }
})()