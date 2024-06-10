(() => {
  let action, dialog, data
  const id = "colour_gradient_generator"
  Plugin.register(id, {
    title: "Colour Gradient Generator",
    icon: "icon.png",
    author: "Ewan Howell",
    description: "Generate hue shifted gradient palettes from a single colour.",
    tags: ["Paint", "Palette", "Color"],
    version: "2.0.0",
    min_version: "4.10.0",
    variant: "both",
    website: "https://ewanhowell.com/plugins/colour-gradient-generator/",
    repository: "https://github.com/ewanhowell5195/blockbenchPlugins/tree/main/colour_gradient_generator",
    bug_tracker: "https://github.com/ewanhowell5195/blockbenchPlugins/issues?title=[Colour Gradient Generator]",
    creation_date: "2022-06-02",
    has_changelog: true,
    onload() {
      const storage = JSON.parse(localStorage.getItem("colour_gradient_generator") ?? "{}")
      data = { 
        steps: storage.steps ?? 9,
        angle: storage.angle ?? 45,
        replace: storage.replace ?? false,
        smallRanges: storage.smallRanges ?? true
      }
      dialog = new Dialog({
        id,
        title: "Generate Gradient Palette",
        width: 780,
        buttons: ["Generate", "Cancel"],
        lines: [`<style>
          #colour-gradient-preview {
            display: flex;
            overflow-x: hidden;

            > div {
              background-color: red;
              flex: 1;
              height: 80px;
            }
          }

          #colour_gradient_generator {
            .sp-replacer {
              width: 100%;
              display: flex;

              .sp-preview {
                flex: 1;
              }
            }

            .checkbox-row {
              display: flex;
              cursor: pointer;

              div {
                margin: 3px 0 0 5px;
              }

              * {
                cursor: pointer;
              }
            }
          }
        </style>`],
        component: {
          data: {
            data,
            colour: ColorPanel.get()
          },
          methods: {
            save() {
              localStorage.setItem("colour_gradient_generator", JSON.stringify(this.data))
            },
            clamp() {
              this.data.steps = Math.min(32, this.data.steps)
              this.data.angle = Math.max(-120, Math.min(120, this.data.angle))
            }
          },
          computed: {
            palette() {
              const colour = tinycolor(this.colour)
              const hsl = colour.toHsl()
              let angle = this.data.angle

              if (hsl.h >= 100 && hsl.h < 260) angle *= -1

              const darker = Math.floor(this.data.steps * hsl.l)
              const lighter = this.data.steps - darker - 1

              const colours = []

              for (let x = darker - 1; x >= 0; x--) {
                const col = colour.toHsl()
                col.l = Math.lerp(hsl.l, 0, (x + 1) / (darker + 1))
                col.h = toPositiveAngle(col.h + Math.lerp(0, -angle / 2, (x + 1) / (darker + 1)))
                colours.push(tinycolor(col).toHexString())
              }

              colours.push(tinycolor(colour).toHexString())

              for (let x = lighter - 1; x >= 0; x--) {
                const col = colour.toHsl()
                col.l = Math.lerp(1, hsl.l, (x + 1) / (lighter + 1))
                col.h = toPositiveAngle(col.h + Math.lerp(angle / 2, 0, (x + 1) / (lighter + 1)))
                colours.push(tinycolor(col).toHexString())
              }

              this.save()

              return colours
            }
          },
          mounted() {
            $(this.$refs.colour).spectrum({
              preferredFormat: "hex",
              color: dialog.component.data.colour,
              showAlpha: false,
              showInput: true,
              move: c => dialog.content_vue.colour = c.toHexString(),
              change: c => dialog.content_vue.colour = c.toHexString(),
              hide: c => dialog.content_vue.colour = c.toHexString()
            })
          },
          template: `
            <div>
              <h2>Colour</h2>
              <input ref="colour" />
              <br>
              <h2>Colour Count</h2>
              <p>The number of colours to include in the gradient</p>
              <div class="bar slider_input_combo">
                <input type="range" class="tool disp_range" v-model.number="data.steps" min="3" :max="data.smallRanges ? 32 : 256" step="1" />
                <numeric-input class="tool disp_text" v-model.number="data.steps" :min="3" :max="data.smallRanges ? 32 : 256" :step="1" />
              </div>
              <br>
              <h2>Hue Shifting Angle</h2>
              <p>The amount of degrees over which the hue shifting occurs</p>
              <div class="bar slider_input_combo">
                <input type="range" class="tool disp_range" v-model.number="data.angle" :min="data.smallRanges ? -120 : -360" :max="data.smallRanges ? 120 : 360" step="1" />
                <numeric-input class="tool disp_text" v-model.number="data.angle" :min="data.smallRanges ? -120 : -360" :max="data.smallRanges ? 120 : 360" :step="1" />
              </div>
              <br>
              <div id="colour-gradient-preview">
                <div v-for="col in palette" :style="{ backgroundColor: col }"></div>
              </div>
              <br>
              <label class="checkbox-row">
                <input type="checkbox" :checked="data.smallRanges" v-model="data.smallRanges" @input="clamp(); save()">
                <div>Use smaller ranges</div>
              </label>
              <label class="checkbox-row">
                <input type="checkbox" :checked="data.replace" v-model="data.replace" @input="save">
                <div>Replace existing palette</div>
              </label>
            </div>
          `
        },
        onOpen() {
          this.content_vue.colour = ColorPanel.get()
          $(this.content_vue.$refs.colour).spectrum("set", this.content_vue.colour)
        },
        onConfirm() {
          if (data.replace) ColorPanel.palette.length = 0
          for (const colour of this.content_vue.palette) {
            if (ColorPanel.palette.includes(colour)) ColorPanel.palette.splice(ColorPanel.palette.indexOf(colour), 1)
            ColorPanel.palette.push(colour)
          }
        }
      })
      action = new Action(id, {
        name: "Generate Gradient Palette",
        icon: "gradient",
        click: () => dialog.show()
      })
      Toolbars.palette.add(action)
      dialog.show()
    },
    onuninstall() {
      localStorage.removeItem("colour_gradient_steps")
      localStorage.removeItem("colour_gradient_angle")
    },
    onunload() {
      dialog.close()
      action.delete()
    }
  })

  function toPositiveAngle(angle) {
    angle = ((angle % 360) + 360) % 360
    if (angle < 0) angle += 360
    return angle
  }
})()