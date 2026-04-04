(() => {
  const id = "render_mode"
  const name = "Render Mode"
  const icon = "lightbulb"

  let action, ambientAction, properties, projectProperties, styles, previewController, lightIconTexture, cameraListener, changeViewModeListener, ambientLight

  const lightTypes = {
    point: {
      name: "Point Light",
      icon: "lightbulb",
      default_name: "point_light",
      create(element) {
        const light = new THREE.PointLight(
          element.light_color,
          element.light_intensity,
          element.light_distance,
          element.light_decay
        )
        return light
      },
      update(light, element) {
        light.color.set(element.light_color)
        light.intensity = element.light_intensity
        light.distance = element.light_distance
        light.decay = element.light_decay
      },
    }
  }

  class LightElement extends OutlinerElement {
    constructor(data, uuid) {
      super(data, uuid)

      for (const key in LightElement.properties) {
        LightElement.properties[key].reset(this)
      }

      if (data) {
        this.extend(data)
      }
    }

    get origin() {
      return this.position
    }

    extend(object) {
      if (object.from) this.position.V3_set(object.from)
      for (const key in LightElement.properties) {
        LightElement.properties[key].merge(this, object)
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

    static behavior = {
      unique_name: true,
      movable: true
    }
  }

  LightElement.prototype.title = "Light"
  LightElement.prototype.type = "light"
  LightElement.prototype.icon = "lightbulb"
  LightElement.prototype.visibility = true
  LightElement.prototype.buttons = [
    Outliner.buttons.locked,
    Outliner.buttons.visibility
  ]
  LightElement.prototype.menu = new Menu([
    ...Outliner.control_menu_group,
    new MenuSeparator("manage"),
    "rename",
    "toggle_visibility",
    "delete"
  ])

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
      lightIconTexture = new THREE.CanvasTexture(canvas)
      lightIconTexture.magFilter = THREE.LinearFilter
      lightIconTexture.minFilter = THREE.LinearFilter

      properties = [
        new Property(LightElement, "string", "name", { default: "point_light" }),
        new Property(LightElement, "vector", "position"),
        new Property(LightElement, "enum", "light_type", {
          default: "point",
          values: Object.keys(lightTypes),
          inputs: {
            element_panel: {
              input: { label: "Light Type", type: "select", options: Object.fromEntries(Object.entries(lightTypes).map(([k, v]) => [k, v.name])) },
              onChange(value, nodes) {
                Canvas.updateView({ elements: LightElement.selected, element_aspects: { transform: true } })
              }
            }
          }
        }),
        new Property(LightElement, "number", "light_intensity", {
          default: 4,
          inputs: {
            element_panel: {
              input: { label: "Intensity", type: "number", min: 0, step: 0.1 },
              onChange() {
                Canvas.updateView({ elements: LightElement.selected, element_aspects: { transform: true } })
              }
            }
          }
        }),
        new Property(LightElement, "number", "light_distance", {
          default: 8,
          inputs: {
            element_panel: {
              input: { label: "Distance", description: "Maximum range of the light. 0 = unlimited.", type: "number", min: 0, step: 1 },
              onChange() {
                Canvas.updateView({ elements: LightElement.selected, element_aspects: { transform: true } })
              }
            }
          }
        }),
        new Property(LightElement, "number", "light_decay", {
          default: 2,
          inputs: {
            element_panel: {
              input: { label: "Decay", description: "The amount the light dims along the distance.", type: "number", min: 0, step: 0.1 },
              onChange() {
                Canvas.updateView({ elements: LightElement.selected, element_aspects: { transform: true } })
              }
            }
          }
        }),
        new Property(LightElement, "string", "light_color", {
          default: "#ffffff",
          inputs: {
            element_panel: {
              input: { label: "Color", type: "color" },
              onChange() {
                Canvas.updateView({ elements: LightElement.selected, element_aspects: { transform: true } })
              }
            }
          }
        }),
        new Property(LightElement, "boolean", "visibility", { default: true }),
        new Property(LightElement, "boolean", "locked")
      ]

      previewController = new NodePreviewController(LightElement, {
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

          const config = lightTypes[element.light_type] ?? lightTypes.point
          const light = config.create(element)
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

          const outerCircle = new THREE.Line(circleGeometry.clone(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }))
          mesh.add(outerCircle)

          const innerCircle = new THREE.Line(circleGeometry.clone(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }))
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

          const config = lightTypes[element.light_type] ?? lightTypes.point
          if (mesh.light) {
            config.update(mesh.light, element)
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
            mesh.outerCircle.material.color.set(color)
          }
          if (mesh.innerCircle) {
            mesh.innerCircle.visible = element.selected && (element.light_distance > 0) && (element.light_decay > 0)
            mesh.innerCircle.material.color.set(color)
          }
          this.dispatchEvent("update_selection", { element })
        },
        updateWindowSize(element) {
          const size = 0.4 * Preview.selected.camera.fov / Preview.selected.height
          element.mesh.sprite.scale.set(size, size, size)
        }
      })

      OutlinerElement.registerType(LightElement, "light")

      // Project-level ambient light properties
      projectProperties = [
        new Property(ModelProject, "number", "render_ambient_intensity", {
          default: 0.5,
          exposed: false
        }),
        new Property(ModelProject, "string", "render_ambient_color", {
          default: "#ffffff",
          exposed: false
        })
      ]

      ambientLight = new THREE.AmbientLight(0xffffff, 0.5)

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
              Undo.initEdit({ uv_mode: true })
              Project.render_ambient_intensity = form.intensity
              Project.render_ambient_color = form.color.toHexString()
              Undo.finishEdit("Change ambient light")
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

      // Cache for rendered-mode MeshStandardMaterials per texture
      const renderedMaterials = new Map()

      function getRenderedMaterial(tex) {
        if (!tex) return new THREE.MeshStandardMaterial({ color: 0x808080 })
        if (renderedMaterials.has(tex.uuid)) return renderedMaterials.get(tex.uuid)
        const mat = new THREE.MeshStandardMaterial({
          map: tex.getMaterial().map || null,
          alphaTest: 0.05,
          side: THREE.FrontSide
        })
        renderedMaterials.set(tex.uuid, mat)
        return mat
      }

      changeViewModeListener = (data) => {
        if (data.view_mode === "rendered") {
          // Remove default shader lights
          scene.remove(lights)
          scene.remove(Sun)
          if (Canvas.material_light) scene.remove(Canvas.material_light)
          // Add ambient light
          ambientLight.intensity = Project.render_ambient_intensity
          ambientLight.color.set(Project.render_ambient_color)
          scene.add(ambientLight)
          // Swap all element materials to MeshStandardMaterial
          Outliner.elements.forEach(el => {
            if (!el.mesh) return
            if (el.faces) {
              // Store original material for restoration
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
            }
          })
        } else if (data.previous_view_mode === "rendered") {
          // Remove ambient light
          scene.remove(ambientLight)
          // Restore original materials
          Outliner.elements.forEach(el => {
            if (el.mesh?._originalMaterial) {
              el.mesh.material = el.mesh._originalMaterial
              delete el.mesh._originalMaterial
            }
          })
          // Restore default lights
          updateShading()
        }
      }
      Blockbench.on("change_view_mode", changeViewModeListener)

      cameraListener = () => {
        if (!Preview.selected) return
        const quat = Preview.selected.camera.quaternion
        for (const element of LightElement.all) {
          if (element.mesh?.outerCircle) element.mesh.outerCircle.quaternion.copy(quat)
          if (element.mesh?.innerCircle) element.mesh.innerCircle.quaternion.copy(quat)
        }
      }
      Blockbench.on("update_camera_position", cameraListener)

      action = new Action("add_point_light", {
        icon: "lightbulb",
        category: "edit",
        name: "Add Point Light",
        condition: () => Modes.edit,
        click() {
          const objs = []
          Undo.initEdit({ elements: objs, outliner: true })
          const light = new LightElement({ light_type: "point" }).addTo(Group.first_selected || Outliner.selected[0]).init()
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

      styles = Blockbench.addCSS(`
        .outliner_node[node_type="light"] .outliner_icon {
          color: var(--color-light);
        }
      `)
    },
    onunload() {
      action?.delete()
      ambientAction?.delete()
      projectProperties?.forEach(p => p.delete())
      styles?.delete()
      scene.remove(ambientLight)
      if (cameraListener) {
        Blockbench.removeListener("update_camera_position", cameraListener)
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
})()
