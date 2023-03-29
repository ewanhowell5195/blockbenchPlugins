(() => {
  let panel, styles
  Plugin.register("fov_slider", {
    title: "FOV Slider",
    icon: "vrpano",
    author: "Ewan Howell",
    description: "Add an FOV slider panel to the Blockbench interface",
    tags: ["FOV", "Utility"],
    version: "1.0.0",
    min_version: "4.6.5",
    variant: "both",
    onload() {
      new Setting("hide_fov_slider", {
        value: false,
        category: "interface",
        name: "Hide FOV slider",
        description: "Hide the FOV slider panel"
      })
      styles = Blockbench.addCSS(`
        #fov_slider_container {
          padding: 10px 0 10px 20px;
        }
      `)
      panel = new Panel("fov_slider_panel", {
        name: "FOV Slider",
        condition: () => Format.id !== "image" && !settings.hide_fov_slider.value,
        default_position: {
          folded: true,
          slot: "right_bar"
        },
        component: {
          data: {
            fov: settings.fov.value
          },
          methods: {
            change: e => settings.fov.set(limitNumber(parseInt(e.target.value), 1, 120))
          },
          template: `
            <div id="fov_slider_container">
              <div class="bar slider_input_combo">
                <input type="range" class="tool disp_range" v-model.number="fov" min="1" max="120" step="1" value="{{ fov }}" @input="change">
                <input type="number" class="tool disp_text" v-model.number="fov" step="1" @input="change">
              </div>
            </div>
          `
        }
      })
    },
    onunload() {
      panel.delete()
      styles.delete()
    }
  })
})()