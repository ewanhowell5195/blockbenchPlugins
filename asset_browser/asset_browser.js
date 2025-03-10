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