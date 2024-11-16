(() => {
  const path = require("node:path")
  const os = require("node:os")

  let codec, format, action, itemProperty, nameProperty, pathProperty, displayProperty

  const id = "free_rotation"
  const name = "Free Rotation"
  const icon = "3d_rotation"
  const description = "Create Java Item models without any rotation limitations."

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
    icon: icon,
    author: "Godlander & Ewan Howell",
    description: description,
    about: "placeholder",
    tags: ["Minecraft: Java Edition", "Rotation"],
    version: "1.0.0",
    min_version: "4.11.2",
    variant: "desktop",
    await_loading: true,
    onload() {
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
              item: {label: "Item ID", type: "input", placeholder: "diamond_sword", value: Project.free_rotation_item},
              name: {label: "Model Name", type: "input", placeholder: "diamond_katana", value: Project.free_rotation_name},
              thirdperson_righthand: {label: "Third Person Right", type: "checkbox", value: Project.free_rotation_display.thirdperson_righthand},
              thirdperson_lefthand: {label: "Third Person Left", type: "checkbox", value: Project.free_rotation_display.thirdperson_lefthand},
              firstperson_righthand: {label: "First Person Right", type: "checkbox", value: Project.free_rotation_display.firstperson_righthand},
              firstperson_lefthand: {label: "First Person Left", type: "checkbox", value: Project.free_rotation_display.firstperson_lefthand},
              head: {label: "Head", type: "checkbox", value: Project.free_rotation_display.head},
              ground: {label: "Ground", type: "checkbox", value: Project.free_rotation_display.ground},
              fixed: {label: "Item Frame", type: "checkbox", value: Project.free_rotation_display.fixed},
              gui: {label: "GUI", type: "checkbox", value: Project.free_rotation_display.gui},
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

              Project.free_rotation_item = form.item
              Project.free_rotation_name = form.name
              Project.free_rotation_path = form.path
              for (const m in Project.free_rotation_display) {
                Project.free_rotation_display[m] = form[m]
              }

              if (!dir) return

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
                if (!texture) throw new Error('Texture not found')
                renderedFace.texture = '#' + texture.id
                const path = texture.source.replaceAll(/\\/g, '/')
                const parts = path.split('/')
                const assetsIndex = parts.indexOf('assets')
                if (assetsIndex === -1) model.textures[texture.id] = 'unknown'
                else {
                  const namespace = parts[assetsIndex + 1]
                  const resourcePath = parts.slice(assetsIndex + 3, -1).join('/')
                  model.textures[texture.id] = namespace + ':' + resourcePath + '/' + texture.name.slice(0, -4)
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
                const translation = cube.getWorldCenter();
                translation.y -= 8;

                const display = Project.display_settings[slot]
                if (display) {
                  const dscale = (new THREE.Vector3()).fromArray(display.scale)
                  const dtranslation = (new THREE.Vector3()).fromArray(display.translation)
                  const drotation = (new THREE.Quaternion()).setFromEuler(
                    (new THREE.Euler()).fromArray([
                    THREE.MathUtils.degToRad(display.rotation[0]),
                    THREE.MathUtils.degToRad(display.rotation[1]),
                    THREE.MathUtils.degToRad(display.rotation[2]),
                    ], 'XYZ')
                  )
                  scale.multiply(dscale)
                  rotation.multiplyQuaternions(drotation, quat)
                  translation.multiply(dscale)
                  translation.applyQuaternion(drotation)
                  translation.add(dtranslation)
                }

                model.display[slot] = {
                  "rotation": (new THREE.Euler()).setFromQuaternion(rotation, 'XYZ').toArray().slice(0,3).map(e=>THREE.MathUtils.radToDeg(e)),
                  "translation": translation.toArray(),
                  "scale": scale.toArray()
                }
              }
            }

            models.push(JSON.stringify(model))
          }
          return models
        }
      }),
      format = new ModelFormat({
        id: "free_rotation",
        name: "Free Rotation Model",
        extension: "json",
        icon: "3d_rotation",
        category: "minecraft",
        target: "Minecraft: Java Edition",
        format_page: {},
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
        name: "Export Free Rotation Model",
        icon: "3d_rotation",
        condition: {formats: [format.id]},
        click: () => codec.export()
      })
      MenuBar.addAction(action, "file.export.0")

      itemProperty = new Property(ModelProject, "string", "free_rotation_item", {
        label: "Item ID",
        description: "ID of the item model",
        condition: {formats: [format.id]}
      })
      nameProperty = new Property(ModelProject, "string", "free_rotation_name", {
        label: "Model Name",
        description: "Model file to output",
        condition: {formats: [format.id]}
      })
      pathProperty = new Property(ModelProject, "string", "free_rotation_path", {
        label: "Export Path",
        default: directory,
        condition: {formats: [format.id]},
        exposed: false
      })
      displayProperty = new Property(ModelProject, "object", "free_rotation_display", {
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
        condition: {formats: [format.id]},
        exposed: false
      })
    },
    onunload() {
      codec.delete()
      format.delete()
      action.delete()
      itemProperty.delete()
      nameProperty.delete()
      pathProperty.delete()
      displayProperty.delete()
    }
  })
})()