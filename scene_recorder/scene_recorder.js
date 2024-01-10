(async function () {
  const child_process = require("child_process")
  const path = require("path")

  let formats, ffmpegPath
  const id = "scene_recorder"
  const name = "Scene Recorder"
  const E = s => $(document.createElement(s))
  Plugin.register(id, {
    title: name,
    icon: "icon.png",
    author: "Ewan Howell",
    description: "Add a new scene recorder where you can record your model in a large variety of formats.",
    tags: ["Recording", "Media"],
    version: "2.0.0",
    min_version: "4.8.0",
    variant: "desktop",
    creation_date: "2022-12-14",
    async onload() {
      Screencam.gif_options_dialog.close()
      if (await checkFFmpeg()) return

      formats = {
        mp4: {
          name: "MP4 Video",
          process: (vars, options) => processFFmpeg(vars, options, {
            name: "MP4 Video",
            extension: "mp4",
            command: ["-c:v", options.mp4Codec, "-pix_fmt", "yuv420p", "-vf", "scale=floor(iw/2)*2:floor(ih/2)*2", "-an"]
          })
        },
        webm: {
          name: "WebM Video",
          process: (vars, options) => processFFmpeg(vars, options, {
            name: "WebM Video",
            extension: "webm",
            command: ["-c:v", "libvpx-vp9", "-crf", "10", "-b:v", "0", "-an"]
          })
        },
        webp: {
          name: "Animated WebP",
          process: (vars, options) => processFFmpeg(vars, options, {
            name: "Animated WebP",
            extension: "webp",
            command: ["-loop", 0]
          })
        }
      }

      for (const [id, format] of Object.entries(formats)) {
        ScreencamGIFFormats[id] = format
        Screencam.gif_options_dialog.form.format.options[id] = format.name
      }

      insertToForm("mp4Codec", {
        label: "Codec",
        type: "select",
        default: "libx264",
        options: {
          libx264: "H.264",
          libx265: "H.265",
          "libvpx-vp9": "VP9"
        },
        condition: form => ["mp4"].includes(form.format)
      }, 1)
    },
    onunload() {
      Screencam.gif_options_dialog.close()
      for (const id of Object.keys(formats)) {
        delete ScreencamGIFFormats[id]
        delete Screencam.gif_options_dialog.form.format.options[id]
      }
      delete Screencam.gif_options_dialog.form.mp4Codec
      Screencam.gif_options_dialog.build()
    }
  })

  async function processFFmpeg(vars, options, args) {
    const buffers = []
    for (const [i, canvas] of vars.frame_canvases.entries()) {
      const blob = await new Promise(canvas.toBlob.bind(canvas))
      buffers.push(Buffer.from(await blob.arrayBuffer()))
    }
    const file = electron.dialog.showSaveDialogSync({
      filters: [{
        name: args.name,
        extensions: [args.extension]
      }],
      defaultPath: `${Project.name || "scene"}.${args.extension}`
    })
    if (!file) return
    Blockbench.showQuickMessage("Processing...")
    await ffmpeg(buffers, ["-framerate", options.fps, "-i", "-", ...args.command, "-y", file])
    Blockbench.showQuickMessage(`Saved as ${file}`)
  }

  function spawn(exe, args, data = { stdio: "ignore" }) {
    const p = child_process.spawn(exe, args, data)
    p.promise = new Promise((fulfil, reject) => {
      p.on("close", fulfil)
      p.on("error", reject)
    })
    return p
  }

  async function ffmpeg(frames, args) {
    const p = spawn(ffmpegPath, args, {
      stdio: ["pipe", "ignore", "pipe"]
    })
    for (const frame of frames) p.stdin.write(frame)
    p.stdin.end()
    let out = ""
    for await (const chunk of p.stderr) {
      out += chunk
    }
    return p.promise
  }

  async function checkFFmpeg() {
    const paths = [
      localStorage.getItem("ffmpegPath"),
      "ffmpeg",
      "/usr/local/bin/ffmpeg"
    ].filter(e => e)
    for (const path of paths) {
      const p = spawn(path, [])
      try {
        await p.promise
        ffmpegPath = path
        return
      } catch {}
    }
    const process = require("process")
    dialog = new Blockbench.Dialog({
      id: "no-ffmpeg",
      title: "Missing FFmpeg",
      width: 610,
      buttons: [],
      lines: [`
        <style>
          dialog#no-ffmpeg .dialog_content {
            margin-top: 0;
            overflow-x: clip;
          }
          dialog#no-ffmpeg .ffmpeg-button {
            background-color: var(--color-button);
            color: var(--color-text)!important;
            min-height: 32px;
            padding: 0 16px;
            text-decoration: none!important;
            display: inline-flex;
            justify-content: center;
            align-items: center;
            margin: 10px 0 20px;
          }
          dialog#no-ffmpeg .ffmpeg-button:hover {
            background-color: var(--color-accent);
            color: var(--color-accent_text) !important;
          }
          dialog#no-ffmpeg .ffmpeg-button:active {
            text-decoration: underline!important;
          }
          dialog#no-ffmpeg .button-bar {
            display: flex;
            justify-content: flex-end;
            gap: 3px;
            margin-top: 20px;
          }
          dialog#no-ffmpeg .spacer {
            flex: 1;
          }
        </style>
        <h1>Missing FFmpeg</h1>
        <p>FFmpeg is required to use this plugin</p>
        <a class="ffmpeg-button" href="https://ffmpeg.org/download.html">Download FFmpeg</a>
        ${process.platform === "linux" ? "" : `<iframe width="560" height="315" src="${process.platform === "darwin" ? "https://www.youtube.com/embed/H1o6MWnmwpY" : "https://www.youtube.com/embed/jZLqNocSQDM"}" frameborder="0" allow="" allowfullscreen></iframe>`}
        <div class="button-bar">
          <button id="ffmpeg-select">Select FFmpeg executable manually</button>
          <div class="spacer"></div>
          <button id="ffmpeg-reload">Reload plugin</button>
          <button id="ffmpeg-close">Close</button>
        </div>
      `]
    }).show()
    $("#ffmpeg-select").on("click", async e => {
      const file = electron.dialog.showOpenDialogSync()
      if (!file) return
      try {
        const p = spawn(file[0], [], {
          stdio: ["ignore", "ignore", "pipe"]
        })
        let out = ""
        for await (const chunk of p.stderr) out += chunk
        if (!out.startsWith("ffmpeg")) return Blockbench.showQuickMessage("Invalid FFmpeg file")
      } catch {
        return Blockbench.showQuickMessage("Invalid FFmpeg file")
      }
      localStorage.setItem("ffmpegPath", file[0])
      dialog.close()
      Plugins.all.find(e => e.id === id).reload()
    })
    $("#ffmpeg-reload").on("click", e => {
      dialog.close()
      Plugins.all.find(e => e.id === id).reload()
      Blockbench.showQuickMessage(`Reloaded ${name}`)
    })
    $("#ffmpeg-close").on("click", e => dialog.close())
    return true
  }

  function insertToForm(name, properties, index) {
    const formArray = Object.entries(Screencam.gif_options_dialog.form)
    formArray.splice(index, 0, [name, properties])
    Screencam.gif_options_dialog.form = Object.fromEntries(formArray)
    Screencam.gif_options_dialog.build()
  }
})()