(async function () {
  let defaultColourFunction
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
          click() {
            new Blockbench.Dialog({
              id: "test-dialog",
              title: "This is a dialog!",
              lines: [`
                <h1>This is a dialog!</h1>
              `]
            }).show()
          }
        }].concat(defaultColourFunction())
      }
    },
    onunload() {
      Cube.prototype.menu.structure.find(e => e.name === "menu.cube.color").children = defaultColourFunction
    }
  })
})()