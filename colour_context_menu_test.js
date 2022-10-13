(async function () {
  let defaultColourFunction
  const E = s => $(document.createElement(s))
  Plugin.register("colour_context_menu_test", {
    title: "Colour menu test",
    version: "1.0.0",
    min_version: "4.2.0",
    variant: "both",
    onload() {
      defaultColourFunction = Cube.prototype.menu.structure.find(e => e.name === "menu.cube.color").children
      Cube.prototype.menu.structure.find(e => e.name === "menu.cube.color").children = () => {
        return [{
          icon: "fa-cube",
          name: "This is a button",
          color: "#000000",
          type: "button",
          click() {
            new Blockbench.Dialog({
              id: "test-dialog",
              title: "This is a dialog!",
              lines: [`
                <style>
                dialog#test-dialog #marker-colors {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                  }
                  dialog#test-dialog .marker-color {
                    display: flex;
                    gap: 10px;
                  }
                  dialog#test-dialog .marker-color-display {
                    width: 24px;
                    height: 24px;
                  }
                </style>
                <div id="marker-colors"></div>
              `]
            }).show()
            const container = $("dialog#test-dialog #marker-colors")
            for (const color of markerColors) {
              const name = tl(`cube.color.${color.id}`)
              container.append(
                E("div").addClass("marker-color").append(
                  E("div").addClass("marker-color-display").css("background-color", color.standard),
                  E("div").addClass("marker-color-name").text(name),
                  E("div").addClass("marker-color-remove").text("X").on("click", e => {
                    console.log(`Remove the marker with the colour ${name}`)
                  })
                )
              )
            }
          }
        }].concat(defaultColourFunction())
      }
    },
    onunload() {
      Cube.prototype.menu.structure.find(e => e.name === "menu.cube.color").children = defaultColourFunction
    }
  })
})()