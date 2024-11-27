(() => {
  const path = require("node:path")
  const os = require("node:os")

  let codec, format, action, properties, styles

  const id = "free_rotation"
  const name = "Free Rotation"
  const icon = "3d_rotation"
  const description = "Create Java Item models without any rotation limitations."

  const links = {
    websiteGodlander: {
      text: "By Godlander",
      link: "https://github.com/Godlander",
      icon: "fab.fa-github",
      colour: "#6E40C9"
    },
    discordGodlander: {
      text: "Godlander's Discord",
      link: "https://discord.gg/2s6th9SvZd",
      icon: "fab.fa-discord",
      colour: "#727FFF"
    },
    websiteEwan: {
      text: "By Ewan Howell",
      link: "https://ewanhowell.com/",
      icon: "language",
      colour: "#33E38E"
    },
    discordEwan: {
      text: "Ewan's Discord",
      link: "https://discord.ewanhowell.com/",
      icon: "fab.fa-discord",
      colour: "#727FFF"
    }
  }

  let directory
  if (os.platform() === "win32") {
    directory = path.join(os.homedir(), "AppData", "Roaming", ".minecraft", "resourcepacks")
  } else if (os.platform() === "darwin") {
    directory = path.join(os.homedir(), "Library", "Application Support", "minecraft", "resourcepacks")
  } else {
    directory = path.join(os.homedir(), ".minecraft", "resourcepacks")
  }

  Plugin.register(id, {
    title: name,
    icon: "icon.png",
    author: "Godlander & Ewan Howell",
    description,
    about: "placeholder",
    tags: ["Minecraft: Java Edition", "Rotation"],
    version: "1.0.0",
    min_version: "4.11.2",
    variant: "desktop",
    await_loading: true,
    onload() {
      styles = Blockbench.addCSS(`
        #format_page_free_rotation {
          padding-bottom: 0;
        }
        .format_entry[format="limitless_item"] i {
          overflow: visible;
        }
        .free-rotation-links {
          display: flex;
          justify-content: space-around;
          margin: 20px 35px 0;
        }
        .free-rotation-links * {
          cursor: pointer;
        }
        .free-rotation-links > a {
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
        .free-rotation-links > a:hover {
          background-color: var(--color-accent);
          color: var(--color-light);
        }
        .free-rotation-links > a > i {
          font-size: 32px;
          width: 100%;
          max-width: initial;
          height: 32px;
          text-align: center;
        }
        .free-rotation-links > a:hover > i {
          color: var(--color-light) !important;
        }
        .free-rotation-links > a > p {
          flex: 1;
          display: flex;
          align-items: center;
        }
      `)

      codec = new Codec("temp", {
        name: "Temp",
        remember: true,
        export() {
          for (const texture of Texture.all) {
            if (!texture.saved) texture.save()
          }
          new Dialog({
            id: "free_rotation_export_prompt",
            title: "Free Rotation Export",
            form: {
              item: { label: "Item ID", type: "input", placeholder: "diamond_sword", value: Project.free_rotation_item },
              name: { label: "Model Name", type: "input", placeholder: "diamond_katana", value: Project.free_rotation_name },
              thirdperson_righthand: { label: "Third Person Right", type: "checkbox", value: Project.free_rotation_display.thirdperson_righthand },
              thirdperson_lefthand: { label: "Third Person Left", type: "checkbox", value: Project.free_rotation_display.thirdperson_lefthand },
              firstperson_righthand: { label: "First Person Right", type: "checkbox", value: Project.free_rotation_display.firstperson_righthand },
              firstperson_lefthand: { label: "First Person Left", type: "checkbox", value: Project.free_rotation_display.firstperson_lefthand },
              head: { label: "Head", type: "checkbox", value: Project.free_rotation_display.head },
              ground: { label: "Ground", type: "checkbox", value: Project.free_rotation_display.ground },
              fixed: { label: "Item Frame", type: "checkbox", value: Project.free_rotation_display.fixed },
              gui: { label: "GUI", type: "checkbox", value: Project.free_rotation_display.gui }
            },
            async onConfirm(form) {
              if (!form.item.length || !form.name.length) {
                return Blockbench.showQuickMessage("Both fields are required for export")
              }
              if (!form.item.match(/^[a-z0-9_-]+$/) || !form.name.match(/^[a-z0-9_-]+$/)) {
                return Blockbench.showQuickMessage("Only characters a-z, 0-9, _, and - are allowed", 2000)
              }

              const dir = Blockbench.pickDirectory({
                title: "Select resource pack to export to",
                startpath: Project.free_rotation_path
              })
              if (!dir) return

              Project.free_rotation_item = form.item
              Project.free_rotation_name = form.name
              Project.free_rotation_path = form.path
              for (const m in Project.free_rotation_display) {
                Project.free_rotation_display[m] = form[m]
              }

              const dialog = new Dialog("exporting", {
                title: "Exporting...",
                lines: [
                  `<style>
                    #exporting .dialog_close_button {
                      display: none;
                    }
                    #exporting h1 {
                      margin: 0;
                    }
                  </style>`,
                  "<h1>Exporting...</h1>"
                ],
                buttons: [],
                cancel_on_click_outside: false,
                onConfirm: () => false
              }).show()
              const close = dialog.close
              dialog.close = () => {}

              const definitionDir = path.join(dir, "assets", "freerot", "items")
              const definitionFile = path.join(definitionDir, form.item + ".json")
              const modelDir = path.join(dir, "assets", "freerot", "models", form.name)

              if (fs.existsSync(definitionFile)) {
                const check = await new Promise(fulfil => {
                  Blockbench.showMessageBox({
                    title: "Item definition already exists",
                    message: `The item definition <code>assets/freerot/${form.item}.json</code> already exists. Are you sure you want to continue and overwrite it?`,
                    buttons: ["dialog.confirm", "dialog.cancel"]
                  }, button => {
                    if (button === 0) fulfil(true)
                    else fulfil()
                  })
                })
                if (!check) return
              }

              if (fs.existsSync(modelDir)) {
                const check = await new Promise(fulfil => {
                  Blockbench.showMessageBox({
                    title: "Model already exists",
                    message: `The the model folder <code>assets/freerot/models/${form.name}</code> already exists. Are you sure you want to continue and possibly overwrite files inside it?`,
                    buttons: ["dialog.confirm", "dialog.cancel"]
                  }, button => {
                    if (button === 0) fulfil(true)
                    else fulfil()
                  })
                })
                if (!check) return
              }

              fs.mkdirSync(definitionDir, { recursive: true })
              fs.mkdirSync(modelDir, { recursive: true })

              const models = await codec.compile(form)

              const definition = {
                model: {
                  type: "composite",
                  models: new Array(models.length).fill().map((e, i) => ({
                    type: "model",
                    model: `freerot:${form.name}/${i}`
                  }))
                }
              }

              fs.writeFileSync(definitionFile, autoStringify(definition))
              for (const [i, model] of models.entries()) {
                fs.writeFileSync(path.join(modelDir, `${i}.json`), model)
              }
              console.log(`wrote ${models.length} models`)
              close.bind(dialog)()
            }
          }).show()
        },
        async compile(form) {
          const mode = Modes.selected
          Modes.options.edit.select()

          let maxcoord = 24
          for (const cube of Cube.all) {
            for (const position of cube.getGlobalVertexPositions()) {
              for (const coord of position) {
                maxcoord = Math.max(maxcoord, Math.abs(coord - 8))
              }
            }
          }
          const downscale = Math.min(4, maxcoord / 24)
          console.log('scale:', downscale)

          const models = []
          for (const cube of Cube.all) {
            const element = {}
            const model = {
              "textures": {},
              "elements": [element],
              "display": {}
            }
            let size = [
              (cube.to[0] - cube.from[0]) / downscale,
              (cube.to[1] - cube.from[1]) / downscale,
              (cube.to[2] - cube.from[2]) / downscale
            ]
            element.from = [
              8-(size[0]/2),
              8-(size[1]/2),
              8-(size[2]/2),
            ]
            element.to = [
              8+(size[0]/2),
              8+(size[1]/2),
              8+(size[2]/2),
            ]

            element.faces = {}
            for (const [face, data] of Object.entries(cube.faces)) {
              if (!data || !data.texture) continue
              const renderedFace = {}
              if (data.enabled) {
                renderedFace.uv = data.uv
                  .slice()
                  .map((v, i) => (v * 16) / UVEditor.getResolution(i % 2))
              }
              if (data.rotation) renderedFace.rotation = data.rotation
              if (data.texture) {
                const texture = Project.textures.find(e => e.uuid == data.texture)
                if (!texture) {
                  console.error("Texture not found... skipping")
                } else {
                  renderedFace.texture = "#" + texture.id
                  const path = texture.source.replaceAll(/\\/g, "/")
                  const parts = path.split("/")
                  const assetsIndex = parts.indexOf("assets")
                  if (assetsIndex === -1) model.textures[texture.id] = "unknown"
                  else {
                    const namespace = parts[assetsIndex + 1]
                    const resourcePath = parts.slice(assetsIndex + 3, -1).join("/")
                    model.textures[texture.id] = namespace + ":" + resourcePath + "/" + texture.name.slice(0, -4)
                  }
                }
              }
              if (data.cullface) renderedFace.cullface = data.cullface
              if (data.tint >= 0) renderedFace.tintindex = data.tint
              element.faces[face] = renderedFace
            }

            const quat = new THREE.Quaternion()
            cube.mesh.getWorldQuaternion(quat)
            const rotation = new THREE.Quaternion()

            for (const slot of DisplayMode.slots) {
              if (Project.free_rotation_display[slot] === true) {
                const scale = new THREE.Vector3(downscale, downscale, downscale)
                const translation = cube.getWorldCenter()
                translation.y -= 8

                const display = Project.display_settings[slot]
                if (display) {
                  const dscale = new THREE.Vector3().fromArray(display.scale)
                  const dtranslation = new THREE.Vector3().fromArray(display.translation)
                  const drotation = new THREE.Quaternion().setFromEuler(
                    new THREE.Euler().fromArray([
                      Math.degToRad(display.rotation[0]),
                      Math.degToRad(display.rotation[1]),
                      Math.degToRad(display.rotation[2]),
                    ], "XYZ")
                  )
                  scale.multiply(dscale)
                  rotation.multiplyQuaternions(drotation, quat)
                  translation.multiply(dscale)
                  translation.applyQuaternion(drotation)
                  translation.add(dtranslation)
                }

                model.display[slot] = {
                  rotation: (new THREE.Euler()).setFromQuaternion(rotation, "XYZ").toArray().slice(0,3).map(e => Math.radToDeg(e)),
                  translation: translation.toArray(),
                  scale: scale.toArray()
                }
              }
            }

            models.push(autoStringify(model))
          }

          mode.select()
          return models
        }
      })

      format = new ModelFormat({
        id: "free_rotation",
        name: "Free Rotation Item",
        extension: "json",
        icon: "3d_rotation",
        category: "minecraft",
        format_page: {
          component: {
            methods: {
              create: () => format.new()
            },
            template: `
              <div class="ewan-format-page" style="display:flex;flex-direction:column;height:100%">
                <p class="format_description">${description}</p>
                <p class="format_target"><b>Target</b> : <span>Minecraft: Java Edition</span></p>
                <content>
                  <h3 class="markdown">About:</h3>
                  <p class="markdown">
                    <ul>
                      <li>This format is designed to create Minecraft: Java Edition item models without the rotation limitations imposed by the game</li>
                      <li>These models cannot be re-imported, so make sure to save your project as a <strong>bbmodel</strong>.</li>
                      <li>After making your model and configuring its display settings, use <strong>File > Export > Free Rotation Item</strong> to export it into your resource pack.</li>
                      <li>This format requires Minecraft 1.21.4 or later</li>
                    </ul>
                  </p>
                </content>
                <div class="spacer"></div>
                <div class="free-rotation-links">${Object.values(links).map(e => `
                  <a href="${e.link}">
                    ${Blockbench.getIconNode(e.icon, e.colour).outerHTML}
                    <p>${e.text}</p>
                  </a>
                `).join("")}</div>
                <div class="button_bar">
                  <button id="create_new_model_button" style="margin-top:20px;margin-bottom:24px;" @click="create">
                    <i class="material-icons icon">${icon}</i>
                    Create New Free Rotation Item
                  </button>
                </div>
              </div>
            `
          }
        },
        render_sides: "front",
        model_identifier: false,
        parent_model_id: true,
        vertex_color_ambient_occlusion: true,
        bone_rig: true,
        rotate_cubes: true,
        optional_box_uv: true,
        uv_rotation: true,
        java_cube_shading_properties: true,
        java_face_properties: true,
        cullfaces: true,
        animated_textures: true,
        select_texture_for_particles: true,
        texture_mcmeta: true,
        display_mode: true,
        texture_folder: true,
        codec
      })
      codec.format = format

      action = new Action("free_rotation_export", {
        name: "Export Free Rotation Item",
        icon: "3d_rotation",
        condition: { formats: [format.id] },
        click: () => codec.export()
      })
      MenuBar.addAction(action, "file.export.0")

      properties = [
        new Property(ModelProject, "string", "free_rotation_item", {
          label: "Item ID",
          description: "ID of the item model",
          condition: { formats: [format.id] }
        }),
        new Property(ModelProject, "string", "free_rotation_name", {
          label: "Model Name",
          description: "Model file to output",
          condition: { formats: [format.id] }
        }),
        new Property(ModelProject, "string", "free_rotation_path", {
          label: "Export Path",
          default: directory,
          condition: { formats: [format.id] },
          exposed: false
        }),
        new Property(ModelProject, "object", "free_rotation_display", {
          default: {
            thirdperson_lefthand: true,
            thirdperson_righthand: true,
            firstperson_lefthand: true,
            firstperson_righthand: true,
            head: true,
            ground: true,
            fixed: true,
            gui: true
          },
          label: "Display Settings",
          condition: { formats: [format.id] },
          exposed: false
        })
      ]
    },
    onunload() {
      codec.delete()
      format.delete()
      action.delete()
      styles.delete()
      properties.forEach(e => e.delete())
    }
  })
})()