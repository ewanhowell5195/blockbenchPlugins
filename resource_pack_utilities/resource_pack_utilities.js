(() => {
  const path = require("node:path")
  const os = require("node:os")
  let dialog, action
  const id = "resource_pack_utilities"
  const name = "Resource Pack Utilities"
  const icon = "construction"
  const description = "Utilities for working with resource packs"

  const setupPlugin = () => Plugin.register(id, {
    title: name,
    icon: "icon.png",
    author: "Ewan Howell",
    description,
    tags: ["yes"],
    version: "1.0.0",
    min_version: "4.10.0",
    variant: "desktop",
    website: `https://ewanhowell.com/plugins/${id.replace(/_/g, "-")}/`,
    repository: `https://github.com/ewanhowell5195/blockbenchPlugins/tree/main/${id}`,
    bug_tracker: `https://github.com/ewanhowell5195/blockbenchPlugins/issues?title=[${name}]`,
    creation_date: "2024-06-18",
    has_changelog: true,
    onload() {
      let directory
      if (os.platform() === "win32") {
        directory = path.join(os.homedir(), "AppData", "Roaming", ".minecraft")
      } else if (os.platform() === "darwin") {
        directory = path.join(os.homedir(), "Library", "Application Support", "minecraft")
      } else {
        directory = path.join(os.homedir(), ".minecraft")
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
      const methods = {
        selectFolder(title = "folder", key = "folder") {
          const dir = Blockbench.pickDirectory({
            title: `Select ${title}`,
            startpath: path.join(settings.minecraft_directory.value, "resourcepacks")
          })
          if (dir) {
            this[key] = dir
          }
        }
      }
      dialog = new Dialog({
        id,
        title: name,
        width: 780,
        buttons: [],
        cancel_on_click_outside: false,
        lines: [`<style>#${id} {
          .dialog_content {
            margin: 0;
          }

          button:disabled {
            opacity: .5;
            cursor: not-allowed;

            &:hover {
              background-color: var(--color-button);
              color: var(--color-text) !important;
            }
          }

          button.has-icon {
            text-decoration: none;

            &:focus span {
              text-decoration: underline
            }
          }

          button.material-icons {
            min-width: 32px;
            padding: 0;

            &:focus {
              text-decoration: none;
              color: var(--color-light);
            }

            &.icon {
              background-color: initial;

              &:focus {
                color: var(--color-text) !important;
              }

              &:hover {
                color: var(--color-light) !important;
              }
            }
          }

          code {
            background-color: var(--color-back);
            border: 1px solid var(--color-border);
            padding: 0 2px;
          }

          input[type="text"] {
            background-color: var(--color-back);
            padding: 0 8px;
            border: 1px solid var(--color-border);
            height: 32px;
          }

          h1, h3, p {
            margin: 0;
            padding: 0;
          }

          h3 {
            margin-bottom: -8px;
          }

          #home {
            margin: 16px;
            display: flex;
            gap: 8px;

            > div {
              flex: 1 1 0px;
              background-color: var(--color-back);
              padding: 8px 16px 16px;
              cursor: pointer;
              display: flex;
              flex-direction: column;
              gap: 8px;

              * {
                cursor: pointer;
              }

              &:hover {
                background-color: var(--color-button);
              }
            }

            h3 {
              font-weight: 700;
              font-size: 28px;
              color: var(--color-light);
            }
          }

          #header {
            background-color: var(--color-back);
            position: relative;
            padding: 8px 40px 16px 16px;
          }

          #back-button {
            position: absolute;
            top: 8px;
            right: 8px;
            background-color: initial;
            display: flex;
            align-items: center;
            min-width: initial;
            padding: 0 8px;

            &:hover {
             color: var(--color-light) !important;
            }

            &:disabled {
              pointer-events: initial;
              cursor: not-allowed;

              &:hover {
                color: var(--color-text) !important;
              }
            }
          }

          #info-button {
            position: absolute;
            bottom: 8px;
            right: 8px;
          }

          .utility {
            margin: 16px;

            > div {
              display: flex;
              gap: 16px;
              flex-direction: column;
            }
          }

          ${Object.entries(components).filter((([k, v]) => v.styles)).map(([k, v]) => `.component-${k} { ${v.styles} }`).join("")}
          ${Object.entries(utilities).filter((([k, v]) => v.component.styles)).map(([k, v]) => `.utility-${k} { ${v.component.styles} }`).join("")}
        }</style>`],
        component: {
          data: {
            utility: null,
            utilities,
            processing: false
          },
          components: Object.fromEntries(Object.entries(utilities).map(([k, v]) => {
            v.component.props = {
              value: {
                type: Boolean,
                default: false
              }
            }
            const data = v.component.data
            v.component.data = function() {
              return {
                ...data,
                processing: this.value
              }
            }
            v.component.watch = {
              value(val) {
                this.processing = val
              },
              processing(val) {
                this.$emit("input", val)
              }
            }
            v.component.components = Object.fromEntries(Object.entries(components).map(([k, v]) => {
              v.template = `<div ref="container" class="component-${k}">${v.template}</div>`
              return [k, Vue.extend(v)]
            }))
            v.component.methods ??= {}
            v.component.methods = { ...v.component.methods, ...methods }
            v.component.template = `<div ref="container" class="utility utility-${k}">${v.component.template}</div>`
            return [k, Vue.extend(v.component)]
          })),
          watch: {
            processing(val) {
              if (val) {
                const styles = document.createElement("style")
                styles.id = `${id}-processing-styles`
                styles.innerHTML = `
                  #${id} {
                    .dialog_close_button {
                      pointer-events: none;
                      opacity: .5;
                    }

                    .dialog_handle::before, #header::before {
                      content: "";
                      position: absolute;
                      top: 0;
                      right: 0;
                      bottom: 0;
                      width: 30px;
                      cursor: not-allowed;
                    }
                  }
                `
                document.body.append(styles)
              } else {
                document.getElementById(`${id}-processing-styles`)?.remove()
              }
            }
          },
          methods: {
            showInfo() {
              new Dialog({
                id: `${id}-info`,
                title: `${utilities[this.utility].name} Info`,
                buttons: ["dialog.close"],
                lines: [
                  `<style>#${id}-info {
                    ul {
                      margin-bottom: 8px;
                    }

                    li {
                      list-style: initial;
                      margin-left: 20px;

                      li {
                        list-style: circle;

                        li {
                          list-style: square;
                        }
                      }
                    }

                    code {
                      background-color: var(--color-back);
                      border: 1px solid var(--color-border);
                      padding: 0 2px;
                    }

                    h3 {
                      margin: 0 0 8px 0;
                      padding: 0;
                      font-weight: 700;
                    }
                  }</style>`,
                  utilities[this.utility].info
                ],
                width: 780
              }).show()
            }
          },
          template: `
            <div>
              <div v-if="utility" id="header">
                <h1>{{ utilities[utility].name }}</h1>
                <span>{{ utilities[utility].description }}</span>
                <button id="back-button" @click="utility = null" :disabled="processing"><i class="material-icons">arrow_back</i> Back</button>
                <button v-if="utilities[utility].info" id="info-button" class="material-icons icon" @click="showInfo">info</button>
              </div>
              <div v-if="utility === null" id="home">
                <div v-for="(data, id) in utilities" @click="utility = id">
                  <h3>{{ data.name }}</h3>
                  <div>{{ data.tagline }}</div>
                </div>
              </div>
              <component v-for="(data, id) in utilities" v-if="utility === id" :is="id" v-model="processing"></component>
            </div>
          `
        },
        onConfirm(r, e) {
          if (Keybinds.extra.confirm.keybind.isTriggered(e)) return false
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
      // dialog.show()
      // dialog.content_vue.utility = "citOptimiser"
    },
    onunload() {
      dialog.close()
      action.delete()
      document.getElementById(`${id}-processing-styles`)?.remove()
    }
  })

  const getFiles = async function*(dir) {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const dirent of dirents) {
      const res = path.resolve(dir, dirent.name)
      if (dirent.isDirectory()) {
        yield* getFiles(res)
      } else if (!res.match(/([\/\\]|^)\.git([\/\\]|$)/)) {
        yield res
      }
    }
  }

  const sizes = ["B", "KB", "MB", "GB", "TB"]
  function formatBytes(bytes) {
    if (bytes === 0) return "0 B"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + " " + sizes[i]
  }

  async function loadImage(imagePath) {
    const imageData = await fs.promises.readFile(imagePath)
    const base64Data = imageData.toString("base64")
    const img = new Image()
    img.src = `data:image/png;base64,${base64Data}`
    await img.decode()
    return img
  }

  function confirm(title, message) {
    return new Promise(fulfil => Blockbench.showMessageBox({
      title,
      message: message + "\n\nThis action cannot be undone!",
      buttons: ["dialog.confirm", "dialog.cancel"],
      width: 512
    }, b => fulfil(!b)))
  }

  function formatPath(path) {
    return path.replace(/\\/g, "/")
  }

  const components = {
    folderSelector: {
      props: ["value"],
      data() {
        return {
          folder: this.value
        }
      },
      watch: {
        value(newVal) {
          this.folder = newVal
        }
      },
      methods: {
        selectFolder(title = "folder") {
          const dir = Blockbench.pickDirectory({
            title: `Select ${title}`,
            startpath: this.folder || path.join(settings.minecraft_directory.value, "resourcepacks")
          })
          if (dir) {
            this.folder = dir
            this.$emit("input", this.folder)
          }
        },
        input() {
          this.$emit("input", this.folder)
        }
      },
      computed: {
        buttonText() {
          return this.$slots.default[0].text
        }
      },
      styles: `
        .folder-selector {
          display: flex;
          cursor: pointer;
        }

        input {
          flex: 1;
          pointer-events: none;
        }
      `,
      template: `
        <div class="folder-selector" @click="selectFolder(buttonText)">
          <input disabled type="text" :value="folder" placeholder="Select Folder">
          <button class="material-icons">folder_open</button>
        </div>
      `
    },
    checkboxRow: {
      props: ["value"],
      styles: `
        .checkbox-row {
          display: flex;
          gap: 4px;
          align-items: center;
          cursor: pointer;

          * {
            cursor: pointer;
          }
        }
      `,
      template: `
        <label class="checkbox-row">
          <input type="checkbox" :checked="value" @input="$emit('input', $event.target.checked)">
          <div><slot></slot></div>
        </label>
      `
    },
    ignoreList: {
      props: {
        value: {
          type: Array,
          default: () => []
        }
      },
      data() {
        return {
          newWord: "",
          ignoreList: this.value
        }
      },
      watch: {
        value(val) {
          this.ignoreList = val
        },
        ignoreList(val) {
          this.$emit("input", val)
        }
      },
      methods: {
        addWord() {
          if (this.newWord && !this.ignoreList.includes(this.newWord.toLowerCase())) {
            this.ignoreList.push(this.newWord.toLowerCase())
          }
          this.newWord = ""
          setTimeout(() => this.$refs.input.focus(), 0)
        }
      },
      styles: `
        display: flex;
        flex-direction: column;
        gap: 8px;

        > div {
          display: flex;
        }

        input {
          flex: 1;
        }

        ul {
          background-color: var(--color-back);
          border: 1px solid var(--color-border);
          height: 128px;
          overflow-y: auto;
        }

        li {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: space-between;
          padding-left: 8px;
          background-color: var(--color-ui);

          &:not(:first-child) {
            margin-top: 1px;
          }

          button {
            opacity: 0;
          }

          &:hover button {
            opacity: 1;
          }
        }
      `,
      template: `
        <h3>Ignore List</h3>
        <p>Files and folders that include these terms will be ignored</p>
        <div>
          <input type="text" placeholder="Enter term" v-model="newWord" ref="input" @keydown.enter="addWord">
          <button class="material-icons" @click="addWord">add</button>
        </div>
        <ul>
          <li v-for="(term, index) in ignoreList" :key="index">
            <span>{{ term }}</span>
            <button class="material-icons icon" @click="ignoreList.splice(index, 1)">close</button>
          </li>
        </ul>
      `
    },
    outputLog: {
      props: {
        value: {
          type: Array
        }
      },
      data() {
        return {
          logs: [],
          waiting: false
        }
      },
      watch: {
        value(val) {
          if (this.waiting) return
          this.waiting = true
          setTimeout(() => {
            this.logs = val.slice()
            this.waiting = false
          }, 100)
        },
        logs() {
          if (this.$refs.log.scrollTop >= this.$refs.log.scrollHeight - this.$refs.log.clientHeight) {
            this.$nextTick(() => {
              this.scrollToBottom()
            })
          }
        }
      },
      methods: {
        scrollToBottom() {
          const container = this.$refs.log
          container.scrollTop = container.scrollHeight
        },
        copy() {
          navigator.clipboard.writeText(this.value.join("\n\n"))
          Blockbench.showQuickMessage("Log copied")
        },
        save() {
          Blockbench.export({
            extensions: ["txt"],
            type: "Text file",
            name: "log",
            content: this.value.join("\n\n")
          }, () => Blockbench.showQuickMessage("Saved log"))
        }
      },
      styles: `
        .log {
          height: 256px;
          overflow-y: auto;
          overflow-x: hidden;
          font-family: var(--font-code);
          background-color: var(--color-back);
          border: 1px solid var(--color-border);
          gap: 1px;
          
          * {
            user-select: text;
            cursor: text;
            white-space: pre-wrap;
            max-width: 100%;
            word-break: break-all;
            padding: 4px 4px 4px 24px;
            position: relative;
            font-size: 13px;

            &:not(:last-child) {
              border-bottom: 1px solid var(--color-border);
            }

            &::before {
              content: ">";
              position: absolute;
              left: 8px;
            }
          }
        }

        .buttons {
          display: flex;
          gap: 8px;
          margin-top: 8px;

          button {
            flex: 1;
          }
        }
      `,
      template: `
        <div class="log" ref="log">
          <div v-for="(log, index) in logs" :key="index">{{ log }}</div>
        </div>
        <div class="buttons">
          <button class="has-icon" @click="copy">
            <i class="material-icons">content_copy</i>
            <span>Copy Log</span>
          </button>
          <button class="has-icon" @click="save">
            <i class="material-icons">save</i>
            <span>Save Log</span>
          </button>
        </div>
      `
    },
    progressBar: {
      props: {
        current: {
          type: Number
        },
        total: {
          type: Number
        }
      },
      data() {
        return {
          displayedCurrent: 0,
          waiting: false
        }
      },
      watch: {
        current(val) {
          if (this.waiting) return
          this.waiting = true
          setTimeout(() => {
            this.displayedCurrent = this.current
            this.waiting = false
          }, 500)
        }
      },
      computed: {
        progressPercentage() {
          if (!this.displayedCurrent) return 0
          return Math.round(this.displayedCurrent / this.total * 100)
        }
      },
      styles: `
        display: flex;
        flex-direction: column;
        gap: 8px;

        .progress-bar-container {
          width: 100%;
          height: 24px;
          background-color: var(--color-back);
          position: relative;
        }

        .progress-bar {
          height: 100%;
          background-color: var(--color-accent);
          position: absolute;
          top: 4px;
          left: 4px;
          height: 16px;
          transition: width .5s ease;
        }

        div {
          text-align: center;
        }
      `,
      template: `
        <div class="progress-text">{{ total === null ? "Loading..." : displayedCurrent === total ? "Finished" : "Processing..." }}</div>
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: 'calc(' + progressPercentage + '% - 8px)' }"></div>
        </div>
        <div>{{ displayedCurrent }} / {{ total }} - {{ progressPercentage }}%</div>
      `
    }
  }

  const utilities = {
    jsonOptimiser: {
      name: "JSON Optimiser",
      tagline: "Optimise every JSON file in a folder.",
      description: "JSON Optimiser is a tool that will go through all JSON files in a folder and optimise them to be as small as possible, minifying them and removing any unnecessary data.",
      info: `
        <h3>Changes that JSON Optimiser makes:</h3>
        <ul>
          <li>Minifies <code>.json</code>, <code>.mcmeta</code>, <code>.jem</code>, and <code>.jpm</code> files</li>
          <li>Removes default credits. Custom credits are kept</li>
          <li>Removes unnecessary keys</li>
          <li>For block/item model <code>.json</code> files
            <ul>
              <li>Removes the <code>groups</code> object</li>
              <li>For the <code>rotation</code> object:
                <ul>
                  <li>Removes the <code>rotation</code> object when <code>angle</code> is set to <code>0</code></li>
                  <li>Removes the <code>rescale</code> property when it is set to <code>false</code></li>
                </ul>
              </li>
              <li>For the <code>faces</code> object:
                <ul>
                  <li>Removes the <code>rotation</code> property when it is set to <code>0</code></li>
                  <li>Removes the <code>tintindex</code> property when it is set to <code>-1</code></li>
                  <li>Removes empty <code>face</code> objects</li>
                </ul>
              </li>
              <li>Removes the <code>shade</code> property when it is set to <code>true</code></li>
              <li>Removes empty <code>elements</code> arrays</li>
            </ul>
          </li>
          <li>For animation <code>.mcmeta</code> files
            <ul>
              <li>Removes the file when the texture it is for does not exist</li>
              <li>Removes the <code>interpolate</code> property when it is set to<code>false</code></li>
              <li>Removes the <code>frametime</code> property when it is set to<code>1</code></li>
              <li>Removes the <code>width</code> property when the frames are square</li>
              <li>Removes the <code>height</code> property when the frames are square</li>
              <li>For the <code>frames</code> array
                <ul>
                  <li>Removes the <code>time</code> property when it matches the main <code>frametime</code> property</li>
                  <li>Removes the <code>frames</code> array when all the frames are present, in order, and match the main <code>frametime</code> property</li>
                  <li>Changes most common <code>time</code> property to be the main <code>frametime</code> property, and makes old the main <code>frametime</code> property into the <code>time</code> properties</li>
                </ul>
              </li>
            </ul>
          </li>
          <li>For OptiFine CEM <code>.jem</code>/<code>.jpm</code> files
            <ul>
              <li>Removes the <code>animations</code> array when it is empty</li>
              <li>Removes the <code>translation</code> array when all axes are set to <code>0</code></li>
              <li>Removes the <code>rotation</code> array when all axes are set to <code>0</code></li>
              <li>Removes the <code>scale</code> property when it is set to <code>1</code></li>
              <li>Removes empty <code>boxes</code> arrays</li>
              <li>Removes empty <code>sprites</code> arrays</li>
              <li>Removes empty <code>submodel</code> objects</li>
              <li>Removes empty <code>submodels</code> arrays</li>
            </ul>
          </li>
        </ul>
      `,
      component: {
        data: {
          folder: null,
          types: {
            json: true,
            mcmeta: true,
            jem: true,
            jpm: true
          },
          ignoreList: [],
          outputLog: [],
          finished: false,
          done: 0,
          total: null
        },
        methods: {
          async execute() {
            if (!(await confirm("Run JSON Optimiser?", `Are you sure you want to run JSON Optimiser over the following folder:\n<code>${formatPath(this.folder)}</code>\n\nMake a backup first if you would like to keep an un-optimised version of the folder.`))) return
            this.outputLog = []
            this.finished = false
            this.processing = true
            this.done = 0
            this.total = null

            const mcmetaKeys = [ "credit", "animation", "villager", "texture", "pack", "language", "filter", "overlays", "gui" ]
            const animationKeys = [ "interpolate", "width", "height", "frametime", "frames" ]
            const jemKeys = [ "credit", "texture", "textureSize", "shadowSize", "models" ]
            const modelKeys = [ "model", "id", "part", "attach", "scale", "animations" ]
            const partKeys = [ "id", "texture", "textureSize", "invertAxis", "translate", "rotate", "mirrorTexture", "boxes", "sprites", "submodel", "submodels" ]
            const boxKeys = [ "textureOffset", "uvDown", "uvUp", "uvNorth", "uvSouth", "uvWest", "uvEast", "coordinates", "sizeAdd" ]
            const spriteKeys = [ "textureOffset", "coordinates", "sizeAdd" ]
            const elementKeys = [ "from", "to", "rotation", "faces", "shade" ]
            const faceKeys = [ "uv", "texture", "cullface", "rotation", "tintindex" ]
            modelKeys.push(...partKeys)

            function processPart(part, rootMode) {
              for (const key in part) {
                if (!(rootMode ? partKeys.concat(modelKeys) : partKeys).includes(key)) delete part[key]
              }
              if (part.translate && part.translate.every(e => !e)) delete part.translate
              if (part.rotate && part.rotate.every(e => !e)) delete part.rotate
              if (part.scale === 1) delete part.scale
              if (part.boxes) {
                for (const box of part.boxes) {
                  for (const key in box) {
                    if (!boxKeys.includes(key)) delete box[key]
                  }
                }
                part.boxes = part.boxes.filter(e => Object.keys(e).length)
                if (!part.boxes.length) delete part.boxes
              }
              if (part.sprites) {
                for (const sprite of part.sprites) {
                  for (const key in sprite) {
                    if (!spriteKeys.includes(key)) delete sprite[key]
                  }
                }
                part.sprites = part.sprites.filter(e => Object.keys(e).length)
                if (!part.sprites.length) delete part.sprites
              }
              if (part.submodel) {
                processPart(part.submodel)
                if (!Object.keys(part.submodel).length) delete part.submodel
              }
              if (part.submodels) {
                for (const submodel of part.submodels) {
                  processPart(submodel)
                }
                part.submodels = part.submodels.filter(e => Object.keys(e).length)
                if (!part.submodels.length) delete part.submodels
              }
            }

            const files = []
            for await (const file of getFiles(this.folder)) {
              if (
                (file.endsWith(".json") && !this.types.json) ||
                (file.endsWith(".mcmeta") && !this.types.mcmeta) ||
                (file.endsWith(".jem") && !this.types.jem) ||
                (file.endsWith(".jpm") && !this.types.jpm) ||
                !(file.endsWith(".json") || file.endsWith(".mcmeta") || file.endsWith(".jem") || file.endsWith(".jpm")) ||
                this.ignoreList.some(item => file.toLowerCase().includes(item))
              ) continue
              files.push(file)
            }

            this.total = files.length

            let beforeTotal = 0
            let afterTotal = 0

            for (const file of files) {
              const shortened = formatPath(file.slice(this.folder.length)).replace(/^\//, "")
              const before = (await fs.promises.stat(file)).size
              beforeTotal += before
              let data
              try {
                data = JSON.parse((await fs.promises.readFile(file, "utf-8")).trim())
              } catch (err) {
                this.outputLog.push(`Skipping ${shortened} as it could not be read`)
                this.done++
                continue
              }
              if (data.credit === "Made with Blockbench") delete data.credit
              if (this.types.json && file.endsWith(".json")) {
                delete data.groups
                if (data.elements) {
                  for (const element of data.elements) {
                    for (const key in element) {
                      if (!elementKeys.includes(key)) delete element[key]
                    }
                    if (element.rotation) {
                      if (element.rotation.angle === 0) delete element.rotation
                      else {
                        if (element.rotation.rescale === false) delete element.rotation.rescale
                      }
                    }
                    if (element.faces) {
                      for (const [key, face] of Object.entries(element.faces)) {
                        for (const key in face) {
                          if (!faceKeys.includes(key)) delete face[key]
                        }
                        if (face.rotation === 0) delete face.rotation
                        if (face.tintindex === -1) delete face.tintindex
                        if (!Object.keys(face).length) delete element.faces[key]
                      }
                    }
                    if (element.shade) delete element.shade
                  }
                  data.elements = data.elements.filter(e => e.faces && Object.keys(e.faces).length)
                }
              }
              if (this.types.mcmeta && file.endsWith(".mcmeta")) {
                if (file.endsWith(".png.mcmeta")) {
                  if (!fs.existsSync(file.slice(0, -7))) {
                    fs.rmSync(file)
                    this.outputLog.push(`${shortened}\nBefore: ${formatBytes(before)}\nAfter: 0 B`)
                    this.done++
                    continue
                  }
                }
                for (const key in data) {
                  if (!mcmetaKeys.includes(key)) delete data[key]
                }
                if (data.pack) {
                  for (const key in data.pack) {
                    if (!(key === "pack_format" || key === "supported_formats" || key === "description")) delete data.pack[key]
                  }
                } else if (data.animation) {
                  for (const key in data.animation) {
                    if (!animationKeys.includes(key)) delete data.animation[key]
                  }
                  if (data.animation.interpolate === false) delete data.animation.interpolate
                  if (data.animation.frametime === 1) delete data.animation.frametime
                  if (data.animation.width && !data.animation.height) {
                    const img = await loadImage(file.slice(0, -7))
                    if (data.animation.width === img.height) delete data.animation.width
                  }
                  if (data.animation.height && !data.animation.width) {
                    const img = await loadImage(file.slice(0, -7))
                    if (data.animation.height === img.width) delete data.animation.height
                  }
                  if (data.animation.frames) {
                    const frametime = data.animation.frametime ?? 1
                    data.animation.frames = data.animation.frames.map(e => {
                      if (e.time === frametime) return e.index
                      return e
                    })
                    if (data.animation.frames.every((e, i) => e === i)) {
                      const img = await loadImage(file.slice(0, -7))
                      if (data.animation.frames.length === img.height / img.width) delete data.animation.frames
                    } else {
                      const times = new Map
                      data.animation.frames.forEach(e => {
                        if (typeof e === "number") {
                          times.set(frametime, (times.get(frametime) ?? 0) + 1)
                        } else {
                          times.set(e.time, (times.get(e.time) ?? 0) + 1)
                        }
                      })
                      const largest = Array.from(times).reduce((a, e) => {
                        if (a[1] > e[1]) return a
                        return e
                      }, [1, 0])
                      if (frametime !== largest[0]) {
                        data.animation.frametime = largest[0]
                        data.animation.frames = data.animation.frames.map(e => {
                          if (typeof e === "number") return {
                            index: e,
                            time: frametime
                          }
                          if (e.time === largest[0]) return e.index
                          return e
                        })
                      }
                    }
                  }
                }
              }
              if (this.types.jem && file.endsWith(".jem")) {
                for (const key in data) {
                  if (!jemKeys.includes(key)) delete data[key]
                }
                if (data.models) {
                  for (const model of data.models) {
                    for (const key in model) {
                      if (!modelKeys.includes(key)) delete model[key]
                    }
                    if (!model.animations?.length) delete model.animations
                    processPart(model, true)
                  }
                  data.models = data.models.map(e => {
                    if (e.boxes || e.submodel || e.submodels || e.model || e.sprites) return e
                    return { part: e.part }
                  })
                  if (!data.models.length) {
                    for (const key in data) delete data[key]
                  }
                }
              }
              if (this.types.jpm && file.endsWith(".jpm")) {
                processPart(data)
              }
              await fs.promises.writeFile(file, JSON.stringify(data), "utf-8")
              const after = (await fs.promises.stat(file)).size
              afterTotal += after
              this.outputLog.push(`${shortened}\nBefore: ${formatBytes(before)}\nAfter: ${formatBytes(after)}`)
              this.done++
            }
            this.outputLog.push(`Compressed ${this.total} files\nBefore: ${formatBytes(beforeTotal)}\nAfter: ${formatBytes(afterTotal)}\nSaved: ${formatBytes(beforeTotal - afterTotal)}`)
            this.processing = false
            this.finished = true
          }
        },
        template: `
          <div v-if="!processing && !finished">
            <h3>Folder to optimise:</h3>
            <folder-selector v-model="folder">the folder to optimise the JSON of</folder-selector>
            <div style="display: flex; justify-content: space-between;">
              <div>
                <checkbox-row v-model="types.json">Optimise <code>.json</code> files</checkbox-row>
                <checkbox-row v-model="types.mcmeta">Optimise <code>.mcmeta</code> files</checkbox-row>
                <checkbox-row v-model="types.jem">Optimise <code>.jem</code> files</checkbox-row>
                <checkbox-row v-model="types.jpm">Optimise <code>.jpm</code> files</checkbox-row>
              </div>
              <ignore-list v-model="ignoreList"></ignore-list>
            </div>
            <button :disabled="!folder" @click="execute">Start</button>
          </div>
          <div v-else>
            <progress-bar :current="done" :total="total"></progress-bar>
            <output-log v-model="outputLog"></output-log>
            <button :disabled="processing" @click="finished = false">Done</button>
          </div>
        `
      }
    },
    citOptimiser: {
      name: "CIT Optimiser",
      tagline: "Optimise the OptiFine CIT properties files in a folder.",
      description: "CIT Optimiser is a tool that will go through all properties files in an OptiFine CIT folder and optimise them to be as small as possible, removing any unnecessary data.",
      info: `
        <h3>Changes that CIT Optimiser makes:</h3>
        <ul>
          <li>Removes the <code>type=item</code> property</li>
          <li>Replaces <code>matchItems</code> with <code>items</code></li>
          <li>Removes the <code>type=item</code> property</li>
          <li>Removes the <code>minecraft:</code> prefix</li>
          <li>Removes blank lines</li>
        </ul>
      `,
      component: {
        data: {
          folder: null,
          ignoreList: [],
          outputLog: [],
          finished: false,
          done: 0,
          total: null
        },
        methods: {
          async execute() {
            if (!(await confirm("Run CIT Optimiser?", `Are you sure you want to run CIT Optimiser over the following folder:\n<code>${formatPath(this.folder)}</code>\n\nMake a backup first if you would like to keep an un-optimised version of the folder.`))) return
            this.outputLog = []
            this.finished = false
            this.processing = true
            this.done = 0
            this.total = null

            const files = []
            for await (const file of getFiles(this.folder)) {
              if (
                !file.endsWith(".properties") ||
                this.ignoreList.some(item => file.toLowerCase().includes(item))
              ) continue
              files.push(file)
            }

            this.total = files.length

            let beforeTotal = 0
            let afterTotal = 0

            for (const file of files) {
              const shortened = formatPath(file.slice(this.folder.length)).replace(/^\//, "")
              const before = (await fs.promises.stat(file)).size
              beforeTotal += before
              let data
              try {
                data = (await fs.promises.readFile(file, "utf-8")).trim()
              } catch (err) {
                this.outputLog.push(`Skipping ${shortened} as it could not be read`)
                this.done++
                continue
              }
              data = data.replace(/(type=item\n?|minecraft:)/g, "")
              data = data.replace(/matchItems/g, "items")
              data = data.replace(/\n{2,}/g, "\n")
              await fs.promises.writeFile(file, data, "utf-8")
              const after = (await fs.promises.stat(file)).size
              afterTotal += after
              this.outputLog.push(`${shortened}\nBefore: ${formatBytes(before)}\nAfter: ${formatBytes(after)}`)
              this.done++
            }
            this.outputLog.push(`Compressed ${this.total} files\nBefore: ${formatBytes(beforeTotal)}\nAfter: ${formatBytes(afterTotal)}\nSaved: ${formatBytes(beforeTotal - afterTotal)}`)
            this.processing = false
            this.finished = true
          }
        },
        template: `
          <div v-if="!processing && !finished">
            <h3>Folder to optimise:</h3>
            <folder-selector v-model="folder">the folder to optimise the CIT properties of</folder-selector>
            <ignore-list v-model="ignoreList" style="align-self: flex-start;"></ignore-list>
            <button :disabled="!folder" @click="execute">Start</button>
          </div>
          <div v-else>
            <progress-bar :current="done" :total="total"></progress-bar>
            <output-log v-model="outputLog"></output-log>
            <button :disabled="processing" @click="finished = false">Done</button>
          </div>
        `
      }
    }
  }

  // Plugin

  setupPlugin()
})()