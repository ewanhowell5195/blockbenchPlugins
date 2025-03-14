(() => {
  const child_process = require("node:child_process")
  const crypto = require("node:crypto")
  const os = require("node:os")

  let dialog, action, storage

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

  let loadedJars = {}

  const ignoredExtensions = ["class", "nbt", "mcassetsroot", "mf", "sf", "dsa", "rsa", "jfc", "xml", "md", "toml", "itransformationservice", "hex", "jar"]
  const ignoredExtensionsRoot = ["txt", "cfg"]
  const ignoredExtensionsRegex = new RegExp(`\\.(${ignoredExtensions.join("|")})$|(?:^|\/)[^\/\\.]+$|(?:^|\/)\\.`, "i")
  const ignoredExtensionsRootRegex = new RegExp(`^[^\\/]+\\.(?:${ignoredExtensionsRoot.join("|")})$`, "i")

  const javaBlock = {
    oneOf: new Set(["parent", "elements"]),
    items: new Set(["parent", "textures", "elements", "ambientocclusion", "gui_light", "display", "groups", "texture_size", "overrides"])
  }

  const titleCase = str => str.replace(/_|-/g, " ").replace(/\w\S*/g, str => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase())
  const shaCheck = async (path, sha) => crypto.createHash("sha1").update(await fs.promises.readFile(path)).digest("hex") === sha
  const save = () => localStorage.setItem(id, JSON.stringify(storage))

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
      storage = JSON.parse(localStorage.getItem(id) ?? "{}")
      storage.recents ??= []
      loadSidebar()
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
        name: "Ewan's Plugins - Minecraft Directory",
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
        name: "Ewan's Plugins - Cache Directory",
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
        width: 816,
        resizable: true,
        buttons: [],
        lines: [`<style>#${id} {
          user-select: none;

          .spacer {
            flex: 1;
          }

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
            flex: 1;
          }

          #index {
            padding: 16px;
          }

          hr {
            margin: 0;
            border: none;
            height: 1px;
            background-color: var(--color-border);
          }

          .index-row {
            display: flex;
            gap: 16px;
            overflow-y: auto;

            > hr {
              height: 100%;
              width: 1px;
            }
          }

          .index-column {
            flex: 1;
            display: flex;
            gap: 8px;
            flex-direction: column;
          }

          .index-heading {
            font-size: 24px;
          }

          .version-list {
            overflow-y: auto;

            .version {
              cursor: pointer;
              padding: 0 8px;
              height: 30px;
              display: flex;
              align-items: center;
              gap: 4px;

              &:hover {
                background-color: var(--color-selected);
                color: var(--color-light);

                svg {
                  fill: var(--color-light);
                }
              }

              span {
                display: flex;
                align-items: center
              }

              svg {
                fill: var(--color-text);
              }
            }
          }

          .no-results {
            color: var(--color-subtle_text);
          }

          #version-search {
            position: relative;

            input {
              width: 100%;
              padding-right: 32px;
            }

            i {
              position: absolute;
              right: 6px;
              top: 50%;
              transform: translateY(-50%);
              pointer-events: none;

              &.active {
                cursor: pointer;
                pointer-events: initial;
              }
            }
          }

          .checkbox-row {
            display: flex;
            gap: 4px;
            align-items: center;
            cursor: pointer;

            * {
              cursor: pointer;
            }
          }

          #loading {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            height: 100%;
            font-size: 24px;
          }

          #browser {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 0;
            align-content: flex-start;
          }

          #browser-header {
            background-color: var(--color-back);
            width: 100%;
            display: flex;

            > div:not(:last-child) {
              border-right: 2px solid var(--color-dark);
            }
          }

          #browser-navigation {
            display: flex;
            align-items: center;
            padding: 0 8px;

            .tool {
              margin: 0;
            }

            i {
              display: block;
              cursor: pointer;
              min-width: 36px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              position: relative;
              margin: 0;

              &:hover {
                background-color: var(--color-selected);
                color: var(--color-light);

                &.line-through::before {
                  background-color: var(--color-selected);
                }

                &.line-through::after {
                  background-color: var(--color-light);
                }
              }

              &.disabled {
                opacity: 0.5;
                pointer-events: none;
              }

              &.line-through::before {
                content: "";
                position: absolute;
                width: 24px;
                height: 7px;
                background-color: var(--color-back);
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(45deg);
              }

              &.line-through::after {
                content: "";
                position: absolute;
                width: 24px;
                height: 2px;
                background-color: var(--color-text);
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(45deg);
              }
            }
          }

          #breadcrumbs-home.overflow::before {
            content: "";
            width: 64px;
            background-image: linear-gradient(90deg, var(--color-back) 10%, transparent);
            position: absolute;
            top: 0;
            right: -64px;
            bottom: 0;
            pointer-events: none;
          }

          #breadcrumbs,
          #breadcrumbs-home {
            display: flex;
            padding: 8px 8px 0;
            gap: 24px;
            height: 48px;
            overflow-x: auto;
            align-items: flex-start;
            scrollbar-width: initial;
            scrollbar-color: initial;
            position: relative;

            &#breadcrumbs-home {
              overflow-x: visible;
              border-right: none;
              padding-right: 16px;
              z-index: 1;

              > div::after {
                content: "chevron_right";
              }
            }

            &::-webkit-scrollbar {
              height: 8px;
            }

            &::-webkit-scrollbar-thumb {
              background: var(--color-button);
              border-radius: 0;
              border-top: 2px solid var(--color-back);
              border-bottom: 2px solid var(--color-back);

              &:hover {
                background: var(--color-selected);
              }
            }

            &::-webkit-scrollbar-track {
              background: var(--color-back);
            }

            > div {
              padding: 4px 8px;
              cursor: pointer;
              position: relative;
              font-weight: 600;
              white-space: nowrap;

              &::after {
                font-family: "Material Icons";
                position: absolute;
                pointer-events: none;
                top: 50%;
                right: -12px;
                transform: translate(50%, -50%);
                font-size: 20px;
                opacity: 0.5;
                font-weight: 400;
              }

              &:not(:last-child)::after {
                content: "chevron_right";
              }

              &:hover {
                background-color: var(--color-selected);
                color: var(--color-light);
              }

              > i {
                display: block;
                margin: 0;
              }
            }

            .tooltip {
              font-weight: 400;
            }
          }

          #browser-sidebar,
          #files {
            height: calc(100% - 48px - 24px);
          }

          #browser-sidebar {
            width: 162px;
            border-right: 2px solid var(--color-back);
            overflow-y: auto;
            padding: 8px 0;
            transform: translateX(-162px);
            transition: transform .15s;

            ~ #files {
              margin-left: -162px;
              transition: margin-left .15s;
            }

            &.open {
              transform: initial;

              ~ #files {
                margin-left: 0;
              }
            }
          }

          .saved-folder {
            white-space: nowrap;
            padding: 0 12px;
            display: flex;
            align-items: center;
            height: 30px;
            cursor: pointer;
            gap: 4px;

            &:hover,
            &.active {
              color: var(--color-light);
              background-color: var(--color-selected);
            }

            > span {
              text-overflow: ellipsis;
              overflow: hidden;

              &:first-child {
                display: flex;
                align-items: center;
                min-width: 22px;
              }
            }
          }

          #files {
            display: grid;
            grid-template-columns: repeat(auto-fit, 114px);
            gap: 10px;
            overflow-y: auto;
            padding: 16px;
            flex: 1;
            align-content: start;

            > div {
              display: flex;
              align-items: center;
              text-align: center;
              flex-direction: column;
              padding: 0 4px 4px;
              cursor: pointer;
              font-size: 14px;
              word-break: break-word;

              &:hover {
                color: var(--color-light);
              }

              &.selected {
                background-color: var(--color-selected);
                color: var(--color-light);

                > i i {
                  color: var(--color-selected);
                }
              }

              * {
                cursor: pointer;
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
                position: relative;

                i {
                  position: absolute;
                  top: 20px;
                  min-width: 100%;
                  text-align: center;
                  color: var(--color-ui);
                  font-size: 32px;
                  left: 0;

                  &.fa {
                    font-size: 28px;
                  }
                }
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

          #browser-footer {
            width: 100%;
            background-color: var(--color-back);
            height: 24px;
            display: flex;
            align-items: center;
            padding: 0 8px;
            gap: 8px;
          }
        }</style>`],
        component: {
          data: {
            type: "release",
            manifest,
            selectedVersions: {},
            version: null,
            versionSearch: "",
            recentVersions: storage.recents,
            downloadedVersions: [],
            objects: storage.objects,
            jar: null,
            loadingMessage: null,
            path: [],
            tree: {},
            textureObserver: null,
            lastInteracted: null,
            shiftStartItem: null,
            selected: [],
            savedFolders: storage.savedFolders,
            sidebarVisible: true,
            navigationHistory: [],
            navigationFuture: [],
            breadcrumbsOverflowing: false,
            breadcrumbsResizeObserver: null,
            validSavedFolders: [],
            activeSavedFolder: null
          },
          components: {
            "animated-texture": animatedTexureComponent(),
            "lazy-scroller": lazyScrollerComponent() 
          },
          watch: {
            loadingMessage(val) {
              if (!val && this.jar) {
                this.getValidSavedFolders()
              }
              this.$nextTick(() => {
                if (!val && this.jar) {
                  this.setupBreadcrumbs()
                }
              })
            },
            savedFolders() {
              this.getValidSavedFolders()
            }
          },
          beforeDestroy() {
            this.breadcrumbsResizeObserver.disconnect()
          },
          computed: {
            currentFolderContents() {
              let current = this.tree
              for (const part of this.path) {
                if (!current[part]) return []
                current = current[part]
              }
              const entries = Object.entries(current).sort(([ka, va], [kb, vb]) => {
                const isFolderA = typeof va === "object" || ka.endsWith(".zip")
                const isFolderB = typeof vb === "object" || kb.endsWith(".zip")
                if (isFolderA && !isFolderB) return -1
                if (isFolderB && !isFolderA) return 1
                return naturalSorter(ka, kb)
              })
              this.lastInteracted = entries[0][0]
              this.selected = []
              return entries
            }
          },
          methods: {
            updateVersion() {
              if (this.selectedVersions[this.type]) {
                this.version = this.selectedVersions[this.type]
              }
            },
            async loadVersion() {
              this.loadingMessage = `Loading ${this.version}…`
              this.path = []
              this.navigationHistory = [[]]
              this.navigationFuture = []
              this.jar = await getVersionJar(this.version)
              if (!Object.keys(this.jar.files).length) {
                this.jar = null
                this.loadingMessage = null
                Blockbench.showQuickMessage("Unable to load version. It may be corrupted")
                return
              }
              if (this.objects) {
                for (const [k, v] of Object.entries(await getVersionObjects(this.version))) {
                  this.$set(this.jar.files, k, v)
                }
              }
              if (!this.jar.optifineLoaded && this.version.includes("OptiFine")) {
                const folderName = this.version.replace("-OptiFine", "")
                const libraryFile = PathModule.join(settings.minecraft_directory.value, "libraries", "optifine", "OptiFine", folderName, `OptiFine-${folderName}.jar`)
                if (await exists(libraryFile)) {
                  const zip = parseZip(await fs.promises.readFile(libraryFile).then(e => e.buffer))
                  for (const [k, v] of Object.entries(zip.files)) {
                    this.$set(this.jar.files, k, v)
                  }
                  this.jar.optifineLoaded = true
                }
              }
              this.tree = {}
              for (let [path, value] of Object.entries(this.jar.files)) {
                const parts = path.split("/")
                if (parts[0].startsWith("bedrock-samples")) {
                  parts.splice(0, 1)
                  this.$set(this.jar.files, parts.join("/"), value)
                  delete this.jar.files[path]
                  path = parts.join("/")
                }
                let current = this.tree
                const zip = parts.some(e => e.endsWith(".zip"))
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
              if (storage.recents.includes(this.version)) {
                storage.recents.splice(storage.recents.indexOf(this.version), 1)
              }
              storage.recents.unshift(this.version)
              storage.recents = storage.recents.slice(0, 20)
              save()
              this.loadingMessage = null
            },
            hasAnimation(file) {
              if (this.jar.files[file].animation === false) return
              if (this.jar.files[file].animation) return true
              if (this.jar.flipbook) {
                const split = file.split("/")
                if (split[0] === "resource_pack") {
                  const texture = split.slice(1).join("/").slice(0, -4)
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
            textureReady(file) {
              const data = this.jar.files[file]
              if (data.texture) return true
              this.getFileContent(file).then(e => {
                this.$set(data, "texture", "data:image/png;base64," + e.toString("base64"))
              })
            },
            select(file, value, event) {
              if (event.currentTarget.dataset.lastClick) {
                if (Date.now() - Number(event.currentTarget.dataset.lastClick) < 300) {
                  if (typeof value === "object") {
                    return this.openFolder(this.path.concat(file))
                  } else {
                    return this.openFiles()
                  }
                }
              }
              event.currentTarget.dataset.lastClick = Date.now()

              const keys = this.currentFolderContents.map(entry => entry[0])

              if (!event.shiftKey) {
                this.shiftStartItem = null
              }
              if (event.shiftKey) {
                if (!this.shiftStartItem) {
                  this.shiftStartItem = this.lastInteracted
                }
                const start = keys.indexOf(this.shiftStartItem)
                const selected = this.selected.includes(this.shiftStartItem)
                const end = keys.indexOf(file)
                const range = keys.slice(Math.min(start, end), Math.max(start, end) + 1)
                if (event.ctrlKey) {
                  if (selected) {
                    this.selected = Array.from(new Set(this.selected.concat(range)))
                  } else {
                    this.selected = this.selected.filter(e => !range.includes(e))
                  }
                } else {
                  this.selected = range
                }
              } else if (event.ctrlKey) {
                const index = this.selected.indexOf(file)
                if (index !== -1) {
                  this.selected.splice(index, 1)
                } else {
                  this.selected.push(file)
                }
              } else {
                this.selected = [file]
              }

              this.lastInteracted = file
            },
            async getFileContent(file) {
              const data = this.jar.files[file] ?? this.jar.zips?.[file]
              if (!data) return
              if (!data.content) {
                data.content = await fs.promises.readFile(data.path)
              }
              return data.content
            },
            async openFilesCheck() {
              if (this.selected.length <= 16) return true
              if (!await confirm("Open files", `You are about to open ${this.selected.length.toLocaleString()} files. Are you sure you want to continue?`)) return
              if (this.selected.length > 128) {
                if (!await confirm("Open files", `Are you really sure? ${this.selected.length.toLocaleString()} files is a lot. Are you absolutely sure you want to continue?`)) return
              }
              return true
            },
            async openFiles() {
              if (!(await this.openFilesCheck())) return
              const files = this.selected.map(e => ({
                name: e,
                path: this.path.concat(e).join("/")
              }))
              let closeDialog
              await Promise.all(files.map(async file => {
                const content = await this.getFileContent(file.path)
                if (!content) return
                if (file.name.endsWith(".png")) {
                  Codecs.image.load([{
                    content: "data:image/png;base64," + content.toString("base64")
                  }], name)
                  closeDialog = true
                } else if (file.name.endsWith(".zip")) {
                  await this.loadZip(file.path)
                  this.openFolder(this.path.concat(file.name))
                } else if (await this.blockbenchOpenable(file.path)) {
                  loadModelFile({
                    content: content.toString(),
                    path: file.name
                  })
                  closeDialog = true
                } else {
                  this.openExternally(file.path)
                }
              }))
              if (closeDialog) {
                dialog.close()
              }
            },
            async blockbenchOpenable(file) {
              const data = this.jar.files[file]
              if (data.blockbenchOpenable !== undefined) return data.blockbenchOpenable
              if (file.endsWith(".png") || file.endsWith(".zip")) {
                data.blockbenchOpenable = true
                return true
              }
              if (!file.endsWith(".json")) {
                data.blockbenchOpenable = false
                return false
              }
              data.blockbenchOpenable = false
              const content = await this.getFileContent(file)
              try {
                const fileData = JSON.parse(content)
                const keys = Object.keys(fileData)
                if (keys.every(e => javaBlock.items.has(e)) && keys.some(e => javaBlock.oneOf.has(e))) {
                  data.blockbenchOpenable = true
                } else if (keys.includes("format_version") && keys.some(e => e.includes("geometry"))) {
                  data.blockbenchOpenable = true
                }
              } catch {}
              return data.blockbenchOpenable
            },
            async openExternally(file) {
              const extension = PathModule.extname(file)
              const tempPath = PathModule.join(os.tmpdir(), `${PathModule.basename(file, extension)}_${new Date().toISOString().replace(/[:.]/g, "-")}${extension}`)
              fs.writeFileSync(tempPath, await this.getFileContent(file))
              exec(`"${tempPath}"`)
            },
            getVersionIcon(id) {
              id = id.toLowerCase()
              let icon = "history"
              if (id.includes("optifine")) icon = "icon-format_optifine"
              else if (id.includes("quilt")) icon = "widgets"
              else if (id.includes("neoforge")) return '<svg viewBox="-5 -10 110 110" width="22" height="22" fill-rule="evenodd"><path d="M42.914 28.332a16.67 16.67 0 0 0-12.652 5.82L14.231 52.855l34.777 29.281c.277.234.629.363.992.363a1.54 1.54 0 0 0 .992-.363l34.773-29.281-16.027-18.703a16.67 16.67 0 0 0-12.652-5.82zm-18.98.398c4.75-5.543 11.684-8.73 18.98-8.73h14.172c7.297 0 14.23 3.188 18.98 8.731l18.766 21.891a4.17 4.17 0 0 1 .988 3.051c-.09 1.105-.621 2.133-1.469 2.848L56.359 88.512a9.86 9.86 0 0 1-12.719 0L5.649 56.52c-.848-.715-1.379-1.742-1.469-2.848a4.17 4.17 0 0 1 .988-3.051z"/><path d="M80.762-.516a4.17 4.17 0 0 1 2.57 3.848V38.75H75V13.395L61.281 27.114l-5.895-5.895L76.223.388c1.191-1.191 2.981-1.547 4.539-.902zm-61.524 0a4.16 4.16 0 0 0-2.57 3.848V38.75H25V13.395l13.719 13.719 5.895-5.895L23.777.388c-1.191-1.191-2.98-1.547-4.539-.902zm65.957 49.243l-14.633 7.32A14.58 14.58 0 0 0 62.5 69.09v11.328h-8.332V69.09a22.92 22.92 0 0 1 12.668-20.5l14.633-7.316zm-70.39 0l14.633 7.32a14.58 14.58 0 0 1 8.063 13.043v11.328h8.332V69.09a22.92 22.92 0 0 0-12.668-20.5l-14.633-7.316z"/></svg>'
              else if (id.includes("forge")) return '<svg width="22" height="22" viewBox="0 0 105 105"><path d="M4.45 24.8h28.22v23.1C16.09 45.93 8.7 39.17 2.72 27.62c-.67-1.29.28-2.82 1.73-2.82zm98.05 5.81v-6.14a1.94 1.94 0 0 0-1.94-1.94H38.93a1.94 1.94 0 0 0-1.94 1.94v22.61a1.94 1.94 0 0 0 1.94 1.94H77.3c.79 0 1.5-.49 1.8-1.22 3.19-7.74 11.1-13.84 21.72-15.26a1.95 1.95 0 0 0 1.68-1.93zM73.24 53.63H41.55c1.93 4.94 1.89 9.6.24 13.52h30.8c-1.79-4.13-1.72-8.94.65-13.52zM41.79 67.14l-.21.5h31.24a7.55 7.55 0 0 1-.22-.5zm33.79 4.49H38.92c-2.72 2.99-6.69 5.17-11.65 6.14v4.71h60.6v-4.91c-5.27-.72-9.45-2.92-12.29-5.94z"/></svg>'
              else if (id.includes("fabric")) return '<svg viewBox="-5 -10 110 110" width="22" height="22"><path d="M15.625 85.625V53.93C10.25 52.536 6.25 47.684 6.25 41.875V13.75c0-6.894 5.605-12.5 12.5-12.5h62.5c6.894 0 12.5 5.606 12.5 12.5v71.875c0 1.727-1.398 3.125-3.125 3.125H18.75c-1.727 0-3.125-1.398-3.125-3.125zM12.5 13.75v28.125a6.26 6.26 0 0 0 6.25 6.25h51.738c-1.074-1.848-1.738-3.961-1.738-6.25V13.75c0-2.289.664-4.402 1.738-6.25H18.75a6.26 6.26 0 0 0-6.25 6.25zm75 21.875V13.75a6.26 6.26 0 0 0-6.25-6.25A6.26 6.26 0 0 0 75 13.75v28.125a6.26 6.26 0 0 0 6.25 6.25 6.26 6.26 0 0 0 6.25-6.25zm0 46.875V52.637c-1.848 1.074-3.961 1.738-6.25 1.738H21.875V82.5zM81.25 45c-1.727 0-3.125-1.398-3.125-3.125V13.75c0-1.727 1.398-3.125 3.125-3.125s3.125 1.398 3.125 3.125v28.125c0 1.727-1.398 3.125-3.125 3.125z"/></svg>'
              else if (id.includes("preview") || /^\d{2}w\d{2}[a-z]$/.test(id) || /^\d+\.\d+\.\d+-(?:pre|rc)\d+$/.test(id)) icon = "update"
              else if (id.startsWith("v")) icon = "icon-format_bedrock"
              else if (/^[\d\.]+$/.test(id)) icon = "icon-format_java"
              const element = Blockbench.getIconNode(icon)
              if (id.includes("quilt")) {
                element.style.rotate = "90deg"
              }
              return element.outerHTML
            },
            async getDetailedSelection() {
              const selected = await Promise.all(this.selected.map(async e => {
                const path = this.path.concat(e).join("/")
                const isFolder = !this.jar.files[path] || e.endsWith(".zip")
                return {
                  name: e,
                  path: path,
                  type: isFolder ? "folder" : "file",
                  openable: isFolder || await this.blockbenchOpenable(path),
                  project: e.endsWith(".png")
                }
              }))
              return [
                selected,
                selected.some(e => e.type === "folder") && selected.some(e => e.type === "file") ? "multi" : selected.some(e => e.type === "folder") ? "folder" : "file"
              ]
            },
            async fileContextMenu(name, event) {
              this.lastInteracted = name
              if (!this.selected.includes(name)) {
                this.selected = [name]
              }
              const [selected, selectionType] = await this.getDetailedSelection()
              new Menu("asset_browser_file", [
                {
                  id: "open",
                  name: "Open",
                  icon: selectionType === "folder" ? "folder_open" : "file_open",
                  condition: selectionType !== "multi" && (selectionType === "folder" && selected.length === 1 || selectionType === "file" && selected.some(e => e.openable)),
                  click: () => selectionType === "folder" ? this.path.push(selected[0].name) : this.openFiles()
                },
                {
                  id: "open_externally",
                  name: "Open Externally",
                  icon: "open_in_new",
                  condition: selected.every(e => e.type === "file" || e.name.endsWith("zip")),
                  click: async () => {
                    if (!(await this.openFilesCheck())) return
                    for (const file of selected) {
                      this.openExternally(file.path)
                    }
                  }
                },
                "_",
                {
                  id: "add_to_project",
                  name: "Add to Project",
                  icon: "enable",
                  condition: Project && selectionType === "file" && selected.some(e => e.project),
                  click: async () => {
                    if (!(await this.openFilesCheck())) return
                    dialog.close()
                    for (const file of selected) {
                      if (file.project) {
                        new Texture({
                          name: PathModule.basename(file.name),
                        }).fromDataURL("data:image/png;base64," + (await this.getFileContent(file.path)).toString("base64")).add()
                      }
                    }
                  }
                },
                {
                  id: "pin_to_sidebar",
                  name: "Pin to Sidebar",
                  icon: "push_pin",
                  condition: selectionType === "folder" && selected.some(e => !this.savedFolders.some(saved => saved.join("/") === e.path)),
                  click: () => {
                    for (const folder of selected) {
                      if (!this.savedFolders.some(saved => saved.join("/") === folder.path)) {
                        storage.savedFolders.push(this.path.slice().concat(folder.name))
                      }
                    }
                    save()
                  }
                },
                {
                  id: "unpin_from_sidebar",
                  name: "Unpin from Sidebar",
                  icon: "push_pin",
                  condition: selectionType === "folder" && !selected.some(e => !this.savedFolders.some(saved => saved.join("/") === e.path)),
                  click: () => {
                    for (const folder of selected) {
                      const index = this.savedFolders.findIndex(e => e.join("/") === folder.path)
                      if (index !== -1) {
                        storage.savedFolders.splice(index, 1)
                      }
                    }
                    save()
                  }
                }
              ]).show(event)
            },
            async sidebarItemContextMenu(folder, event) {
              this.activeSavedFolder = folder
              const item = new Menu("asset_browser_sidebar_item", [
                {
                  id: "open",
                  name: "Open",
                  icon: "folder_open",
                  click: () => this.path = folder.slice()
                },
                "_",
                {
                  id: "move_up",
                  name: "Move Up",
                  icon: "arrow_upward",
                  condition: this.validSavedFolders[0] !== folder,
                  click: () => {
                    storage.savedFolders.splice(storage.savedFolders.indexOf(folder), 1)
                    storage.savedFolders.splice(storage.savedFolders.indexOf(this.validSavedFolders[this.validSavedFolders.indexOf(folder) - 1]), 0, folder)
                    save()
                  }
                },
                {
                  id: "move_down",
                  name: "Move Down",
                  icon: "arrow_downward",
                  condition: this.validSavedFolders[this.validSavedFolders.length - 1] !== folder,
                  click: () => {
                    storage.savedFolders.splice(storage.savedFolders.indexOf(folder), 1)
                    storage.savedFolders.splice(storage.savedFolders.indexOf(this.validSavedFolders[this.validSavedFolders.indexOf(folder) + 1]) + 1, 0, folder)
                    save()
                  }
                },
                "_",
                {
                  id: "unpin_from_sidebar",
                  name: "Unpin from Sidebar",
                  icon: "push_pin",
                  click: () => {
                    storage.savedFolders.splice(storage.savedFolders.indexOf(folder), 1)
                    save()
                  }
                },
                "_",
                {
                  id: "reset",
                  name: "Reset Sidebar",
                  icon: "replay",
                  click: () => {
                    loadSidebar(true)
                  }
                }
              ], {
                onClose: () => this.activeSavedFolder = null
              }).show(event)
            },
            async sidebarContextMenu(event) {
              new Menu("asset_browser_sidebar", [
                {
                  id: "reset",
                  name: "Reset Sidebar",
                  icon: "replay",
                  click: () => {
                    loadSidebar(true)
                  }
                }
              ]).show(event)
            },
            getFileIcon(file) {
              if (file.endsWith(".json") || file === "pack.mcmeta") return "data_object"
              if (file.endsWith(".fsh") || file.endsWith(".vsh") || file.endsWith(".glsl")) return "ev_shadow"
              if (file.includes(".mcmeta")) return "theaters"
              if (file.includes(".tga")) return "image"
              if (file.endsWith(".ogg") || file.endsWith(".fsb")) return "volume_up"
              if (file.includes(".zip")) return "folder_zip"
              if (file.includes(".properties")) return "list_alt"
              if (file.includes(".txt")) return "description"
              return "draft"
            },
            getFolderIcon(path) {
              if (!Array.isArray(path)) {
                path = [path]
              }
              let icon = "folder"
              if (path.includes("textures")) icon = "image"
              else if (path.includes("models") || path.includes("blocks") || path.includes("block")) icon = "deployed_code"
              else if (path.includes("items") || path.includes("item")) icon = "swords"
              else if (path.includes("sounds")) icon = "volume_up"
              else if (path.includes("shaders")) icon = "ev_shadow"
              else if (path.includes("lang")) icon = "translate"
              else if (path.includes("texts")) icon = "text_fields"
              else if (path.includes("particles") || path.includes("particle")) icon = "auto_awesome"
              else if (path.includes("atlases") || path.includes("map")) icon = "map"
              else if (path.includes("font")) icon = "font_download"
              else if (path.includes("post_effect")) icon = "desktop_windows"
              else if (path.includes("resourcepacks")) icon = "folder_zip"
              else if (path.includes("equipment")) icon = "checkroom"
              else if (path.includes("blockstates")) icon = "view_in_ar"
              else if (path.includes("entities") || path.includes("entity") || path.includes("mob")) icon = "pets"
              else if (path.includes("painting")) icon = "brush"
              else if (path.includes("gui") || path.includes("ui")) icon = "call_to_action"
              else if (path.includes("environment")) icon = "light_mode"
              else if (path.includes("colormap")) icon = "palette"
              else if (path.includes("misc")) icon = "help"
              else if (path.includes("trims")) icon = "fa-gem"
              else if (path.includes("effect") || path.includes("mob_effect")) icon = "auto_fix"
              else if (path.includes("optifine") || path.includes("mob_effect")) icon = "icon-format_optifine"
              else if (path.includes("persona_thumbnails")) icon = "groups"
              else if (path.includes("animations")) icon = "sync"
              else if (path.includes("animation_controllers")) icon = "rule_settings"
              else if (path.includes("render_controllers")) icon = "visibility"
              else if (path.includes("fogs")) icon = "foggy"
              else if (path.includes("attachables")) icon = "electrical_services"
              return Blockbench.getIconNode(icon).outerHTML
            },
            openFolder(path) {
              if (JSON.stringify(path) !== JSON.stringify(this.path)) {
                this.changeFolder(path)
                this.navigationHistory.push(path.slice())
                this.navigationFuture = []
              }
            },
            changeFolder(path) {
              this.path = path.slice()
              this.$nextTick(() => this.checkBreadcrumbsOverflow())
            },
            navigationBack() {
              this.navigationFuture.push(this.navigationHistory.pop())
              this.changeFolder(this.navigationHistory[this.navigationHistory.length - 1])
            },
            navigationForward() {
              this.navigationHistory.push(this.navigationFuture.pop())
              this.changeFolder(this.navigationHistory[this.navigationHistory.length - 1])
            },
            toggleObjects() {
              this.objects = !this.objects
              storage.objects = this.objects
              if (!this.objects) {
                loadedJars = {}
              }
              save()
            },
            setupBreadcrumbs() {
              if (!this.breadcrumbsResizeObserver) {
                this.breadcrumbsResizeObserver = new ResizeObserver(() => {
                  this.checkBreadcrumbsOverflow()
                })
              }

              this.breadcrumbsResizeObserver.observe(this.$refs.breadcrumbs)
              this.checkBreadcrumbsOverflow()

              if (!this.$refs.breadcrumbs.dataset.scrollListenerAdded) {
                this.$refs.breadcrumbs.addEventListener("scroll", this.handleBreadcrumbsScroll)
                this.$refs.breadcrumbs.dataset.scrollListenerAdded = true
              }
            },
            checkBreadcrumbsOverflow() {
              if (this.$refs.breadcrumbs) {
                this.breadcrumbsOverflowing = this.$refs.breadcrumbs.scrollWidth > this.$refs.breadcrumbs.clientWidth
                this.$refs.breadcrumbs.scrollLeft = this.$refs.breadcrumbs.scrollWidth
              }
            },
            handleBreadcrumbsScroll() {
              if (this.$refs.breadcrumbs.scrollLeft) {
                this.breadcrumbsOverflowing = this.$refs.breadcrumbs.scrollWidth > this.$refs.breadcrumbs.clientWidth
              } else {
                this.breadcrumbsOverflowing = false
              }
            },
            async loadZip(file) {
              const content = await this.getFileContent(file)
              const zip = parseZip(content.buffer, false)

              const parts = file.split("/")
              let current = this.tree

              for (let i = 0; i < parts.length - 1; i++) {
                current = current[parts[i]]
              }
              const lastPart = parts[parts.length - 1]
              this.$set(current, lastPart, {})
              current = current[lastPart]

              for (const [key, zipFile] of Object.entries(zip.files)) {
                const fullPath = `${file}/${key}`
                this.$set(this.jar.files, fullPath, zipFile)

                const subParts = key.split("/")
                let subCurrent = current

                for (const [index, subPart] of subParts.entries()) {
                  if (!subCurrent[subPart]) {
                    this.$set(subCurrent, subPart, index === subParts.length - 1 ? fullPath : {})
                  }
                  subCurrent = subCurrent[subPart]
                }
              }

              this.jar.zips ??= {}
              this.jar.zips[file] = this.jar.files[file]
              delete this.jar.files[file]

              return current
            },
            async getValidSavedFolders() {
              this.validSavedFolders = (await Promise.all(this.savedFolders.map(async (folder) => {
                let current = this.tree
                for (const segment of folder) {
                  if (typeof current === "string" && current.endsWith(".zip")) {
                    current = await this.loadZip(current)
                  } else if (typeof current === "object" && typeof current[segment] === "string" && segment.endsWith(".zip")) {
                    current[segment] = await this.loadZip(current[segment])
                  }
                  if (!current || typeof current !== "object" || !(segment in current)) {
                    return null
                  }
                  current = current[segment]
                }
                return folder
              }))).filter(Boolean)
            },
            async keydownHandler(event) {
              if (this.jar && !this.loadingMessage) {
                if (event.ctrlKey && event.key === "a") {
                  this.selected = this.currentFolderContents.map(e => e[0])
                } else if (event.key === "Escape") {
                  event.stopPropagation()
                  this.selected = []
                } else if (event.key === "Enter") {
                  event.stopPropagation()
                  const [selected, selectionType] = await this.getDetailedSelection()
                  if (selectionType !== "folder") {
                    this.openFiles()
                  } else if (selected.length === 1) {
                    this.path.push(selected[0].name)
                  }
                } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
                  if (!this.selected.length || this.selected.length > 1) {
                    this.selected = [this.lastInteracted]
                  } else if (this.selected.length === 1) {
                    const container = this.$refs.files.$el
                    const index = this.currentFolderContents.findIndex(e => e[0] === this.selected[0])
                    if (event.key === "ArrowLeft") {
                      if (index > 0) {
                        this.selected = [this.currentFolderContents[index - 1][0]]
                      }
                    } else if (event.key === "ArrowRight") {
                      if (index < this.currentFolderContents.length - 1) {
                        this.selected = [this.currentFolderContents[index + 1][0]]
                      }
                    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                      const styles = getComputedStyle(container)
                      const gap = parseInt(styles.columnGap)
                      const itemsPerRow = Math.max(1, Math.floor((container.clientWidth - parseInt(styles.padding) * 2 + gap) / (container.children[0].offsetWidth + gap)))
                      if (event.key === "ArrowUp") {
                        if (index >= itemsPerRow) {
                          this.selected = [this.currentFolderContents[index - itemsPerRow][0]]
                        }
                      } else if (event.key === "ArrowDown") {
                        if (index + itemsPerRow < this.currentFolderContents.length) {
                          this.selected = [this.currentFolderContents[index + itemsPerRow][0]]
                        }
                      }
                    }
                    const selectedElement = container.children[this.currentFolderContents.findIndex(e => e[0] === this.selected[0])]
                    const containerRect = container.getBoundingClientRect()
                    const elementRect = selectedElement.getBoundingClientRect()
                    if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
                      selectedElement.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest"
                      })
                    }
                  }
                }
              }
            }
          },
          template: `
            <div id="${id}-container" tabindex="0" @keydown="keydownHandler" @click="event.target.tagName === 'INPUT' ? null : event.currentTarget.focus()">
              <div v-if="!jar && !loadingMessage" id="index">
                <div class="index-row">
                  <div class="index-column">
                    <div class="index-heading">Release Type</div>
                    <select-input v-model="type" :options="manifest.types" @input="updateVersion" />
                  </div>
                  <div class="index-column">
                    <div class="index-heading">Minecraft Version</div>
                    <template v-for="id in Object.keys(manifest.types)">
                      <select-input v-if="type === id" v-model="selectedVersions[id]" :options="Object.fromEntries(manifest.versions.filter(e => e.type === id).map(e => [e.id, e.id]))" @input="updateVersion" />
                    </template>
                  </div>
                </div>
                <button @click="updateVersion(); loadVersion()">Load Assets</button>
                <hr>
                <div id="version-search">
                  <input type="text" placeholder="Filter…" class="dark_bordered" v-model="versionSearch" ref="entry" @input="versionSearch = versionSearch.toLowerCase()">
                  <i class="material-icons" :class="{ active: versionSearch }" @click="versionSearch = ''; setTimeout(() => $refs.entry.focus(), 0)">{{ versionSearch ? "clear" : "search" }}</i>
                </div>
                <div class="index-row" style="flex: 1;">
                  <div class="index-column">
                    <div class="index-heading">Recently Viewed</div>
                    <div class="version-list">
                      <template v-if="recentVersions.some(id => id.toLowerCase().includes(versionSearch))">
                        <div v-for="id in recentVersions" v-if="id.toLowerCase().includes(versionSearch)" class="version" @click="version = id; loadVersion()">
                          <span v-html="getVersionIcon(id)"></span>
                          <span>{{ id }}</span>
                        </div>
                      </template>
                      <div v-else class="no-results">No recently viewed versions</div>
                    </div>
                  </div>
                  <hr>
                  <div class="index-column">
                    <div class="index-heading">Downloaded Versions</div>
                    <div class="version-list">
                      <template v-if="downloadedVersions.some(data => data.id.toLowerCase().includes(versionSearch))">
                        <div v-for="data in downloadedVersions" v-if="data.id.toLowerCase().includes(versionSearch)" class="version" @click="version = data.id; loadVersion()">
                          <span v-html="getVersionIcon(data.id)"></span>
                          <span>{{ data.id }}</span>
                        </div>
                      </template>
                      <div v-else class="no-results">No downloaded versions</div>
                    </div>
                  </div>
                </div>
                <hr>
                <label class="checkbox-row">
                  <input type="checkbox" :checked="objects" @input="toggleObjects">
                  <div>Include objects (sounds, languages, panorama, etc…)</div>
                </label>
              </div>
              <div v-else-if="loadingMessage" id="loading">
                <div>{{ loadingMessage }}</div>
              </div>
              <div v-else id="browser">
                <div id="browser-header">
                  <div id="browser-navigation">
                    <div v-if="validSavedFolders.length" class="tool" @click="sidebarVisible = !sidebarVisible">
                      <div class="tooltip">{{ sidebarVisible ? "Collapse Sidebar" : "Open Sidebar" }}</div>
                      <i class="material-icons">{{ sidebarVisible ? "left_panel_close" : "left_panel_open" }}</i>
                    </div>
                    <i class="material-icons" :class="{ disabled: navigationHistory.length === 1 }" @click="navigationBack">arrow_back</i>
                    <i class="material-icons" :class="{ disabled: !navigationFuture.length }" @click="navigationForward">arrow_forward</i>
                    <i class="material-icons" :class="{ disabled: !path.length }" @click="changeFolder(path.slice(0, -1))">arrow_upward</i>
                  </div>
                  <div id="breadcrumbs-home" :class="{ overflow: breadcrumbsOverflowing }">
                    <div class="tool" @click="jar = null">
                      <div class="tooltip">
                        <span>Home</span>
                        <div class="tooltip_description">Go back to the version selector</div>
                      </div>
                      <i class="material-icons">home</i>
                    </div>
                  </div>
                  <div id="breadcrumbs" ref="breadcrumbs">
                    <div @click="openFolder([])">{{ version }}</div>
                    <div v-for="[i, part] of path.entries()" @click="openFolder(path.slice(0, i + 1))">{{ part }}</div>
                  </div>
                </div>
                <div v-if="validSavedFolders.length" id="browser-sidebar" :class="{ open: sidebarVisible }" @contextmenu.self="sidebarContextMenu">
                  <div v-for="folder of validSavedFolders" :key="folder.join()" class="saved-folder" @click="openFolder(folder)" @contextmenu="sidebarItemContextMenu(folder, $event)" :class="{ active: folder === activeSavedFolder }">
                    <span v-html="getFolderIcon(folder)"></span>
                    <span>{{ folder[folder.length - 1] }}</span>
                  </div>
                </div>
                <lazy-scroller id="files" :items="currentFolderContents" @click="selected = []" ref="files">
                  <template #default="{ file, value }">
                    <div @click="select(file, value, $event)" @contextmenu="fileContextMenu(file, $event)" :class="{ selected: selected.includes(file) }">
                      <template v-if="typeof value === 'object'">
                        <i v-if="file.endsWith('.zip')" class="material-icons">folder_zip</i>
                        <i v-else class="material-icons">
                          <span>folder</span>
                          <span v-if="!getFolderIcon(file).includes('>folder<')" v-html="getFolderIcon(file)"></span>
                        </i>
                      </template>
                      <template v-else-if="value.endsWith('.png') && hasAnimation(value)">
                        <animated-texture :image="jar.files[value].image" :mcmeta="jar.files[value].animation" />
                      </template>
                      <template v-else-if="value.endsWith('.png')">
                        <img v-if="textureReady(value)" :src="jar.files[value].texture">
                        <i v-else class="material-icons">image</i>
                      </template>
                      <template v-else>
                        <i class="material-icons">{{ getFileIcon(file) }}</i>
                      </template>
                      <div>{{ file.replace(/(_|\\.)/g, '$1​') }}</div>
                    </div>
                  </template>
                </lazy-scroller>
                <div id="browser-footer">
                  <div>{{ currentFolderContents.length.toLocaleString() }} item{{ currentFolderContents.length === 1 ? "" : "s" }}</div>
                  <template v-if="selected.length">
                    <div style="width: 1px; height: 12px; background-color: var(--color-subtle_text); opacity: 0.25;"></div>
                    <div>{{ selected.length.toLocaleString() }} selected</div>
                  </template>
                  <div class="spacer"></div>
                </div>
              </div>
            </div>
          `
        },
        async onBuild() {
          this.object.style.height = "512px"
          const [data, bedrock] = await Promise.all([
            fetch("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json").then(e => e.json()),
            fetch("https://api.github.com/repos/Mojang/bedrock-samples/releases").then(e => e.ok ? e.json() : [])
          ])
          for (const version of bedrock) {
            data.versions.push({
              id: version.tag_name,
              type: version.prerelease ? "bedrock-preview" : "bedrock",
              data: {
                type: version.prerelease ? "bedrock-preview" : "bedrock",
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
          loadDownloadedVersions()
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
                    loadDownloadedVersions()
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
          if (!this.$refs.canvas) return
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

  function lazyScrollerComponent() {
    return {
      template: `
        <div ref="viewport" @scroll="onScroll" @click.self="$emit('click')">
          <template v-for="item of visibleItems">
            <slot :file="item[0]" :value="item[1]"></slot>
          </template>
          <div v-if="padderHeight" :style="{ height: padderHeight + 'px', gridColumn: '1 / -1' }"></div>
        </div>
      `,
      props: {
        items: Array
      },
      data() {
        return {
          visibleItems: [],
          lastLoadedIndex: 0,
          batchSize: 128,
          padderHeight: 128
        }
      },
      watch: {
        items: {
          handler() {
            this.resetScroller()
          },
          deep: true
        }
      },
      mounted() {
        this.loadMore()
        const viewport = this.$refs.viewport
        this.resizeObserver = new ResizeObserver(() => {
          const firstItem = viewport.children[0]
          const itemHeight = firstItem.offsetHeight
          const gap = parseFloat(getComputedStyle(viewport).gap) || 0
          const columns = Math.floor(viewport.clientWidth / firstItem.offsetWidth) || 1
          this.padderHeight = (Math.ceil(this.items.length / columns) - Math.ceil(this.visibleItems.length / columns)) * (itemHeight + gap)
        })
        this.resizeObserver.observe(viewport)
      },
      beforeDestroy() {
        if (this.resizeObserver) {
          this.resizeObserver.disconnect()
        }
      },
      methods: {
        onScroll() {
          const viewport = this.$refs.viewport
          const lastItem = viewport.children[viewport.children.length - 2]

          const lastItemRect = lastItem.getBoundingClientRect()
          const viewportRect = viewport.getBoundingClientRect()

          if (lastItemRect.bottom <= viewportRect.bottom + 128) {
            this.loadMore()
          }

          this.resizeObserver.disconnect()
          this.resizeObserver.observe(viewport)
        },
        loadMore() {
          if (this.lastLoadedIndex >= this.items.length) return

          this.visibleItems.push(...this.items.slice(this.lastLoadedIndex, this.lastLoadedIndex + this.batchSize))
          this.lastLoadedIndex += this.batchSize
        },
        resetScroller() {
          this.visibleItems = []
          this.lastLoadedIndex = 0
          this.loadMore()
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
            loadDownloadedVersions()
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
  function parseZip(zip, ignoreRoot = true) {
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

      if (!filePath.endsWith("/") && !ignoredExtensionsRegex.test(filePath) && (!ignoreRoot || !ignoredExtensionsRootRegex.test(filePath))) {
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

  function getVersion(id) {
    let version = manifest.versions.find(e => e.id === id)
    if (!version) {
      const dataPath = loadedJars[id].files["version.json"]
      if (dataPath) {
        try {
          const data = JSON.parse(dataPath.content)
          version = manifest.versions.find(e => e.id === data.id)
        } catch {}
      }
    }
    return version
  }

  async function getVersionData(id) {
    const version = getVersion(id)
    if (version.data) {
      return version.data
    }
    const vanillaDataPath = PathModule.join(settings.minecraft_directory.value, "versions", version.id, version.id + ".json")
    if (await exists(vanillaDataPath)) {
      version.data = JSON.parse(await fs.promises.readFile(vanillaDataPath))
      return version.data
    }
    await cacheDirectory()
    const cacheDataPath = PathModule.join(settings.cache_directory.value, `data_${version.id}.json`)
    if (await exists(cacheDataPath)) {
      version.data = JSON.parse(await fs.promises.readFile(cacheDataPath))
      return version.data
    }
    version.data = await fetch(version.url).then(e => e.json())
    await fs.promises.writeFile(cacheDataPath, JSON.stringify(version.data), "utf-8")
    return version.data
  }

  async function getVersionAssetsIndex(version) {
    const vanillaAssetsIndexPath = PathModule.join(settings.minecraft_directory.value, "assets", "indexes", version.assets + ".json")
    if (await exists(vanillaAssetsIndexPath)) {
      if (await shaCheck(vanillaAssetsIndexPath, version.assetIndex.sha1)) {
        version.assetsIndex = JSON.parse(await fs.promises.readFile(vanillaAssetsIndexPath))
        return version.assetsIndex
      } else {
        version.assetsIndex = await fetch(version.assetIndex.url).then(e => e.json())
        await fs.promises.writeFile(vanillaAssetsIndexPath, JSON.stringify(version.assetsIndex), "utf-8")
      }
    }
    await cacheDirectory()
    const cacheAssetsIndexPath = PathModule.join(settings.cache_directory.value, `assets_index_${version.assets}.json`)
    if (await exists(cacheAssetsIndexPath) && await shaCheck(cacheAssetsIndexPath, version.assetIndex.sha1)) {
      version.assetsIndex = JSON.parse(await fs.promises.readFile(cacheAssetsIndexPath))
      return version.assetsIndex
    }
    version.assetsIndex = await fetch(version.assetIndex.url).then(e => e.json())
    await fs.promises.writeFile(cacheAssetsIndexPath, JSON.stringify(version.assetsIndex), "utf-8")
    return version.assetsIndex
  }

  async function getVersionJar(id) {
    if (loadedJars[id]) return loadedJars[id]
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
        dialog.content_vue.loadingMessage = `Downloading ${id}…`
        const client = await fetch(version.downloads.client.url).then(e => e.arrayBuffer())
        fs.promises.writeFile(jarPath, new Uint8Array(client))
        jar = parseZip(client)
        loadDownloadedVersions()
      }
    }
    loadedJars[id] = jar
    return jar
  }

  async function getVersionObjects(id) {
    if (!getVersion(id)) return {}
    const version = await getVersionData(id)
    if (version.type.includes("bedrock")) return {}
    if (version.objects) return version.objects
    const assetsIndex = version.assetsIndex ?? await getVersionAssetsIndex(version)
    const root = getRoot(id)
    const objectsEntries = Object.entries(assetsIndex.objects)
    await cacheDirectory()

    version.objects = {}

    dialog.content_vue.loadingMessage = `Loading ${id} objects…`

    for (let i = 0; i < objectsEntries.length; i += 256) {
      const files = []
      for (const [file, data] of objectsEntries.slice(i, i + 256)) {
        files.push(new Promise(async fulfil => {
          const objectPath = `${data.hash.slice(0, 2)}/${data.hash}`
          const packPath = file === "pack.mcmeta" ? file : PathModule.join(root, file).replaceAll("\\", "/")
          const vanillaObjectPath = PathModule.join(settings.minecraft_directory.value, "assets", "objects", objectPath)
          if (await exists(vanillaObjectPath)) {
            version.objects[packPath] = { path: vanillaObjectPath }
          } else {
            const cacheObjectPath = PathModule.join(settings.cache_directory.value, "objects", objectPath)
            if (!(await exists(cacheObjectPath))) {
              const object = new Uint8Array(await fetch(`https://resources.download.minecraft.net/${objectPath}`).then(e => e.arrayBuffer()))
              await fs.promises.mkdir(PathModule.dirname(cacheObjectPath), { recursive: true })
              await fs.promises.writeFile(cacheObjectPath, object)
            }
            version.objects[packPath] = { path: cacheObjectPath }
          }
          this.done++
          fulfil()
        }))
      }
      await Promise.all(files)
    }

    return version.objects
  }

  function getRoot(id) {
    const version = getVersion(id)
    if (Date.parse(version.releaseTime) >= 1403106748000 || version.data.assets === "1.7.10") {
      return "assets"
    }
    return "assets/minecraft"
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

  async function loadDownloadedVersions() {
    const downloadedVersions = []
    const versionsFolder = PathModule.join(settings.minecraft_directory.value, "versions")
    if (await exists(versionsFolder)) {
      for (const entry of await fs.promises.readdir(versionsFolder, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const jarPath = PathModule.join(versionsFolder, entry.name, `${entry.name}.jar`)
        if (await exists(jarPath)) {
          downloadedVersions.push({
            id: entry.name,
            date: await fs.promises.stat(jarPath).then(e => e.birthtime)
          })
        }
      }
    }
    const cacheFolder = PathModule.join(settings.cache_directory.value)
    if (await exists(cacheFolder)) {
      for (const entry of await fs.promises.readdir(cacheFolder, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".jar")) continue
        downloadedVersions.push({
          id: entry.name.slice(0, -4),
          date: await fs.promises.stat(PathModule.join(cacheFolder, entry.name)).then(e => e.birthtime)
        })
      }
    }
    dialog.content_vue.downloadedVersions = downloadedVersions.sort((a, b) => b.date - a.date)
  }

  async function loadSidebar(force) {
    const defaults = [
      ["assets", "minecraft", "textures"],
      ["assets", "minecraft", "models"],
      ["assets", "minecraft", "textures", "block"],
      ["assets", "minecraft", "textures", "item"],
      ["assets", "minecraft", "textures", "blocks"],
      ["assets", "minecraft", "textures", "items"],
      ["assets", "minecraft", "textures", "entity"],
      ["assets", "minecraft", "models", "block"],
      ["assets", "minecraft", "models", "item"],
      ["resource_pack", "textures"],
      ["resource_pack", "textures", "blocks"],
      ["resource_pack", "textures", "items"],
      ["resource_pack", "textures", "entity"],
      ["resource_pack", "models", "entity"]
    ]
    if (force) {
      if (await confirm("Reset Sidebar", "Are you sure you want to reset the sidebar?")) {
        storage.savedFolders.length = 0
        storage.savedFolders.push(...defaults)
        save()
      }
    } else {
      storage.savedFolders ??= defaults
    }
  }

  function confirm(title, message) {
    return new Promise(fulfil => Blockbench.showMessageBox({
      title,
      message,
      buttons: ["dialog.confirm", "dialog.cancel"]
    }, async button => {
      if (button === 0) {
        fulfil(true)
      } else {
        fulfil(false)
      }
    }))
  }
})()