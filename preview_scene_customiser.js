(async function () {
  let aboutAction, format, codec, exportAction, exportAction2, importAction, manageAction
  const id = "preview_scene_customiser"
  const name = "Preview Scene Customiser"
  const icon = "image"
  const author = "Ewan Howell"
  const links = {
    website: "https://www.ewanhowell.com/",
    discord: "https://discord.com/invite/pkRxtGw",
    github: "https://github.com/ewanhowell5195/preview-scene-customiser"
  }
  const E = s => $(document.createElement(s))
  const setCurrentPreviewScene = data => localStorage.setItem("preview_scene", data.scene.id)
  const removeCurrentPreviewScene = data => localStorage.removeItem("preview_scene")
  const scenes = []
  Plugin.register(id, {
    title: name,
    icon,
    author,
    description: "placeholder",
    about: "placeholder",
    tags: ["placeholder"],
    version: "1.0.0",
    min_version: "4.4.0",
    variant: "both",
    oninstall: () => showAbout(true),
    onload() {
      addAbout()
      const stored = JSON.parse(localStorage.getItem("preview_scenes") ?? "[]")
      for (const scene of stored) {
        scenes.push(scene.id)
        new PreviewModel(scene.id, scene.model)
        new PreviewScene(scene.id, {
          name: scene.name,
          preview_models: [scene.id]
        })
      }
      codec = new Codec("preview_scene_codec", {
        name: "Preview Scene",
        extension: "bbscene",
        remember: true,
        load_filter: {
          type: "json",
          extensions: ["bbscene"]
        },
        compile(options) {
          options ??= {}
          const clear_elements = []
          const element_index_lut = []
          function computeCube(s) {
            if (s.export == false) return
            const element = {}
            element_index_lut[Cube.all.indexOf(s)] = clear_elements.length
            if (s.name !== "cube")  element.name = s.name
            element.position = s.from.slice()
            let to = s.to.slice()
            if (s.inflate) for (let i = 0; i < 3; i++) {
              element.position[i] -= s.inflate
              to[i] += s.inflate
            }
            element.size = [to[0] - element.position[0], to[1] - element.position[1], to[2] - element.position[2]]
            if (!s.rotation.allEqual(0)) element.rotation = s.rotation
            if (!s.origin.allEqual(0)) element.origin = s.origin
            const e_faces = {}
            for (const face in s.faces) {
              if (s.faces.hasOwnProperty(face) && s.faces[face].texture !== null) {
                const tag = new oneLiner()
                if (s.faces[face].enabled !== false) {
                  tag.uv = s.faces[face].uv.slice();
                  tag.uv.forEach((n, i) => tag.uv[i] = n)
                }
                e_faces[face] = tag
              }
            }
            element.faces = e_faces
            if (Object.keys(element.faces).length) {
              clear_elements.push(element)
            }
          }
          function iterate(arr) {
            if (!arr || !arr.length) return
            for (let i = 0; i < arr.length; i ++) {
              if (arr[i].type === "cube") computeCube(arr[i])
              else if (arr[i].type === "group") iterate(arr[i].children)
            }
          }
          iterate(Outliner.root)
          function checkExport(key, condition) {
            key = options[key]
            if (key === undefined) {
              return condition;
            } else {
              return key
            }
          }
          const blockmodel = {}
          if (checkExport("comment", settings.credit.value)) blockmodel.credit = settings.credit.value
          const texture = Texture.getDefault()
          if (texture) {
            const canvas = document.createElement("canvas")
            canvas.width = texture.width
            canvas.height = texture.height
            canvas.getContext("2d").drawImage(texture.img, 0, 0)
            blockmodel.texture = canvas.toDataURL()
          }
          if (Project.texture_width !== 16 || Project.texture_height !== 16) blockmodel.texture_size = [Project.texture_width, Project.texture_height]
          if (checkExport("elements", clear_elements.length >= 1)) blockmodel.cubes = clear_elements
          if (checkExport("groups", (settings.export_groups.value && Group.all.length))) {
            groups = compileGroups(false, element_index_lut)
            let i = 0;
            while (i < groups.length) {
              if (typeof groups[i] === "object") i = Infinity
              i++
            }
            if (i === Infinity) blockmodel.groups = groups
          }
          this.dispatchEvent("compile", {model: blockmodel, options});
          if (options.raw) return blockmodel
          else return autoStringify(blockmodel)
        },
        async parse(model) {
          if (!model.cubes) return Blockbench.showMessageBox({
            translateKey: "invalid_model",
            icon: "error"
          })
          newProject(Formats[format.id])
          this.dispatchEvent("parse", {model})
          if (Array.isArray(model.texture_size)) {
            Project.texture_width = model.texture_size[0]
            Project.texture_height = model.texture_size[1]
          }
          if (model.texture) {
            let data
            if (model.texture.startsWith("data:image/png;base64,")) data = model.texture
            else {
              data = await new Promise(async fulfil => {
                const blob = new Blob([await fetch(model.texture).then(e => e.arrayBuffer())], {type: "image/png"})
                const reader = new FileReader()
                reader.onload = e => fulfil(e.target.result)
                reader.readAsDataURL(blob)
              }).catch(() => {})
            }
            if (data) new Texture({name: "texture.png"}).fromDataURL(data).add()
          }
          const cubes = []
          model.cubes.forEach(obj => {
            cube = new Cube(obj)
            if (obj.name) cube.name = obj.name
            cube.from = obj.position
            cube.to = [obj.position[0] + obj.size[0], obj.position[1] + obj.size[1], obj.position[2] + obj.size[2]]
            for (var key in cube.faces) {
              if (obj.faces[key] === undefined) {
                cube.faces[key].texture = null
                cube.faces[key].uv = [0, 0, 0, 0]
              } else {
                cube.faces[key].uv.forEach((n, i) => {
                  cube.faces[key].uv[i] = obj.faces[key].uv[i]
                })
              }
            }
            Outliner.root.push(cube)
            cube.parent = "root"
            cube.init()
            cubes.push(cube);
          })
          if (model.groups && model.groups.length > 0) parseGroups(model.groups)
          updateSelection()
          this.dispatchEvent("parsed", {model})
        }
      })
      Language.data["format_category.blockbench"] ??= "Blockbench"
      format = new ModelFormat({
        id: "preview_scene_model",
        name: "Preview Scene",
        description: "Create a new Preview Scene model",
        extension: "bbscene",
        icon,
        category: "blockbench",
        target: "Blockbench",
        single_texture: true,
        rotate_cubes: true,
        model_identifier: false,
        optional_box_uv: true,
        centered_grid: true,
        codec
      })
      codec.format = format
      exportAction = new Action({
        id: "export_preview_scene_model",
        name: "Export Preview Scene",
        icon,
        condition: {
          formats: [format.id]
        },
        click: () => codec.export()
      })
      MenuBar.addAction(exportAction, "file.export.0")
      exportAction2 = new Action({
        id: "install_preview_scene",
        name: "Install Preview Scene in Blockbench",
        icon: "add_to_photos",
        condition: {
          formats: [format.id]
        },
        click: () => importPreviewScene(JSON.parse(codec.compile()), {dontEnable: true})
      })
      MenuBar.addAction(exportAction2, "file.export.1")
      codec.export_action = exportAction
      manageAction = new Action({
        name,
        id,
        description: "Import and manage your Preview Scenes",
        icon,
        children: [
          new Action({
            id: "manage_preview_scene_models",
            name: "Manage Preview Scenes",
            icon: "photo_library",
            click: () => managePreviewScenes()
          }),
          new Action({
            id: "import_preview_scene_model",
            name: "Import Preview Scene",
            icon: "add_to_photos",
            async click() {
              let model
              try {
                if (isApp) {
                  const file = electron.dialog.showOpenDialogSync({
                    filters: [
                      {
                        name: "Blockbench Preview Scene",
                        extensions: ["bbscene"]
                      }
                    ]
                  })
                  if (!file) return
                  const fs = require("fs")
                  model = JSON.parse(fs.readFileSync(file[0]))
                } else {
                  const input = document.createElement("input")
                  let file
                  input.type = "file"
                  input.accept = ".bbscene"
                  await new Promise(fulfil => {
                    input.onchange = () => {
                      file = Array.from(input.files)
                      fulfil()
                    }
                    input.click()
                  })
                  const text = await new Promise(fulfil => {
                    const fr = new FileReader()
                    fr.onload = () => fulfil(fr.result)
                    fr.readAsText(file[0])
                  })
                  model = JSON.parse(text)
                }
              } catch {
                return Blockbench.showMessageBox({
                  translateKey: "invalid_model",
                  icon: "error"
                })
              }
              importPreviewScene(model)
            }
          }),
          new Action({
            id: "download_preview_scene_models",
            name: "Download Preview Scenes",
            icon: "file_download",
            async click() {
              const sceneData = await fetch("https://raw.githubusercontent.com/ewanhowell5195/preview-scene-customiser/main/scenes.json").then(e => e.json()).catch(() => {})
              if (!sceneData) return new Dialog({
                id: "download_preview_scene_models_connection_failure_dialog",
                title: name,
                lines: ['<h2>Connection failed</h2><span>Please check your internet connection and make sure that you can access <a href="https://raw.githubusercontent.com/ewanhowell5195/preview-scene-customiser/main/scenes.json">GitHub</a></span>'],
                buttons: ["Okay"]
              }).show()
              const dialog = new Dialog({
                id: "download_preview_scene_dialog",
                title: "Preview Scene Customiser Store",
                width: 780,
                buttons: [],
                sidebar: {
                  pages: Object.fromEntries(sceneData.map(e => [e.name, {
                    label: e.name,
                    icon: e.icon
                  }])),
                  onPageSwitch(page) {
                    $("dialog#download_preview_scene_dialog #scene_categories > div").addClass("hidden")
                    $(`dialog#download_preview_scene_dialog #scene_category_${page}`).removeClass("hidden")
                  }
                },
                lines: [`
                  <style>
                    dialog#download_preview_scene_dialog .dialog_wrapper {
                      grid-template-rows: auto;
                    }
                    dialog#download_preview_scene_dialog .dialog_content {
                      margin: 10px 24px 24px;
                    }
                    dialog#download_preview_scene_dialog #button_row {
                      display: flex;
                      justify-content: end;
                      padding-top: 24px;
                      gap: 8px;
                    }
                    dialog#download_preview_scene_dialog .hidden {
                      display: none;
                    }
                    dialog#download_preview_scene_dialog h2 {
                      padding-bottom: 10px;
                    }
                    dialog#download_preview_scene_dialog #scene_categories {
                      height: 455px;
                    }
                    dialog#download_preview_scene_dialog .scenes_container {
                      display: flex;
                      flex-wrap: wrap;
                      gap: 8px;
                      max-height: 400px;
                      overflow-y: auto;
                    }
                    dialog#download_preview_scene_dialog .scene {
                      width: 256px;
                      height: 128px;
                      background-color: var(--color-back);
                      cursor: pointer;
                      position: relative;
                      display: flex;
                      justify-content: end;
                      align-items: center;
                      flex-direction: column;
                      border: 2px solid transparent;
                    }
                    dialog#download_preview_scene_dialog .scene:hover {
                      background-color: var(--color-button);
                    }
                    dialog#download_preview_scene_dialog .scene img {
                      position: absolute;
                      top: 8px;
                      left: 8px;
                    }
                    dialog#download_preview_scene_dialog .scene span {
                      z-index: 1;
                      font-size: 20px;
                      text-align: center;
                    }
                    dialog#download_preview_scene_dialog .scene_author {
                      position: absolute;
                      top: 8px;
                      left: 8px;
                      display: none;
                    }
                    dialog#download_preview_scene_dialog .scene:hover .scene_author {
                      display: inline;
                    }
                    dialog#download_preview_scene_dialog .scene_author:hover {
                      color: var(--color-light);
                    }
                    dialog#download_preview_scene_dialog .scene_author:hover::after {
                      content: attr(data-author);
                      font-family: var(--font-main);
                      position: absolute;
                      background-color: var(--color-dark);
                      padding: 4px;
                      margin-left: 4px;
                      font-size: 0.8em;
                    }
                    dialog#download_preview_scene_dialog .selected {
                      border-color: var(--color-accent);
                      background-color: var(--color-button);
                    }
                    dialog#download_preview_scene_dialog #download {
                      background-color: var(--color-selected);
                    }
                    dialog#download_preview_scene_dialog #download:hover {
                      background-color: var(--color-accent);
                    }
                    dialog#download_preview_scene_dialog .spacer {
                      flex: 1;
                      border-bottom: 2px solid var(--color-border);
                    }
                  </style>
                  <div id="scene_categories"></div>
                  <div id="button_row">
                    <button id="download">Download</button>
                    <button id="close">Close</button>
                  </div>
                `]
              }).show()
              const categories = $("dialog#download_preview_scene_dialog #scene_categories")
              let selected
              for (const category of sceneData) {
                categories.append(E("div").attr("id", `scene_category_${category.name}`).addClass("hidden").append(
                  E("h2").text(category.name),
                  E("div").addClass("scenes_container").append(...category.scenes.map(e => E("div").addClass("scene").attr("data-scene", e.id).append(
                    E("img").attr("src", `https://raw.githubusercontent.com/ewanhowell5195/preview-scene-customiser/main/scenes/${e.id}/scene.webp`),
                    E("span").text(e.name),
                    E("i").addClass("scene_author material-icons").attr("data-author", `By ${e.author}`).text("person")
                  ).on("click", f => {
                    $("dialog#download_preview_scene_dialog #scene_categories .selected").removeClass("selected")
                    $(f.currentTarget).addClass("selected")
                    selected = e
                  })))
                ))
              }
              $(`dialog#download_preview_scene_dialog #scene_category_${sceneData[0].name}`).removeClass("hidden")
              $("dialog#download_preview_scene_dialog #close").on("click", e => dialog.close())
              $("dialog#download_preview_scene_dialog #download").on("click", async e => {
                if (!selected) return Blockbench.showQuickMessage("Please select a preview scene")
                const scene = await fetch(`https://raw.githubusercontent.com/ewanhowell5195/preview-scene-customiser/main/scenes/${selected.id}/scene.bbscene`).then(e => e.json()).catch(() => {})
                if (!scene) return Blockbench.showQuickMessage("Unable to load preview scene")
                importPreviewScene(scene, {name: selected.name})
              })
              $("dialog#download_preview_scene_dialog .dialog_sidebar").append(
                E("div").addClass("spacer"),
                E("a").attr("href", links["github"]).css({
                  display: "flex",
                  gap: "10px",
                  "align-items": "center",
                  "justify-content": "center",
                  margin: "24px",
                  cursor: "pointer",
                  "text-decoration": "none"
                }).append(
                  E("i").addClass("icon fab fa-github").css("font-size", "22px"),
                  E("span").text("Submit your own").css("text-decoration", "underline")
                )
              )
            }
          })
        ]
      })
      MenuBar.addAction(manageAction, "view.3")
      const currentScene = localStorage.getItem("preview_scene")
      if (currentScene) {
        const scene = PreviewScene.scenes[currentScene]
        if (scene) {
          scene.select()
          BarItems.preview_scene.set(scene.id)
        }
      }
      Blockbench.on("select_preview_scene", setCurrentPreviewScene)
      Blockbench.on("unselect_preview_scene", removeCurrentPreviewScene)
    },
    onuninstall: () => localStorage.removeItem("preview_scenes"),
    onunload() {
      Blockbench.removeListener("select_preview_scene", setCurrentPreviewScene)
      Blockbench.removeListener("unselect_preview_scene", removeCurrentPreviewScene)
      aboutAction.delete()
      MenuBar.removeAction(`help.about_plugins.about_${id}`)
      format.delete()
      codec.delete()
      for (const child of manageAction.children) child.delete()
      manageAction.delete()
      exportAction.delete()
      exportAction2.delete()
      BarItems.preview_scene.set("none")
      for (const scene of scenes) {
        PreviewScene.scenes[scene].unselect()
        PreviewScene.scenes[scene].delete()
      }
    }
  })
  window.importTest = (scene, args) => importPreviewScene(scene, args)
  async function importPreviewScene(model, args) {
    let texture = await new Promise(fulfill => new THREE.TextureLoader().load(model.texture, fulfill, null, fulfill))
    const dialog = new Dialog({
      id: "import_preview_scene_dialog",
      title: "Preview Scene Settings",
      buttons: [],
      part_order: ["form", "lines"],
      form: {
        name: {
          label: "Preview Scene Name",
          type: "input",
          placeholder: "Villager House",
          value: args?.name
        },
        renderSide: {
          label: "Render Side",
          type: "select",
          options: {
            0: "Front Side",
            1: "Back Side",
            2: "Double Side"
          },
          "value": 2
        },
        lightSide: {
          label: "Light side",
          type: "select",
          options: {
            0: "Up",
            1: "North",
            2: "East",
            3: "Down",
            4: "South",
            5: "West"
          }
        },
        lightColour: {
          label: "Light colour",
          type: "color"
        },
        tintColour: {
          label: "Tint colour",
          type: "color"
        },
        shading: {
          label: "Shading",
          type: "checkbox",
          value: true
        }
      },
      lines: [`
        <style>
          dialog#import_preview_scene_dialog #button_row {
            display: flex;
            justify-content: end;
            padding-top: 13px;
            gap: 8px;
          }
          dialog#import_preview_scene_dialog #import {
            background-color: var(--color-selected);
          }
          dialog#import_preview_scene_dialog #import:hover {
            background-color: var(--color-accent);
          }
          dialog#import_preview_scene_dialog img {
            height: 128px;
            cursor: pointer;
          }
          dialog#import_preview_scene_dialog #img_container {
            display: flex;
            gap: 5px;
            flex-direction: column;
            margin: 5px;
          }
          dialog#import_preview_scene_dialog #save {
            cursor: pointer;
          }
          dialog#import_preview_scene_dialog #save:hover {
            color: var(--color-light)
          }
        </style>
        <div class="dialog_bar form_bar form_bar_name">
          <label class="name_space_left" for="name">Texture:</label>
          <img id="preview_scene_texture" src="${model.texture}" title="Replace texture" />
          <div id="img_container">
            <div>${texture.image.width} ⨉ ${texture.image.height}</div>
            <i id="save" class="material-icons" title="Save texture">save</i>
          </div>
        </div>
        <div id="button_row">
          <button id="import">Import</button>
          <button id="close">Close</button>
        </div>
      `]
    }).show()
    $("dialog#import_preview_scene_dialog #preview_scene_texture").on("click", async e => {
      let newTexture
      try {
        if (isApp) {
          const file = electron.dialog.showOpenDialogSync({
            filters: [
              {
                name: "PNG Texture",
                extensions: ["png"]
              }
            ]
          })
          if (!file) return
          newTexture = await new Promise(fulfill => new THREE.TextureLoader().load(file[0], fulfill, null, fulfill))
        } else {
          const input = document.createElement("input")
          let file
          input.type = "file"
          input.accept = ".png"
          await new Promise(fulfil => {
            input.onchange = () => {
              file = Array.from(input.files)
              fulfil()
            }
            input.click()
          })
          const data = await new Promise(fulfil => {
            const fr = new FileReader()
            fr.onload = () => fulfil(fr.result)
            fr.readAsDataURL(file[0])
          })
          newTexture = await new Promise(fulfill => new THREE.TextureLoader().load(data, fulfill, null, fulfill))
        }
      } catch {
        return Blockbench.showQuickMessage("Unable to load texture")
      }
      if (texture.image.width !== newTexture.image.width || texture.image.height !== newTexture.image.height) return Blockbench.showQuickMessage(`Selected texture does not match required dimentions of ${texture.image.width} ⨉ ${texture.image.height}`, 2000)
      texture = newTexture
      const canvas = document.createElement("canvas")
      canvas.width = texture.image.width
      canvas.height = texture.image.height
      canvas.getContext("2d").drawImage(texture.image, 0, 0)
      const data = canvas.toDataURL()
      $("dialog#import_preview_scene_dialog #preview_scene_texture").attr("src", data)
      model.texture = data
    })
    $("dialog#import_preview_scene_dialog #save").on("click", e => Blockbench.export({
      type: "PNG Texture",
      extensions: ["png"],
      name: args?.name,
      content: model.texture,
      savetype: "image"
    }))
    $("dialog#import_preview_scene_dialog #close").on("click", e => dialog.close())
    $("dialog#import_preview_scene_dialog #import").on("click", e => {
      const name = dialog.form.name.bar.find("input").val().trim()
      if (!name) return Blockbench.showQuickMessage("Invalid name")
      const id = name.toLowerCase().replace(/\s/g, "_")
      if (PreviewScene.scenes[id]?.id) return Blockbench.showQuickMessage("Preview Scene already exists, please pick a different name", 2000) 
      const lightColour = dialog.form.lightColour.colorpicker.value.toRgb()
      model.color = "#" + dialog.form.tintColour.colorpicker.value.toHex()
      model.shading = dialog.form.shading.bar.find("input").is(":checked")
      model.render_side = parseInt(dialog.form.renderSide.bar.find("bb-select").attr("value"))
      scenes.push(id)
        new PreviewModel(id, model)
        const scene = new PreviewScene(id, {
          name,
          preview_models: [id],
          light_color: {
            r: lightColour.r / 255,
            g: lightColour.g / 255,
            b: lightColour.b / 255
          },
          light_side: parseInt(dialog.form.lightSide.bar.find("bb-select").attr("value"))
        })
        if (!args?.dontEnable) {
          for (const scene in PreviewScene.scenes) PreviewScene.scenes[scene].unselect()
          scene.select()
          BarItems.preview_scene.set(id)
        }
        const stored = JSON.parse(localStorage.getItem("preview_scenes") ?? "[]")
        stored.push({
          id,
          name, 
          model: model
        })
        localStorage.setItem("preview_scenes", JSON.stringify(stored))
        dialog.close()
    })
  }
  async function managePreviewScenes() {
    const dialog = new Dialog({
      title: "Manage Preview Scenes",
      id: "manage_preview_scenes_dialog",
      lines: [`
        <style>
          dialog#manage_preview_scenes_dialog .dialog_content {
            margin-top: 10px;
          }
          dialog#manage_preview_scenes_dialog #button_row {
            display: flex;
            justify-content: end;
            padding-top: 8px;
          }
          dialog#manage_preview_scenes_dialog .hidden {
            display: none;
          }
          dialog#manage_preview_scenes_dialog .row {
            display: flex;
            padding: 2px 4px 2px 1em;
            align-items: center;
          }
          dialog#manage_preview_scenes_dialog .row .spacer {
            height: 2px;
            background-color: var(--color-button);
            margin: 0 10px
          }
          dialog#manage_preview_scenes_dialog #preview_scenes > div {
            padding-bottom: 16px;
          }
          dialog#manage_preview_scenes_dialog .spacer {
            flex: 1;
          }
          dialog#manage_preview_scenes_dialog .dialog_content i {
            cursor: pointer;
            margin-left: 5px;
          }
          dialog#manage_preview_scenes_dialog i:hover {
            color: var(--color-light);
          }
          dialog#manage_preview_scenes_dialog .dialog_wrapper {
            position: relative;
          }
          dialog#manage_preview_scenes_dialog #delete_warning {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          dialog#manage_preview_scenes_dialog #delete_warning_darken {
            position: absolute;
            width: 100%;
            height: 100%;
            background-color: var(--color-dark);
            opacity: 0.8;
          }
          dialog#manage_preview_scenes_dialog #delete_warning_container {
            z-index: 1;
            display: flex;
            gap: 24px;
            flex-direction: column;
            align-items: center;
            filter: drop-shadow(0 0 10px var(--color-dark))
          }
          dialog#manage_preview_scenes_dialog #delete_warning_container h2 {
            text-align: center;
          }
          dialog#manage_preview_scenes_dialog #delete_warning_buttons {
            display: flex;
            gap: 24px;
          }
          dialog#manage_preview_scenes_dialog .danger-button:hover {
            background-color: var(--color-close);
            color: var(--color-text)!important;
          }
        </style>
        <div>
          <div id="preview_scenes">
            <h2 id="builtin_label" class="hidden">Built-in Preview Scenes</h2>
            <div id="builtin_preview_scenes" class="hidden"></div>
            <h2 id="custom_label" class="hidden">Custom Preview Scenes</h2>
            <div id="custom_preview_scenes" class="hidden"></div>
          </div>
          <div id="button_row">
            <button id="close">Close</button>
          </div>
        </div>
      `],
      buttons: []
    }).show()
    $("dialog#manage_preview_scenes_dialog #close").on("click", e => dialog.cancel())
    const builtinScenes = Object.entries(PreviewScene.scenes).filter(e => !scenes.includes(e[0]))
    if (builtinScenes.length) {
      $("dialog#manage_preview_scenes_dialog #builtin_label").removeClass("hidden")
      const builtin = $("dialog#manage_preview_scenes_dialog #builtin_preview_scenes").removeClass("hidden")
      for (const scene of builtinScenes) {
        builtin.append(E("div").addClass("row").append(
          E("div").text(scene[1].name),
          E("span").addClass("spacer"),
          E("i").addClass("material-icons icon").text("edit").attr("title", "Edit preview scene").on("click", e => {
            editPreviewScene(scene[1])
            dialog.close()
          }),
          E("i").addClass("material-icons icon").text("save").attr("title", "Save preview scene").on("click", e => savePreviewScene(scene[1]))
        ))
      }
    }
    const customScenes = Object.entries(PreviewScene.scenes).filter(e => scenes.includes(e[0]))
    if (customScenes.length) {
      $("dialog#manage_preview_scenes_dialog #custom_label").removeClass("hidden")
      const custom = $("dialog#manage_preview_scenes_dialog #custom_preview_scenes").removeClass("hidden")
      for (const scene of customScenes) {
        custom.append(E("div").addClass("row").append(
          E("span").text(scene[1].name),
          E("span").addClass("spacer"),
          E("i").addClass("material-icons icon").text("edit").attr("title", "Edit preview scene").on("click", e => {
            editPreviewScene(scene[1])
            dialog.close()
          }),
          E("i").addClass("material-icons icon").text("save").attr("title", "Save preview scene").on("click", e => savePreviewScene(scene[1])),
          E("i").addClass("material-icons icon").text("delete").attr("title", "Delete preview scene").on("click", e => {
            $("dialog#manage_preview_scenes_dialog .dialog_wrapper").append(
              E("div").attr("id", "delete_warning").append(
                E("div").attr("id", "delete_warning_darken"),
                E("div").attr("id", "delete_warning_container").append(
                  E("h2").html(`Are you sure you want to delete<br><strong>${scene[1].name}</strong>?`),
                  E("div").attr("id", "delete_warning_buttons").append(
                    E("button").text("Cancel").on("click", e => $("dialog#manage_preview_scenes_dialog #delete_warning").remove()),
                    E("button").addClass("danger-button").text("Delete").on("click", e => {
                      BarItems.preview_scene.set("none")
                      PreviewScene.scenes[scene[1].id].unselect()
                      PreviewScene.scenes[scene[1].id].delete()
                      scenes.splice(scenes.indexOf(scene[1].id), 1)
                      const stored = JSON.parse(localStorage.getItem("preview_scenes"))
                      stored.splice(stored.findIndex(e => e.id === scene[1].id), 1)
                      localStorage.setItem("preview_scenes", JSON.stringify(stored))
                      managePreviewScenes()
                    })
                  )
                )
              )
            )
          })
        ))
      }
    }
  }
  function getModel(model) {
    const data = {}
    if (model.texture) data.texture = model.texture
    if (!model.texture_size.allEqual(16)) data.texture_size = model.texture_size
    data.cubes = model.cubes
    return data
  }
  function editPreviewScene(scene) {
    BarItems.preview_scene.set("none")
    for (const scene of scenes) PreviewScene.scenes[scene].unselect()
    const model = getModel(scene.preview_models[0])
    codec.parse(model)
    Project.name = scene.id
    Blockbench.setStatusBarText(scene.name)
  }
  function savePreviewScene(scene) {
    for (const model of scene.preview_models) {
      const out = getModel(model)
      Blockbench.export({
        type: "Blockbench Preview Scene",
        extensions: ["bbscene"],
        name: scene.id,
        content: autoStringify(out),
        savetype: "bbscene"
      })
    }
  }
  function addAbout() {
    let about = MenuBar.menus.help.structure.find(e => e.id === "about_plugins")
    if (!about) {
      about = new Action("about_plugins", {
        name: "About Plugins...",
        icon: "info",
        children: []
      })
      MenuBar.addAction(about, "help")
    }
    aboutAction = new Action(`about_${id}`, {
      name: `About ${name}...`,
      icon,
      click: () => showAbout()
    })
    about.children.push(aboutAction)
  }
  function showAbout(banner) {
    const infoBox = new Dialog({
      id: "about",
      title: name,
      width: 780,
      buttons: [],
      lines: [`
        <style>
          dialog#about .dialog_title {
            padding-left: 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          dialog#about .dialog_content {
            text-align: left!important;
            margin: 0!important;
          }
          dialog#about .socials {
            padding: 0!important;
          }
          dialog#about #banner {
            background-color: var(--color-accent);
            color: var(--color-accent_text);
            width: 100%;
            padding: 0 8px
          }
          dialog#about #content {
            margin: 24px;
          }
        </style>
        ${banner ? `<div id="banner">This window can be reopened at any time from <strong>Help > About Plugins > ${name}</strong></div>` : ""}
        <div id="content">
          <h1 style="margin-top:-10px">${name}</h1>
          <p>placeholder</p>
          <div class="socials">
            <a href="${links["website"]}" class="open-in-browser">
              <i class="icon material-icons" style="color:#33E38E">language</i>
              <label>By ${author}</label>
            </a>
            <a href="${links["discord"]}" class="open-in-browser">
              <i class="icon fab fa-discord" style="color:#727FFF"></i>
              <label>Discord Server</label>
            </a>
          </div>
        </div>
      `]
    }).show()
    $("dialog#about .dialog_title").html(`
      <i class="icon material-icons">${icon}</i>
      ${name}
    `)
  }
})()