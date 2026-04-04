const id = "render_mode"
const name = "Render Mode"
const icon = "lightbulb"

let pointLightAction, sunLightAction, areaLightAction, ambientAction, cameraListener, changeViewModeListener, ambientLight

const lightMenu = new Menu([
  ...Outliner.control_menu_group,
  new MenuSeparator("manage"),
  "rename",
  "toggle_visibility",
  "delete"
])

class LightElement extends OutlinerElement {
  constructor(data, uuid) {
    super(data, uuid)
    for (const key in this.constructor.properties) {
      this.constructor.properties[key].reset(this)
    }
    if (data) this.extend(data)
  }
  get origin() {
    return this.position
  }
  extend(object) {
    if (object.from) this.position.V3_set(object.from)
    for (const key in this.constructor.properties) {
      this.constructor.properties[key].merge(this, object)
    }
    this.sanitizeName()
    Merge.boolean(this, object, "export")
    return this
  }
  init() {
    if (this.parent instanceof Group === false) {
      this.addTo(Group.first_selected)
    }
    super.init()
    return this
  }
  flip(axis, center) {
    const offset = this.position[axis] - center
    this.position[axis] = center - offset
    flipNameOnAxis(this, axis)
    this.createUniqueName()
    this.preview_controller.updateTransform(this)
    return this
  }
  getWorldCenter() {
    const pos = new THREE.Vector3()
    const q = Reusable.quat1.set(0, 0, 0, 1)
    if (this.parent instanceof Group) {
      THREE.fastWorldPosition(this.parent.mesh, pos)
      this.parent.mesh.getWorldQuaternion(q)
      const offset2 = Reusable.vec2.fromArray(this.parent.origin).applyQuaternion(q)
      pos.sub(offset2)
    }
    const offset = Reusable.vec3.fromArray(this.position).applyQuaternion(q)
    pos.add(offset)
    return pos
  }
}
LightElement.prototype.visibility = true
LightElement.prototype.buttons = [
  Outliner.buttons.locked,
  Outliner.buttons.visibility
]
LightElement.prototype.menu = lightMenu

class PointLightElement extends LightElement {
  static behavior = {
    movable: true,
    hide_in_screenshot: true
  }
}
PointLightElement.prototype.title = "Point Light"
PointLightElement.prototype.type = "point_light"
PointLightElement.prototype.icon = "lightbulb"

class SunLightElement extends LightElement {
  flip(axis, center) {
    const offset = this.position[axis] - center
    this.position[axis] = center - offset
    this.rotation.forEach((n, i) => {
      if (i != axis) this.rotation[i] = -n
    })
    flipNameOnAxis(this, axis)
    this.createUniqueName()
    this.preview_controller.updateTransform(this)
    return this
  }
  static behavior = {
    movable: true,
    rotatable: true,
    hide_in_screenshot: true
  }
}
SunLightElement.prototype.title = "Sun Light"
SunLightElement.prototype.type = "sun_light"
SunLightElement.prototype.icon = "wb_sunny"

class AreaLightElement extends LightElement {
  flip(axis, center) {
    const offset = this.position[axis] - center
    this.position[axis] = center - offset
    this.rotation.forEach((n, i) => {
      if (i != axis) this.rotation[i] = -n
    })
    flipNameOnAxis(this, axis)
    this.createUniqueName()
    this.preview_controller.updateTransform(this)
    return this
  }
  size(axis) {
    const s = [this.light_width, this.light_height, 0]
    return axis !== undefined ? s[axis] : s
  }
  getSize(axis) {
    return this.size(axis)
  }
  resize(val, axis, negative, allow_negative, bidirectional) {
    if (axis === 2) return
    // old_size is set by onStart and deleted by onEnd, so use it to detect new drag
    if (this.temp_data._old_size_ref !== this.temp_data.old_size) {
      this.temp_data._old_size_ref = this.temp_data.old_size
      this.temp_data.old_position = this.position.slice()
    }
    const prop = axis === 0 ? "light_width" : "light_height"
    const before = this.temp_data.old_size?.[axis] ?? this[prop]
    const modify = val instanceof Function ? val : n => n + val
    let newSize = modify(before)
    if (negative) newSize = before - (newSize - before)
    newSize = Math.max(0.1, newSize)
    const difference = newSize - before

    this[prop] = newSize

    if (!bidirectional) {
      const sign = negative ? -1 : 1
      const offset = difference / 2 * sign
      const dir = new THREE.Vector3(axis === 0 ? offset : 0, axis === 1 ? offset : 0, 0)
      const euler = new THREE.Euler(
        Math.degToRad(this.rotation[0]),
        Math.degToRad(this.rotation[1]),
        Math.degToRad(this.rotation[2]),
        "ZYX"
      )
      dir.applyEuler(euler)
      this.position[0] = this.temp_data.old_position[0] + dir.x
      this.position[1] = this.temp_data.old_position[1] + dir.y
      this.position[2] = this.temp_data.old_position[2] + dir.z
    }
    this.preview_controller.updateTransform(this)
  }
  static behavior = {
    movable: true,
    rotatable: true,
    resizable: true,
    hide_in_screenshot: true
  }
}
AreaLightElement.prototype.title = "Area Light"
AreaLightElement.prototype.type = "area_light"
AreaLightElement.prototype.icon = "fluorescent"

Plugin.register(id, {
  title: name,
  icon,
  author: "Ewan Howell",
  description: "Add light elements to your scene for use with a render mode.",
  tags: ["Rendering", "Lights"],
  version: "1.0.0",
  min_version: "5.0.0",
  variant: "both",
  onload() {
    if (!THREE.RectAreaLightUniformsLib) {
      fetch("https://cdn.jsdelivr.net/npm/three@0." + THREE.REVISION + ".0/examples/js/lights/RectAreaLightUniformsLib.js")
        .then(r => r.text())
        .then(code => {
          eval(code)
          THREE.RectAreaLightUniformsLib.init()
        })
    } else {
      THREE.RectAreaLightUniformsLib.init()
    }

    // Generate light icon texture using Material Icons
    const canvas = document.createElement("canvas")
    canvas.width = 48
    canvas.height = 48
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, 48, 48)
    ctx.fillStyle = "#ffffff"
    ctx.font = "48px 'Material Icons'"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("lightbulb", 24, 24)
    const lightIconTexture = new THREE.CanvasTexture(canvas)
    lightIconTexture.magFilter = THREE.LinearFilter
    lightIconTexture.minFilter = THREE.LinearFilter

    // Generate sun icon texture
    const sunCanvas = document.createElement("canvas")
    sunCanvas.width = 48
    sunCanvas.height = 48
    const sunCtx = sunCanvas.getContext("2d")
    sunCtx.clearRect(0, 0, 48, 48)
    sunCtx.fillStyle = "#ffffff"
    sunCtx.font = "48px 'Material Icons'"
    sunCtx.textAlign = "center"
    sunCtx.textBaseline = "middle"
    sunCtx.fillText("wb_sunny", 24, 24)
    const sunIconTexture = new THREE.CanvasTexture(sunCanvas)
    sunIconTexture.magFilter = THREE.LinearFilter
    sunIconTexture.minFilter = THREE.LinearFilter

    // Generate area light icon texture
    const areaCanvas = document.createElement("canvas")
    areaCanvas.width = 48
    areaCanvas.height = 48
    const areaCtx = areaCanvas.getContext("2d")
    areaCtx.clearRect(0, 0, 48, 48)
    areaCtx.fillStyle = "#ffffff"
    areaCtx.font = "48px 'Material Icons'"
    areaCtx.textAlign = "center"
    areaCtx.textBaseline = "middle"
    areaCtx.fillText("fluorescent", 24, 24)
    const areaIconTexture = new THREE.CanvasTexture(areaCanvas)
    areaIconTexture.magFilter = THREE.LinearFilter
    areaIconTexture.minFilter = THREE.LinearFilter

    // Initialize RectAreaLight uniforms

    // Shared properties on each subclass
    function registerSharedProperties(Type) {
      new Property(Type, "vector", "position")
      new Property(Type, "number", "light_intensity", {
        default: 4,
        inputs: {
          element_panel: {
            input: { label: "Intensity", type: "number", min: 0, step: 0.1 },
            onChange() {
              Canvas.updateView({ elements: Outliner.selected, element_aspects: { transform: true } })
            }
          }
        }
      })
      new Property(Type, "string", "light_color", {
        default: "#ffffff",
        inputs: {
          element_panel: {
            input: { label: "Color", type: "color" },
            onChange() {
              Canvas.updateView({ elements: Outliner.selected, element_aspects: { transform: true } })
            }
          }
        }
      })
      new Property(Type, "boolean", "visibility", { default: true })
      new Property(Type, "boolean", "locked")
    }

    // Point light properties
    registerSharedProperties(PointLightElement)
    new Property(PointLightElement, "string", "name", { default: "point_light" })
    new Property(PointLightElement, "number", "light_distance", {
      default: 8,
      inputs: {
        element_panel: {
          input: { label: "Distance", description: "Maximum range of the light. 0 = unlimited.", type: "number", min: 0, step: 1 },
          onChange() {
            Canvas.updateView({ elements: PointLightElement.selected, element_aspects: { transform: true } })
          }
        }
      }
    })
    new Property(PointLightElement, "number", "light_decay", {
      default: 2,
      inputs: {
        element_panel: {
          input: { label: "Decay", description: "The amount the light dims along the distance.", type: "number", min: 0, step: 0.1 },
          onChange() {
            Canvas.updateView({ elements: PointLightElement.selected, element_aspects: { transform: true } })
          }
        }
      }
    })

    // Sun light properties
    registerSharedProperties(SunLightElement)
    new Property(SunLightElement, "string", "name", { default: "sun_light" })
    new Property(SunLightElement, "vector", "rotation")

    // Area light properties
    registerSharedProperties(AreaLightElement)
    new Property(AreaLightElement, "string", "name", { default: "area_light" })
    new Property(AreaLightElement, "vector", "rotation")
    new Property(AreaLightElement, "number", "light_width", { default: 4 })
    new Property(AreaLightElement, "number", "light_height", { default: 4 })

    // ---- Point Light Preview Controller ----
    new NodePreviewController(PointLightElement, {
      setup(element) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(1, 8, 6),
          Canvas.transparentMaterial
        )
        Project.nodes_3d[element.uuid] = mesh
        mesh.name = element.uuid
        mesh.type = element.type
        mesh.isElement = true
        mesh.visible = element.visibility
        mesh.rotation.order = Format.euler_order

        const light = new THREE.PointLight(
          element.light_color,
          element.light_intensity,
          element.light_distance,
          element.light_decay
        )
        mesh.add(light)
        mesh.light = light

        // Sprite icon (same pattern as Locator)
        const spriteMaterial = new THREE.SpriteMaterial({
          map: lightIconTexture,
          alphaTest: 0.1,
          sizeAttenuation: false
        })
        const sprite = new THREE.Sprite(spriteMaterial)
        sprite.name = element.uuid
        sprite.type = element.type
        sprite.isElement = true
        mesh.add(sprite)
        mesh.sprite = sprite

        // Distance circles
        const circlePoints = []
        for (let i = 0; i <= 64; i++) {
          const angle = (i / 64) * Math.PI * 2
          circlePoints.push(new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0))
        }
        const circleGeometry = new THREE.BufferGeometry().setFromPoints(circlePoints)

        const outerCircle = new THREE.Line(circleGeometry.clone(), new THREE.LineBasicMaterial({ color: gizmo_colors.outline, transparent: true, opacity: 0.5 }))
        mesh.add(outerCircle)

        const innerCircle = new THREE.Line(circleGeometry.clone(), new THREE.LineBasicMaterial({ color: gizmo_colors.outline, transparent: true, opacity: 0.5 }))
        mesh.add(innerCircle)

        mesh.outerCircle = outerCircle
        mesh.innerCircle = innerCircle

        this.updateTransform(element)
        this.dispatchEvent("setup", { element })
      },
      updateTransform(element) {
        NodePreviewController.prototype.updateTransform.call(this, element)

        const { mesh } = element
        if (!mesh) return

        if (mesh.light) {
          mesh.light.color.set(element.light_color)
          mesh.light.intensity = element.light_intensity
          mesh.light.distance = element.light_distance
          mesh.light.decay = element.light_decay
        }
        const d = element.light_distance || 0
        const visible = d > 0
        mesh.outerCircle.visible = visible
        mesh.innerCircle.visible = visible
        if (visible && Preview.selected) {
          const quat = Preview.selected.camera.quaternion
          mesh.outerCircle.scale.set(d, d, d)
          mesh.outerCircle.quaternion.copy(quat)
          const decay = element.light_decay
          mesh.innerCircle.visible = decay > 0
          if (decay > 0) {
            const innerD = d * Math.pow(0.5, decay)
            mesh.innerCircle.scale.set(innerD, innerD, innerD)
          }
          mesh.innerCircle.quaternion.copy(quat)
        }
        this.updateWindowSize(element)
        this.dispatchEvent("update_transform", { element })
      },
      updateSelection(element) {
        const { mesh } = element
        if (!mesh) return

        const color = element.selected ? gizmo_colors.outline : CustomTheme.data.colors.text
        if (mesh.sprite) {
          mesh.sprite.material.color.set(color)
          mesh.sprite.material.depthTest = !element.selected
          mesh.renderOrder = element.selected ? 100 : 0
        }
        if (mesh.outerCircle) {
          mesh.outerCircle.visible = element.selected && (element.light_distance > 0)
        }
        if (mesh.innerCircle) {
          mesh.innerCircle.visible = element.selected && (element.light_distance > 0) && (element.light_decay > 0)
        }
        this.dispatchEvent("update_selection", { element })
      },
      updateWindowSize(element) {
        const size = 0.4 * Preview.selected.camera.fov / Preview.selected.height
        element.mesh.sprite.scale.set(size, size, size)
      }
    })

    // ---- Sun Light Preview Controller ----
    new NodePreviewController(SunLightElement, {
      setup(element) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(1, 8, 6),
          Canvas.transparentMaterial
        )
        Project.nodes_3d[element.uuid] = mesh
        mesh.name = element.uuid
        mesh.type = element.type
        mesh.isElement = true
        mesh.visible = element.visibility
        mesh.rotation.order = Format.euler_order

        const light = new THREE.DirectionalLight(element.light_color, element.light_intensity)
        light.target = new THREE.Object3D()
        light.target.position.set(0, -1, 0)
        light.add(light.target)
        mesh.add(light)
        mesh.light = light

        const spriteMaterial = new THREE.SpriteMaterial({
          map: sunIconTexture,
          alphaTest: 0.1,
          sizeAttenuation: false
        })
        const sprite = new THREE.Sprite(spriteMaterial)
        sprite.name = element.uuid
        sprite.type = element.type
        sprite.isElement = true
        mesh.add(sprite)
        mesh.sprite = sprite

        // Direction line
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, -Number.MAX_SAFE_INTEGER, 0)
        ])
        const line = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({ color: gizmo_colors.outline, transparent: true, opacity: 0.5 }))
        mesh.add(line)
        mesh.directionLine = line

        this.updateTransform(element)
        this.dispatchEvent("setup", { element })
      },
      updateTransform(element) {
        NodePreviewController.prototype.updateTransform.call(this, element)
        const { mesh } = element
        if (!mesh) return

        mesh.light.color.set(element.light_color)
        mesh.light.intensity = element.light_intensity

        const size = 0.4 * Preview.selected.camera.fov / Preview.selected.height
        mesh.sprite.scale.set(size, size, size)
        this.dispatchEvent("update_transform", { element })
      },
      updateSelection(element) {
        const { mesh } = element
        if (!mesh) return
        const color = element.selected ? gizmo_colors.outline : CustomTheme.data.colors.text
        if (mesh.sprite) {
          mesh.sprite.material.color.set(color)
          mesh.sprite.material.depthTest = !element.selected
          mesh.renderOrder = element.selected ? 100 : 0
        }
        if (mesh.directionLine) {
          mesh.directionLine.visible = element.selected
        }
        this.dispatchEvent("update_selection", { element })
      },
      updateWindowSize(element) {
        const size = 0.4 * Preview.selected.camera.fov / Preview.selected.height
        element.mesh.sprite.scale.set(size, size, size)
      }
    })

    // ---- Area Light Preview Controller ----
    new NodePreviewController(AreaLightElement, {
      setup(element) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(1, 8, 6),
          Canvas.transparentMaterial
        )
        Project.nodes_3d[element.uuid] = mesh
        mesh.name = element.uuid
        mesh.type = element.type
        mesh.isElement = true
        mesh.visible = element.visibility
        mesh.rotation.order = Format.euler_order

        const light = new THREE.RectAreaLight(element.light_color, element.light_intensity, element.light_width, element.light_height)
        light.rotation.y = Math.PI
        mesh.add(light)
        mesh.light = light

        const spriteMaterial = new THREE.SpriteMaterial({
          map: areaIconTexture,
          alphaTest: 0.1,
          sizeAttenuation: false
        })
        const sprite = new THREE.Sprite(spriteMaterial)
        sprite.name = element.uuid
        sprite.type = element.type
        sprite.isElement = true
        mesh.add(sprite)
        mesh.sprite = sprite

        // Wireframe rectangle to show area
        const rectGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-0.5, 0.5, 0),
          new THREE.Vector3(0.5, 0.5, 0),
          new THREE.Vector3(0.5, -0.5, 0),
          new THREE.Vector3(-0.5, -0.5, 0),
          new THREE.Vector3(-0.5, 0.5, 0)
        ])
        const rect = new THREE.Line(rectGeometry, new THREE.LineBasicMaterial({ color: gizmo_colors.outline, transparent: true, opacity: 0.5 }))
        mesh.add(rect)
        mesh.rect = rect

        // Direction arrow
        const arrowGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, Number.MAX_SAFE_INTEGER)
        ])
        const arrow = new THREE.Line(arrowGeometry, new THREE.LineBasicMaterial({ color: gizmo_colors.outline, transparent: true, opacity: 0.5 }))
        mesh.add(arrow)
        mesh.arrow = arrow

        this.updateTransform(element)
        this.dispatchEvent("setup", { element })
      },
      updateTransform(element) {
        NodePreviewController.prototype.updateTransform.call(this, element)
        const { mesh } = element
        if (!mesh) return

        mesh.light.color.set(element.light_color)
        mesh.light.intensity = element.light_intensity
        mesh.light.width = element.light_width
        mesh.light.height = element.light_height

        if (mesh.rect) {
          mesh.rect.scale.set(element.light_width, element.light_height, 1)
        }

        const size = 0.4 * Preview.selected.camera.fov / Preview.selected.height
        mesh.sprite.scale.set(size, size, size)
        this.dispatchEvent("update_transform", { element })
      },
      updateSelection(element) {
        const { mesh } = element
        if (!mesh) return
        const color = element.selected ? gizmo_colors.outline : CustomTheme.data.colors.text
        if (mesh.sprite) {
          mesh.sprite.material.color.set(color)
          mesh.sprite.material.depthTest = !element.selected
          mesh.renderOrder = element.selected ? 100 : 0
        }
        if (mesh.rect) {
          mesh.rect.visible = element.selected
        }
        if (mesh.arrow) {
          mesh.arrow.visible = element.selected
        }
        this.dispatchEvent("update_selection", { element })
      },
      updateWindowSize(element) {
        const size = 0.4 * Preview.selected.camera.fov / Preview.selected.height
        element.mesh.sprite.scale.set(size, size, size)
      }
    })

    OutlinerElement.registerType(PointLightElement, "point_light")
    OutlinerElement.registerType(SunLightElement, "sun_light")
    OutlinerElement.registerType(AreaLightElement, "area_light")

    // Project-level ambient light properties
    new Property(ModelProject, "number", "render_ambient_intensity", {
        default: 0.15,
        exposed: false
      }),
      new Property(ModelProject, "string", "render_ambient_color", {
        default: "#ffffff",
        exposed: false
      })

    ambientLight = new THREE.AmbientLight(0xffffff, 0.15)

    ambientAction = new Action("render_ambient_settings", {
      icon: "wb_twilight",
      name: "Ambient Light",
      category: "view",
      condition: () => Project,
      click() {
        const prevIntensity = Project.render_ambient_intensity
        const prevColor = Project.render_ambient_color
        new Dialog("render_ambient_settings", {
          title: "Ambient Light",
          form: {
            intensity: { label: "Intensity", type: "number", value: prevIntensity, min: 0, step: 0.1 },
            color: { label: "Color", type: "color", value: prevColor }
          },
          onFormChange(form) {
            ambientLight.intensity = form.intensity
            ambientLight.color.set(form.color.toHexString())
          },
          onConfirm(form) {
            Project.render_ambient_intensity = form.intensity
            Project.render_ambient_color = form.color.toHexString()
          },
          onCancel() {
            ambientLight.intensity = prevIntensity
            ambientLight.color.set(prevColor)
          }
        }).show()
      }
    })

    MenuBar.menus.view.addAction("_", "#view_mode")
    MenuBar.menus.view.addAction(ambientAction, "#view_mode")

    // Add "Rendered" view mode
    BarItems.view_mode.options.rendered = {
      name: "Rendered",
      icon: "lightbulb",
      condition: () => (!Toolbox.selected.allowed_view_modes || Toolbox.selected.allowed_view_modes.includes("rendered"))
    }
    // Add DOM button for icon_mode BarSelect
    const viewModeSelect = BarItems.view_mode
    viewModeSelect.nodes.forEach(node => {
      const button = document.createElement("div")
      button.className = "select_option"
      button.setAttribute("key", "rendered")
      button.append(Blockbench.getIconNode("lightbulb"))
      node.append(button)
      button.addEventListener("click", event => {
        viewModeSelect.set("rendered")
        if (viewModeSelect.onChange) {
          viewModeSelect.onChange(viewModeSelect, event)
        }
      })
      button.title = "Rendered"
    })

    // Cache for rendered-mode MeshPhysicalMaterials per texture
    const renderedMaterials = new Map()

    function getRenderedMaterial(tex) {
      if (!tex) return new THREE.MeshPhysicalMaterial({ color: 0x808080 })
      if (renderedMaterials.has(tex.uuid)) return renderedMaterials.get(tex.uuid)
      const mat = new THREE.MeshPhysicalMaterial({
        map: tex.getMaterial().map || null,
        alphaTest: 0.05,
        side: THREE.FrontSide
      })
      renderedMaterials.set(tex.uuid, mat)
      return mat
    }

    function applyRenderedMode() {
      scene.remove(lights)
      scene.remove(Sun)
      if (Canvas.material_light) scene.remove(Canvas.material_light)
      ambientLight.intensity = Project.render_ambient_intensity
      ambientLight.color.set(Project.render_ambient_color)
      scene.add(ambientLight)
      Outliner.elements.forEach(el => {
        if (!el.mesh || !el.faces) return
        el.mesh._originalMaterial = el.mesh.material
        if (Format.single_texture) {
          el.mesh.material = getRenderedMaterial(Texture.getDefault())
        } else if (el.mesh.material instanceof Array) {
          el.mesh.material = el.mesh.material.map((mat, i) => {
            const face = Canvas.face_order[i]
            const tex = el.faces[face]?.getTexture()
            return getRenderedMaterial(tex)
          })
        } else {
          const tex = Object.values(el.faces).find(f => f.getTexture())?.getTexture()
          el.mesh.material = getRenderedMaterial(tex)
        }
      })
    }

    function exitRenderedMode() {
      scene.remove(ambientLight)
      Outliner.elements.forEach(el => {
        if (el.mesh?._originalMaterial) {
          el.mesh.material = el.mesh._originalMaterial
          delete el.mesh._originalMaterial
        }
      })
      updateShading()
    }

    changeViewModeListener = (data) => {
      if (data.view_mode === "rendered") {
        applyRenderedMode()
      } else if (data.previous_view_mode === "rendered") {
        exitRenderedMode()
      }
    }
    Blockbench.on("change_view_mode", changeViewModeListener)

    // Re-apply rendered mode after Canvas.updateViewMode resets materials
    Blockbench.on("update_view", () => {
      if (Project?.view_mode === "rendered") applyRenderedMode()
    })

    cameraListener = () => {
      if (!Preview.selected) return
      const quat = Preview.selected.camera.quaternion
      for (const element of PointLightElement.all) {
        if (element.mesh?.outerCircle) element.mesh.outerCircle.quaternion.copy(quat)
        if (element.mesh?.innerCircle) element.mesh.innerCircle.quaternion.copy(quat)
      }
    }
    Blockbench.on("render_frame", cameraListener)

    pointLightAction = new Action("add_point_light", {
      icon: "lightbulb",
      category: "edit",
      name: "Add Point Light",
      condition: () => Modes.edit,
      click() {
        const objs = []
        Undo.initEdit({ elements: objs, outliner: true })
        const light = new PointLightElement().addTo(Group.first_selected || Outliner.selected[0]).init()
        light.select().createUniqueName()
        objs.push(light)
        Undo.finishEdit("Add point light")
        Vue.nextTick(() => {
          if (settings.create_rename.value) {
            light.rename()
          }
        })
      }
    })

    sunLightAction = new Action("add_sun_light", {
      icon: "wb_sunny",
      category: "edit",
      name: "Add Sun Light",
      condition: () => Modes.edit,
      click() {
        const objs = []
        Undo.initEdit({ elements: objs, outliner: true })
        const light = new SunLightElement().addTo(Group.first_selected || Outliner.selected[0]).init()
        light.select().createUniqueName()
        objs.push(light)
        Undo.finishEdit("Add sun light")
        Vue.nextTick(() => {
          if (settings.create_rename.value) {
            light.rename()
          }
        })
      }
    })

    areaLightAction = new Action("add_area_light", {
      icon: "fluorescent",
      category: "edit",
      name: "Add Area Light",
      condition: () => Modes.edit,
      click() {
        const objs = []
        Undo.initEdit({ elements: objs, outliner: true })
        const light = new AreaLightElement().addTo(Group.first_selected || Outliner.selected[0]).init()
        light.select().createUniqueName()
        objs.push(light)
        Undo.finishEdit("Add area light")
        Vue.nextTick(() => {
          if (settings.create_rename.value) {
            light.rename()
          }
        })
      }
    })

    BarItems.add_element.side_menu.structure.push({
      id: "add_point_light",
      name: "Add Point Light",
      icon: "lightbulb",
      condition: () => Format.id === "free",
      click: () => BarItems.add_point_light.click()
    }, {
      id: "add_sun_light",
      name: "Add Sun Light",
      icon: "wb_sunny",
      condition: () => Format.id === "free",
      click: () => BarItems.add_sun_light.click()
    }, {
      id: "add_area_light",
      name: "Add Area Light",
      icon: "fluorescent",
      condition: () => Format.id === "free",
      click: () => BarItems.add_area_light.click()
    })

  },
  onunload() {
    pointLightAction?.delete()
    sunLightAction?.delete()
    areaLightAction?.delete()
    ambientAction?.delete()
    BarItems.add_element.side_menu.structure.remove(BarItems.add_element.side_menu.structure.find(e => e?.id === "add_point_light"))
    BarItems.add_element.side_menu.structure.remove(BarItems.add_element.side_menu.structure.find(e => e?.id === "add_sun_light"))
    BarItems.add_element.side_menu.structure.remove(BarItems.add_element.side_menu.structure.find(e => e?.id === "add_area_light"))
    scene.remove(ambientLight)
    if (cameraListener) {
      Blockbench.removeListener("render_frame", cameraListener)
      cameraListener = null
    }
    if (changeViewModeListener) {
      Blockbench.removeListener("change_view_mode", changeViewModeListener)
      changeViewModeListener = null
    }
    delete BarItems.view_mode.options.rendered
    BarItems.view_mode.nodes.forEach(node => {
      node.querySelector('div.select_option[key="rendered"]')?.remove()
    })
    if (Project?.view_mode === "rendered") {
      BarItems.view_mode.set("textured")
      Project.view_mode = "textured"
      updateShading()
      Canvas.updateViewMode()
    }
  }
})
