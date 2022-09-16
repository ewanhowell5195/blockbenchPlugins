(async function () {
  let aboutAction, action
  const id = "slider_example"
  const name = "Slider example"
  const icon = "linear_scale"
  const author = "Ewan Howell"
  const links = {
    website: "https://www.ewanhowell.com/",
    discord: "https://discord.com/invite/pkRxtGw"
  }
  Plugin.register(id, {
    title: name,
    icon,
    author,
    description: "Slider example",
    about: "Slider example",
    tags: ["Sliders"],
    version: "1.0.0",
    min_version: "4.2.0",
    variant: "both",
    oninstall: () => showAbout(true),
    onload() {
      addAbout()
      action = new Action({
        id,
        name,
        icon,
        click() {
          const timeout = {
            example: null
          }
          const dialog = new Dialog({
            title: "Slider example",
            id: "slider_example_dialog",
            width: 780,
            lines: [`
              <style>
                dialog#slider_example_dialog .bar {
                  display: flex;
                  align-items: center;
                  margin: 0!important;
                  height: 30px;
                  box-sizing: content-box;
                  overflow: hidden;
                }
                dialog#slider_example_dialog input[type=range] {
                  flex-grow: 1;
                  margin-left: 20px;
                }
                dialog#slider_example_dialog input[type=number] {
                  margin: 0 8px 0 2px;
                }
              </style>
            `],
            component: {
              template: `
                <div>
                  <div class="bar slider_input_combo">
                    <p>A slider:</p>
                    <input id="example_slider" type="range" min="3" max="256" value="9" @input="changeSlider('example')"></input>
                    <input id="example_number" type="number" class="tool" min="3" max="256" value="9" @input="changeNumber('example', 3, 256, 9)"></input>
                  </div>
                  <br>
                  <div style="display:flex;gap:8px">
                    <p>Some text on the same row as buttons 😳</p>
                    <span style="flex-grow:1"></span>
                    <button @click="create()">I have finished with the slider 😁</button>
                    <button @click="close()">Cancel</button>
                  </div>
                </div>
              `,
              methods: {
                changeSlider(type) {
                  const slider = $(`dialog#slider_example_dialog #${type}_slider`)
                  const number = $(`dialog#slider_example_dialog #${type}_number`)
                  const num = parseInt(slider.val())
                  number.val(slider.val())
                },
                changeNumber(type, min, max, num) {
                  const slider = $(`dialog#slider_example_dialog #${type}_slider`)
                  const number = $(`dialog#slider_example_dialog #${type}_number`)
                  const clamped = Math.min(max, Math.max(min, parseInt(number.val())))
                  slider.val(number.val())
                  clearTimeout(timeout[type])
                  timeout[type] = setTimeout(() => {
                    if (isNaN(clamped)) {
                      number.val(num)
                      slider.val(num)
                    } else {
                      number.val(clamped)
                      slider.val(clamped)
                    }
                  }, 1000)
                },
                create() {
                  const num = parseInt($("dialog#slider_example_dialog #example_slider").val())
                  this.close()
                  Blockbench.showQuickMessage(`Your number was: ${num}`, 3000)
                },
                close: () => dialog.cancel()
              }
            },
            buttons: []
          }).show()
        }
      })
      MenuBar.addAction(action, "tools")
    },
    onunload() {
      aboutAction.delete()
      action.delete()
      MenuBar.removeAction(`help.about_plugins.about_${id}`)
    }
  })
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
          <p>A slider example</p>
          <p>Go to tools -> slider example</p>
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