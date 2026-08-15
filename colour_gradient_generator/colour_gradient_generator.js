let action, dialog, data
const id = "colour_gradient_generator"
const defaults = {
  steps: 9,
  angle: 45,
  replace: false,
  smallRanges: true,
  brightnessRange: 90,
  brightnessOffset: 0,
  curve: 33,
  saturation: 33,
  previewMode: "simple"
}
Plugin.register(id, {
  title: "Colour Gradient Generator",
  icon: "icon.png",
  author: "Ewan Howell",
  description: "Generate hue shifted gradient palettes from a single colour.",
  tags: ["Paint", "Palette", "Color"],
  version: "3.0.0",
  min_version: "5.0.0",
  variant: "both",
  website: "https://ewanhowell.com/plugins/colour-gradient-generator/",
  repository: "https://github.com/ewanhowell5195/blockbenchPlugins/tree/main/colour_gradient_generator",
  bug_tracker: "https://github.com/ewanhowell5195/blockbenchPlugins/issues?title=[Colour Gradient Generator]",
  creation_date: "2022-06-02",
  has_changelog: true,
  onload() {
    const storage = JSON.parse(localStorage.getItem(id) ?? "{}")
    data = {
      steps: storage.steps ?? defaults.steps,
      angle: storage.angle ?? defaults.angle,
      replace: storage.replace ?? defaults.replace,
      smallRanges: storage.smallRanges ?? defaults.smallRanges,
      brightnessRange: storage.brightnessRange ?? defaults.brightnessRange,
      brightnessOffset: storage.brightnessOffset ?? defaults.brightnessOffset,
      curve: storage.curve ?? defaults.curve,
      saturation: storage.saturation ?? defaults.saturation,
      previewMode: storage.previewMode ?? defaults.previewMode
    }
    dialog = new Dialog({
      id,
      title: "Generate Gradient Palette",
      width: 780,
      buttons: ["Generate", "Cancel"],
      lines: [`<style>
        #colour-gradient-preview {
          filter: drop-shadow(0 3px 10px #0006);

          canvas {
            width: 100%;
            height: 200px;
            display: block;
          }

          .strip {
            display: flex;
            overflow-x: hidden;

            > div {
              background-color: red;
              flex: 1;
              height: 80px;
              position: relative;

              &.primary::before {
                content: "";
                position: absolute;
                bottom: 0;
                height: 4px;
                left: 0;
                right: 0;
                background-color: var(--color-accent);
              }

              &.primary.light-marker::before {
                background-color: #fff;
              }
            }
          }
        }

        #colour_gradient_generator {
          .header-bar {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;

            > i {
              cursor: pointer;

              &:hover {
                color: var(--color-light);
              }
            }
          }

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

          .seg {
            display: inline-flex;
            margin-bottom: 8px;

            button {
              padding: 2px 16px;
              min-width: 0;
              background-color: var(--color-button);
              color: var(--color-text);
              cursor: pointer;
              border: none;

              &:hover {
                background-color: var(--color-selected);
              }

              &.active {
                background-color: var(--color-accent);
                color: var(--color-accent_text);
              }
            }
          }

          .disabled {
            opacity: .5;
            position: relative;
            cursor: not-allowed;

            > * {
              pointer-events: none;
            }
          }
        }
      </style>`],
      component: {
        data: {
          data,
          defaults,
          colour: ColorPanel.get(),
          minBrightnessOffset: Math.min(0, data.brightnessOffset),
          maxBrightnessOffset: Math.max(0, data.brightnessOffset),
          accent: "#3e90ff"
        },
        methods: {
          save() {
            localStorage.setItem(id, JSON.stringify(this.data))
          },
          clamp() {
            this.data.steps = Math.min(this.data.smallRanges ? 32 : 256, this.data.steps)
            const maxAngle = this.data.smallRanges ? 120 : 360
            this.data.angle = Math.max(-maxAngle, Math.min(maxAngle, this.data.angle))
          },
          reset() {
            this.data.steps = defaults.steps
            this.data.angle = defaults.angle
            this.data.replace = defaults.replace
            this.data.smallRanges = defaults.smallRanges
            this.data.brightnessRange = defaults.brightnessRange
            this.data.brightnessOffset = defaults.brightnessOffset
            this.data.curve = defaults.curve
            this.data.saturation = defaults.saturation
          },
          setPreviewMode(mode) {
            this.data.previewMode = mode
            this.save()
          },
          drawGraph() {
            const cv = this.$refs.graph
            if (!cv || this.data.previewMode !== "advanced") return
            const { points: pts, primaryHex } = this.result
            const W = cv.clientWidth || 700, H = 200, dpr = window.devicePixelRatio || 1
            cv.width = W * dpr
            cv.height = H * dpr
            const ctx = cv.getContext("2d")
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.clearRect(0, 0, W, H)
            const pad = 7
            const Y = s => pad + (1 - s) * (H - 2 * pad)

            const N = pts.length
            const lo = Math.min(...pts.map(p => p.l)), hi = Math.max(...pts.map(p => p.l))
            const flat = hi - lo < 1e-6
            const lerpHue = (a, b, t) => a + (((b - a + 540) % 360) - 180) * t

            let xs, hueAtFrac, lightAtFrac
            if (flat) {
              const baseL = pts[0].l
              xs = pts.map((p, i) => pad + (N > 1 ? i / (N - 1) : 0.5) * (W - 2 * pad))
              hueAtFrac = f => {
                const idx = f * (N - 1), i0 = Math.max(0, Math.min(N - 1, Math.floor(idx)))
                return lerpHue(pts[i0].h, pts[Math.min(N - 1, i0 + 1)].h, idx - i0)
              }
              lightAtFrac = () => baseL
            } else {
              const axisSpan = Math.min(1, 2 * (hi - lo))
              let aMin = (lo + hi) / 2 - axisSpan / 2, aMax = aMin + axisSpan
              if (aMin < 0) { aMax -= aMin; aMin = 0 }
              if (aMax > 1) { aMin -= aMax - 1; aMax = 1 }
              aMin = Math.max(0, aMin)
              aMax = Math.min(1, aMax)
              const lRange = aMax - aMin || 1
              xs = pts.map(p => pad + ((p.l - aMin) / lRange) * (W - 2 * pad))
              const hueAtL = L => {
                if (L <= pts[0].l) return pts[0].h
                if (L >= pts[N - 1].l) return pts[N - 1].h
                for (let i = 1; i < N; i++) {
                  if (L <= pts[i].l) {
                    const a = pts[i - 1], b = pts[i]
                    return lerpHue(a.h, b.h, (L - a.l) / ((b.l - a.l) || 1))
                  }
                }
                return pts[N - 1].h
              }
              hueAtFrac = f => hueAtL(aMin + f * lRange)
              lightAtFrac = f => aMin + f * lRange
            }

            const cell = 4
            for (let px = 0; px < W; px += cell) {
              const f = px / W, hue = hueAtFrac(f), L = lightAtFrac(f)
              for (let py = 0; py < H; py += cell) {
                ctx.fillStyle = `hsl(${hue} ${(1 - py / H) * 100}% ${L * 100}%)`
                ctx.fillRect(px, py, cell + 1, cell + 1)
              }
            }

            ctx.beginPath()
            pts.forEach((p, i) => {
              const x = xs[i], y = Y(p.s)
              i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
            })
            ctx.lineWidth = 2
            ctx.strokeStyle = "#111"
            ctx.stroke()
            pts.forEach((p, i) => {
              const x = xs[i], y = Y(p.s), r = p.hex === primaryHex ? 5 : 3.5
              ctx.beginPath()
              ctx.arc(x, y, r + 1.5, 0, 7)
              ctx.fillStyle = "#fff"
              ctx.fill()
              ctx.beginPath()
              ctx.arc(x, y, r, 0, 7)
              ctx.fillStyle = p.hex
              ctx.fill()
              ctx.lineWidth = 1
              ctx.strokeStyle = "rgba(0,0,0,.4)"
              ctx.stroke()
            })
          }
        },
        computed: {
          result() {
            const hsl = hexToHsl(tinycolor(this.colour).toHexString())
            let angle = this.data.angle
            if (hsl.h >= 100 && hsl.h < 260) angle *= -1

            const N = this.data.steps
            const br = this.data.brightnessRange / 100
            const minL0 = Math.max(0, hsl.l - br * hsl.l)
            const maxL0 = Math.min(1, hsl.l + br * (1 - hsl.l))
            const range = maxL0 - minL0

            const pos = range > 0 ? (hsl.l - minL0) / range : 0.5
            let warpedPos = pos
            if (range > 0 && this.data.curve !== 0) {
              const k = Math.pow(4, Math.abs(this.data.curve) / 100)
              warpedPos = this.data.curve > 0 ? Math.pow(pos, k) : 1 - Math.pow(1 - pos, k)
            }
            const uNat = warpedPos
            let gamma = 1, mirror = false
            if (range > 0 && pos > 1e-4 && pos < 1 - 1e-4 && uNat > 1e-4 && uNat < 1 - 1e-4) {
              mirror = pos > uNat
              gamma = mirror ? Math.log(1 - pos) / Math.log(1 - uNat) : Math.log(pos) / Math.log(uNat)
            }
            const shape = u => mirror ? 1 - Math.pow(1 - u, gamma) : Math.pow(u, gamma)

            const darker0 = range > 0 ? Math.max(0, Math.min(N - 1, Math.round(uNat * (N - 1)))) : Math.floor(N / 2)
            this.minBrightnessOffset = darker0 - (N - 1)
            this.maxBrightnessOffset = darker0
            this.data.brightnessOffset = Math.max(this.minBrightnessOffset, Math.min(this.maxBrightnessOffset, this.data.brightnessOffset))
            const iBase = Math.max(0, Math.min(N - 1, darker0 - this.data.brightnessOffset))
            const darker = iBase, lighter = N - 1 - iBase

            const du = Math.min(
              iBase > 0 ? uNat / iBase : Infinity,
              iBase < N - 1 ? (1 - uNat) / (N - 1 - iBase) : Infinity
            )
            const uAt = k => Math.min(1, Math.max(0, uNat + (k - iBase) * du))
            const minLightness = range > 0 ? minL0 + range * shape(uAt(0)) : hsl.l
            const maxLightness = range > 0 ? minL0 + range * shape(uAt(N - 1)) : hsl.l
            const lightnessAt = k => (range <= 0 || k === iBase) ? hsl.l : minL0 + range * shape(uAt(k))

            const position = (iBase + 1) / (N + 1)
            const hueAt = i => {
              if (i === iBase) return hsl.h
              const shift = i < iBase
                ? -angle * position * ((iBase - i) / iBase)
                : angle * (1 - position) * ((i - iBase) / (N - 1 - iBase))
              return toPositiveAngle(hsl.h + shift)
            }

            const sat = this.data.saturation / 100
            const satSpan = Math.max(darker, lighter)
            const satRef = darker >= lighter ? hsl.l - minLightness : maxLightness - hsl.l
            const satAt = (steps, l) => {
              const d = satRef > 0
                ? Math.min(1, Math.abs(l - hsl.l) / satRef)
                : (satSpan > 0 ? steps / satSpan : 0)
              return hsl.s * (1 - sat * Math.pow(d, 1.6))
            }

            const raw = []
            const points = []
            for (let i = 0; i < N; i++) {
              const l = lightnessAt(i)
              const h = hueAt(i), s = satAt(Math.abs(i - iBase), l)
              const hex = hslToHex(h, s, l)
              raw.push(hex)
              points.push({ hex, h, l, s })
            }

            this.save()

            return {
              colours: [...new Set(raw)],
              primaryHex: hslToHex(hsl.h, hsl.s, hsl.l),
              points
            }
          },
          markerLight() {
            return colourDist(this.result.primaryHex, this.accent) < 150
          }
        },
        watch: {
          result() {
            this.$nextTick(() => this.drawGraph())
          },
          "data.previewMode"() {
            this.$nextTick(() => this.drawGraph())
          }
        },
        mounted() {
          const accent = getComputedStyle(document.body).getPropertyValue("--color-accent")
          if (accent) this.accent = tinycolor(accent.trim()).toHexString()
          $(this.$refs.colour).spectrum({
            preferredFormat: "hex",
            color: dialog.component.data.colour,
            showAlpha: false,
            showInput: true,
            move: c => dialog.content_vue.colour = c.toHexString(),
            change: c => dialog.content_vue.colour = c.toHexString(),
            hide: c => dialog.content_vue.colour = c.toHexString()
          })
          this.$nextTick(() => this.drawGraph())
        },
        template: `
          <div>
            <div title="Reset values back to their defaults" class="dialog_close_button" style="right: 33px; z-index: 3; border-radius: 6px;" @click="reset"><i class="material-icons">replay</i></div>
            <h2>Colour</h2>
            <input ref="colour" />
            <br>
            <div class="header-bar">
              <h2>Colour Count</h2>
              <i title="Reset" class="material-icons" @click="data.steps = defaults.steps">replay</i>
            </div>
            <p>The number of colours to include in the gradient</p>
            <div class="bar slider_input_combo">
              <input type="range" class="tool disp_range" v-model.number="data.steps" min="3" :max="data.smallRanges ? 32 : 256" step="1" />
              <numeric-input class="tool disp_text" v-model.number="data.steps" :min="3" :max="data.smallRanges ? 32 : 256" :step="1" />
            </div>
            <br>
            <div class="header-bar">
              <h2>Hue Shifting Angle</h2>
              <i title="Reset" class="material-icons" @click="data.angle = defaults.angle">replay</i>
            </div>
            <p>The amount of degrees over which the hue shifting occurs</p>
            <div class="bar slider_input_combo">
              <input type="range" class="tool disp_range" v-model.number="data.angle" :min="data.smallRanges ? -120 : -360" :max="data.smallRanges ? 120 : 360" step="1" />
              <numeric-input class="tool disp_text" v-model.number="data.angle" :min="data.smallRanges ? -120 : -360" :max="data.smallRanges ? 120 : 360" :step="1" />
            </div>
            <br>
            <div class="header-bar">
              <h2>Brightness Range</h2>
              <i title="Reset" class="material-icons" @click="data.brightnessRange = defaults.brightnessRange">replay</i>
            </div>
            <p>The range of the brightness included in the gradient</p>
            <div class="bar slider_input_combo">
              <input type="range" class="tool disp_range" v-model.number="data.brightnessRange" min="0" max="100" step="1" />
              <numeric-input class="tool disp_text" v-model.number="data.brightnessRange" :min="0" :max="100" :step="1" />
            </div>
            <br>
            <div :class="{ disabled: data.brightnessRange <= 0 }">
              <div class="header-bar">
                <h2>Curve</h2>
                <i title="Reset" class="material-icons" @click="data.curve = defaults.curve">replay</i>
              </div>
              <p>Bias the gradient towards lighter or darker tones</p>
              <div class="bar slider_input_combo">
                <input type="range" class="tool disp_range" v-model.number="data.curve" min="-100" max="100" step="1" />
                <numeric-input class="tool disp_text" v-model.number="data.curve" :min="-100" :max="100" :step="1" />
              </div>
            </div>
            <br>
            <div class="header-bar">
              <h2>Saturation Falloff</h2>
              <i title="Reset" class="material-icons" @click="data.saturation = defaults.saturation">replay</i>
            </div>
            <p>Reduce saturation toward the lightest and darkest colours</p>
            <div class="bar slider_input_combo">
              <input type="range" class="tool disp_range" v-model.number="data.saturation" min="0" max="100" step="1" />
              <numeric-input class="tool disp_text" v-model.number="data.saturation" :min="0" :max="100" :step="1" />
            </div>
            <br>
            <div :class="{ disabled: !minBrightnessOffset && !maxBrightnessOffset }">
              <div class="header-bar">
                <h2>Colour Offset</h2>
                <i title="Reset" class="material-icons" @click="data.brightnessOffset = defaults.brightnessOffset">replay</i>
              </div>
              <p>Adjust the position of the selected colour within the gradient spectrum</p>
              <div class="bar slider_input_combo">
                <input type="range" class="tool disp_range" v-model.number="data.brightnessOffset" :min="minBrightnessOffset" :max="maxBrightnessOffset" step="1" />
                <numeric-input class="tool disp_text" v-model.number="data.brightnessOffset" :min="minBrightnessOffset" :max="maxBrightnessOffset" :step="1" />
              </div>
            </div>
            <br>
            <div class="seg">
              <button :class="{ active: data.previewMode === 'simple' }" @click="setPreviewMode('simple')">Simple</button>
              <button :class="{ active: data.previewMode === 'advanced' }" @click="setPreviewMode('advanced')">Advanced</button>
            </div>
            <div id="colour-gradient-preview">
              <canvas ref="graph" v-show="data.previewMode === 'advanced'"></canvas>
              <div class="strip">
                <div v-for="col in result.colours" :class="{ primary: col === result.primaryHex, 'light-marker': col === result.primaryHex && markerLight }" :style="{ backgroundColor: col }"></div>
              </div>
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
        for (const colour of this.content_vue.result.colours) {
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

function rgbOf(hex) {
  const h = hex.replace("#", "")
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function colourDist(a, b) {
  const [r1, g1, b1] = rgbOf(a), [r2, g2, b2] = rgbOf(b)
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2)
}

function hexToHsl(hex) {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let hue = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
    hue *= 60
  }
  return { h: hue, s, l }
}

function hslToHex(h, s, l) {
  h = (h % 360) / 360
  let r, g, b
  if (s === 0) { r = g = b = l }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const ch = n => Math.round(n * 255).toString(16).padStart(2, "0")
  return ("#" + ch(r) + ch(g) + ch(b)).toLowerCase()
}
