(async function () {
  let aboutAction, oldDialog
  const id = "plugin_loader_2.0"
  const name = "Plugin Loader 2.0"
  const icon = "extension"
  const author = "Ewan Howell"
  const links = {
    website: "https://google.com/",
    discord: "https://discord.com/"
  }
  Plugin.register(id, {
    title: name,
    icon,
    author,
    description: "placeholder",
    about: "placeholder",
    tags: ["Plugins", "Blockbench"],
    version: "1.0.0",
    min_version: "4.2.0",
    variant: "both",
    oninstall: () => showAbout(true),
    onload() {
      addAbout()
      oldDialog = Plugins.dialog
      Plugins.dialog = new Dialog({
        id: "plugins",
        title: "dialog.plugins.title",
        buttons: [],
        width: 980,
        lines: [`
          <style>
            dialog#plugins #plugins_header_bar {
              display: none;
            }
            dialog#plugins .dialog_content {
              margin: 0;
              min-height: 128px;
            }
            dialog#plugins #plugin-sidebar {
              display: flex!important;
              flex: initial;
              overflow-y: auto;
              min-width: 230px;
            }
            dialog#plugins #plugin-sidebar-tabs {
              overflow-y: auto;
            }
            dialog#plugins #plugin-sidebar-tabs::-webkit-scrollbar-track {
              background-color: var(--color-back);
            }
            dialog#plugins #plugin-sidebar-tabs > li {
              display: none;
            }
            dialog#plugins #plugin-sidebar-tabs > li.visible {
              display: list-item;
            }
            dialog#plugins #plugin-container {
              display: flex;
              height: 512px;
              min-height: 128px;
              position: relative;
            }
            dialog#plugins #plugin-content {
              flex: 1;
              overflow-y: auto;
              display: flex;
              flex-direction: column;
            }
            dialog#plugins #plugin_search_bar {
              cursor: pointer;
            }
            dialog#plugins .bar {
              height: 40px;
              padding: 10px 10px 0;
            }
            dialog#plugins #button-row {
              display: flex;
              padding: 10px 10px 10px 20px;
              gap: 10px;
              align-items: center;
            }
            dialog#plugins #button-row > i {
              font-size: 1.5rem;
              display: flex;
              cursor: pointer;
            }
            dialog#plugins #button-row > i:hover {
              color: var(--color-light);
            }
            dialog#plugins #plugin-list {
              flex: 1;
              overflow-y: auto;
              margin: 10px 10px 0;
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            dialog#plugins .plugin {
              background-color: var(--color-back);
              padding: 10px;
            }
            dialog#plugins .plugin-name-container {
              display: flex;
              gap: 10px;
              align-items: center;
              font-size: 1.34rem;
            }
            dialog#plugins .plugin_icon {
              display: flex;
            }
            dialog#plugins .plugin-version, dialog#plugins .plugin-author {
              color: var(--color-subtle_text);
              font-size: 0.9rem;
            }
            dialog#plugins .plugin-description {
              padding-top: 5px;
            }
            dialog#plugins .plugin-list-tags {
              padding-top: 7px;
            }
            dialog#plugins .plugin-header {
              display: flex;
            }
            dialog#plugins .plugin-header-left {
              flex: 1;
            }
            dialog#plugins button {
              text-decoration: none;
            }
            dialog#plugins button:focus > span {
              text-decoration: underline;
            }
            dialog#plugins .plugin-button {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            dialog#plugins .plugin-details {
              background-color: var(--color-ui);
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              display: none;
              flex-direction: column
            }
            dialog#plugins .plugin-details.visible {
              display: flex;
            }
            dialog#plugins .plugin-details-close {
              position: absolute;
              top: 0;
              right: 10px;
              cursor: pointer;
              font-size: 1.5rem;
              padding: 5px 10px;
              display: flex;
              align-items: center;
            }
            dialog#plugins .plugin-details-close:hover {
              color: var(--color-light);
            }
            dialog#plugins .plugin-title-container {
              background-color: var(--color-back);
              height: 128px;
              display: flex;
              padding: 10px 20px 0;
            }
            dialog#plugins .plugin-title-container > div {
              display: flex;
              justify-content: end;
              flex-direction: column;
            }
            dialog#plugins .plugin-title-left {
              flex: 1;
            }
            dialog#plugins .plugin-title {
              font-size: 3rem;
            }
            dialog#plugins .plugin-title-version {
              padding-bottom: 5px;
              color: var(--color-subtle_text);
            }
            dialog#plugins .plugin-title-author {
              color: var(--color-subtle_text);
            }
            dialog#plugins .spacer {
              flex: 1;
            }
            dialog#plugins .plugin-button-bar {
              padding: 10px 20px;
              display: flex;
              gap: 10px;
            }
            dialog#plugins .plugin-button-bar > button {
              display: flex;
              min-width: 128px;
              align-items: center;
              padding: 0 10px;
              gap: 10px;
              justify-content: center;
            }
            dialog#plugins .plugin-button-bar > button[disabled] {
              background-color: var(--color-back);
              cursor: initial;
              color: var(--color-subtle_text)!important;
            }
            dialog#plugins .plugin-button-bar > a {
              text-decoration: none;
            }
            dialog#plugins .plugin-button-bar > a > i {
              font-size: 1.5rem;
            }
            dialog#plugins .plugin-details-description {
              margin: 0 20px;
            }
            dialog#plugins .plugin-details-about {
              margin: 10px 20px 20px;
              padding: 10px;
              background-color: var(--color-back);
              overflow-y: auto;
            }
            dialog#plugins .plugin-details-about::-webkit-scrollbar-track {
              background-color: var(--color-back);
            }
            dialog#plugins .plugin-details-about code {
              padding: 0 2px;
              background-color: var(--color-dark)
            }
            dialog#plugins .plugin-details-about-filler {
              display: flex;
              justify-content: center;
              flex: 1;
              align-items: center;
            }
            dialog#plugins .plugin-details-about-filler > i {
              opacity: 0.5;
              font-size: 15rem;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            dialog#plugins .plugin-tags {
              display: flex;
              align-items: center;
              gap: 5px;
            }
            dialog#plugins .plugin-tags > li {
              margin: 0;
            }
            dialog#plugins .plugin-tag-no-tags {
              background-color: var(--color-subtle_text)
            }
            dialog#plugins .plugin-tag-format {
              background-color: var(--color-stream)
            }
            dialog#plugins #plugin-sidebar-footer {
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 10px;
              border-top: 2px solid var(--color-dark);
              min-height: 52px;
            }
            dialog#plugins #plugin-sidebar-footer > a {
              display: flex;
              gap: 10px;
              justify-content: center;
              align-items: center;
              text-decoration: none;
            }
            dialog#plugins #plugin-sidebar-footer > a > i {
              font-size: 1.25rem;
            }
            dialog#plugins #plugin-sidebar-footer > a > span {
              text-decoration: underline;
            }
          </style>
        `],
        component: {
          data: {
            tab: "installed",
            search_term: "",
            items: Plugins.all,
            currentTag: "All",
            detailsVisible: null
          },
          computed: {
            tags() {
              const tags = Array.from(this.items.reduce((a, e) => {
                e.tags.forEach(e => a.add(e))
                return a
              }, new Set(["All", "No Tags"])))
              const tagCount = new Map(tags.map(t => [t, t === "All" ? Infinity : t === "No Tags" ? Plugins.all.filter(p => !p.tags?.length).length : t === "Deprecated" ? -Infinity : Plugins.all.filter(p => p.tags.includes(t)).length]))
              return tags.sort((a, b) => tagCount.get(b) - tagCount.get(a) + a.localeCompare(b) * 0.1)
            },
            plugin_search() {
              const name = this.search_term.toUpperCase()
              const tag = this.currentTag
              return this.items.filter(item => {
                if (tag === "No Tags" && !item.tags?.length && (this.tab == "installed") == item.installed) return true
                if (tag !== "All" && !item.tags.includes(tag)) return
                if ((this.tab == "installed") == item.installed) {
                  if (name.length > 0) {
                    return (
                      item.id.toUpperCase().includes(name) ||
                      item.title.toUpperCase().includes(name) ||
                      item.description.toUpperCase().includes(name) ||
                      item.author.toUpperCase().includes(name) ||
                      item.tags.find(tag => tag.toUpperCase().includes(name))
                    )
                  }
                  return true;
                }
              })
            },
            visibleTags() {
              return this.tags.filter(tag => tag === "All" || this.items.filter(item => ((item.tags.includes(tag) || (tag === "No Tags" && !item.tags?.length)) && (this.tab === "installed") === item.installed)).length)
            }
          },
          methods: {
            getTagClass(tag) {
              if (tag.match(/^(local|remote)$/i)) return "plugin_tag_source"
              if (tag.match(/^minecraft/i)) return "plugin_tag_mc"
                if (tag.match(/^format/i)) return "plugin-tag-format"
              if (tag.match(/^deprecated/i)) return "plugin_tag_deprecated"
            },
            getIconNode: Blockbench.getIconNode,
            tl,
            switchTab(tab) {
              this.tab = tab
              if (!this.visibleTags.includes(this.currentTag)) this.currentTag = "All"
            }
          },
          template: `
            <div id="plugin-container">
              <div id="plugin-sidebar" class="dialog_sidebar">
                <ul id="plugin-sidebar-tabs" class="dialog_sidebar_pages">
                  <li v-for="tag in tags" @click="currentTag = tag" :class="{selected: currentTag === tag, visible: visibleTags.includes(tag)}">{{ tag }}</li>
                </ul>
                <div class="spacer"></div>
                <div id="plugin-sidebar-footer">
                  <a href="https://github.com/JannisX11/blockbench-plugins/">
                    <i class="icon fab fa-github"></i>
                    <span class="tl">Submit your own</span>
                  </a>
                </div>
              </div>
              <div id="plugin-content">
                <div class="bar">
                  <div class="tab_bar">
                    <div :class="{open: tab === 'installed'}" @click="switchTab('installed')">${tl('dialog.plugins.installed')}</div>
                    <div :class="{open: tab === 'available'}" @click="switchTab('available')">${tl('dialog.plugins.available')}</div>
                  </div>
                  <search-bar id="plugin_search_bar" v-model="search_term"></search-bar>
                </div>
                <ul id="plugin-list">
                  <li v-for="plugin in plugin_search" v-bind:plugin="plugin.id" v-bind:class="{plugin: true, testing: plugin.fromFile}">
                    <div class="plugin-header">
                      <div class="plugin-header-left">
                        <div class="plugin-name-container">
                          <span class="icon_wrapper plugin_icon normal" v-html="getIconNode(plugin.icon || 'error_outline', plugin.icon ? plugin.color : 'var(--color-close)').outerHTML"></span>
                          {{ plugin.title }}
                          <span class="plugin-version">v{{ plugin.version }}</span>
                        </div>
                        <div class="plugin-author">By {{ plugin.author }}</div>
                      </div>
                      <div class="plugin-header-right">
                        <button class="plugin-button" @click="detailsVisible = plugin.id">
                          <span>Details</span>
                          <i class="material-icons">arrow_forward</i>
                        </button>
                      </div>
                    </div>
                    <div class="plugin-description">{{ plugin.description }}</div>
                    <ul v-if="plugin.tags?.length" class="plugin_tag_list plugin-tags plugin-list-tags">
                      <li v-for="tag in plugin.tags" :class="getTagClass(tag)" :key="tag" @click="currentTag = tag; detailsVisible = null">{{tag}}</li>
                    </ul>
                    <ul v-else class="plugin_tag_list plugin-tags plugin-list-tags">
                      <li class="plugin-tag-no-tags" @click="currentTag = 'No Tags'; detailsVisible = null">No Tags</li>
                    </ul>
                  </li>
                  <div class="no_plugin_message tl" v-if="plugin_search.length < 1 && tab === 'installed'">${tl('dialog.plugins.none_installed')}</div>
                  <div class="no_plugin_message tl" v-if="plugin_search.length < 1 && tab === 'available'" id="plugin_available_empty">{{ tl(navigator.onLine ? 'dialog.plugins.none_available' : 'dialog.plugins.offline') }}</div>
                </ul>
                <div id="button-row">
                  <i class="fa_big icon fa fa-file-code" title="Load a plugin by importing the source file" @click="BarItems.load_plugin.click()"></i>
                  <i class="material-icons" title="Load a plugin from a server by specifying the URL" @click="BarItems.load_plugin_from_url.click()">cloud_download</i>
                  <div class="spacer"></div>
                  <button id="close" @click="Plugins.dialog2.close()">Close</button>
                </div>
                <div v-for="plugin in items" v-bind:plugin="plugin.id + '_details'" class="plugin-details" :class="{visible: detailsVisible === plugin.id}">
                  <div class="plugin-details-close" @click="detailsVisible = null">
                    <i class="material-icons">chevron_left</i>
                    Back
                  </div>
                  <div class="plugin-title-container">
                    <div class="plugin-title-left">
                      <div class="plugin-title-author">By {{ plugin.author }}</div>
                      <div class="spacer"></div>
                      <div class="plugin-title">{{ plugin.title }}</div>
                    </div>
                    <div class="plugin-title-right">
                      <div class="plugin-title-version">Version {{ plugin.version }}</div>
                    </div>
                  </div>
                  <div class="plugin-button-bar">
                    <button type="button" v-on:click="plugin.reload()" v-if="plugin.installed && plugin.isReloadable()">
                      <i class="material-icons">refresh</i>
                      <span class="tl">${tl('dialog.plugins.reload')}</span>
                    </button>
                    <button type="button" v-on:click="plugin.uninstall()" v-if="plugin.installed">
                      <i class="material-icons">delete</i>
                      <span class="tl">${tl('dialog.plugins.uninstall')}</span>
                    </button>
                    <button type="button" v-on:click="plugin.download(true)" v-else-if="plugin.installed || plugin.isInstallable() == true">
                      <i class="material-icons">file_download</i>
                      <span class="tl">${tl('dialog.plugins.install')}</span>
                    </button>
                    <button type="button" disabled v-else>
                      <i class="material-icons">file_download_off</i>
                      <span class="tl">This plugin requires a minimum of Blockbench {{ plugin.min_version }}</span>
                    </button>
                    <ul v-if="plugin.tags?.length" class="plugin_tag_list plugin-tags">
                      <li v-for="tag in plugin.tags" :class="getTagClass(tag)" :key="tag" @click="currentTag = tag; detailsVisible = null">{{tag}}</li>
                    </ul>
                    <ul v-else class="plugin_tag_list plugin-tags">
                      <li class="plugin-tag-no-tags" @click="currentTag = 'No Tags'; detailsVisible = null">No Tags</li>
                    </ul>
                    <div class="spacer"></div>
                    <a :href="'https://www.blockbench.net/plugins/' + plugin.id" title="View on the Blockbench website">
                      <i class="icon material-icons">language</i>
                    </a>
                    <a :href="'https://github.com/JannisX11/blockbench-plugins/blob/master/plugins/' + plugin.id + '.js'">
                      <i class="icon fab fa-github"></i>
                    </a>
                  </div>
                  <div class="plugin-details-description">{{ plugin.description }}</div>
                  <div class="plugin-details-about markdown" v-if="plugin.about" v-html="marked(plugin.about.replace(/\\n/g, '\\n\\n'))"></div>
                  <div class="plugin-details-about-filler" v-else v-html="getIconNode(plugin.icon || 'error_outline', 'var(--color-back)').outerHTML">
                  </div>
                </div>
              </div>
            </div>
          `
        }
      })
    },
    onunload() {
      Plugins.dialog = oldDialog
      aboutAction.delete()
      MenuBar.removeAction(`help.about_plugins.about_${id.replace(".", "_")}`)
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
    aboutAction = new Action(`about_${id.replace(".", "_")}`, {
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
          <p>placeholder</p>
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