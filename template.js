(() => {
  const id = "template"
  const name = "Template"
  const icon = "extension"
  Plugin.register(id, {
    title: name,
    icon,
    author: "Author Name",
    description: "placeholder",
    about: "placeholder",
    tags: ["placeholder"],
    version: "1.0.0",
    min_version: "4.5.2",
    variant: "both",
    onload() {
    },
    onunload() {
    }
  })
})()