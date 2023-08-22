(() => {
  let watch, unwatch, watching, message, styles
  const id = "live_theme_editor"
  const name = "Live Theme Editor"
  const icon = "refresh"
  Plugin.register(id, {
    title: name,
    icon,
    author: "Ewan Howell",
    description: "Edit themes live in any text editor and have them automatically update in Blockbench.",
    tags: ["Themes", "Blockbench"],
    version: "1.0.0",
    min_version: "4.8.0",
    variant: "desktop",
    onload() {
      watch = new Action("watch_theme_file", {
        name: "Watch theme file",
        icon: "visibility",
        condition: () => !watching,
        click() {
          Blockbench.import({
            extensions: ["bbtheme", "css"],
            type: "Minecraft Title Preset",
          }, files => {
            fs.watchFile(files[0].path, { interval: 100 }, update)
            watching = files[0].path
            update({ mtime: 1 }, { mtime: 0 })
          })
        }
      })
      unwatch = new Action("unwatch_theme_file", {
        name: "Stop watching theme file",
        icon: "visibility_off",
        condition: () => watching,
        click() {
          fs.unwatchFile(watching)
          styles?.delete()
          watching = false
        }
      })
      MenuBar.addAction(watch, "help.developer.1")
      MenuBar.addAction(unwatch, "help.developer.1")
    },
    onunload() {
      watch.delete()
      unwatch.delete()
      fs.unwatchFile(watching)
      message?.close()
      styles?.delete()
    }
  })

  function update(curr, prev) {
    message?.close()
    if (curr.mtimeMs === 0) {
      fs.unwatchFile(watching)
      watching = false
    } else if (curr.mtime > prev.mtime) {
      let css = fs.readFileSync(watching)
      if (watching.endsWith(".bbtheme")) {
        try {
          css = JSON.parse(css).css
        } catch {
          message = Blockbench.showMessageBox({
            title: "Invalid JSON",
            message: err.message,
            buttons: ["dialog.close"]
          })
          return 
        }
      }
      styles?.delete()
      styles = Blockbench.addCSS(css)
    }
  }
})()