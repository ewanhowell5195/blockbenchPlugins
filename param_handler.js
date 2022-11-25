(() => {
  Plugin.register("param_handler", {
    title: "Param Handler",
    icon: "extension",
    version: "1.0.0",
    min_version: "4.2.0",
    variant: "web",
    onload() {
      const pluginStr = (new URL(location.href)).searchParams.get("plugins")
      if (pluginStr) {
        const plugins = pluginStr.split(",").map(e => Plugins.all.find(p => e === p.id)).filter(e => !e?.installed && e?.isInstallable())
        if (plugins.length) {
          const dialog = new Dialog({
            id: "param_handler_dialog",
            title: "Install plugins?",
            lines: [`
              <style>
                dialog#param_handler_dialog li {
                  list-style: initial;
                  margin-left: 30px;
                }
              </style>
            `],
            component: {
              data: {
                plugins
              },
              template: `
                <div>
                  <h1>Install plugins?</h1>
                  <p>You just used a link that requires the following plugin${plugins.length === 1 ? "" : "s"} to be installed:</p>
                  <ul>
                    <li v-for="plugin in plugins">{{ plugin.id }}</li>
                  </ul>
                  <p>Would you like to install these plugins?</p>
                </div>
              `
            },
            onConfirm() {
              for (const plugin of plugins) plugin.download(true)
            }
          }).show()
        }
      }
    },
    onunload() {}
  })
})()