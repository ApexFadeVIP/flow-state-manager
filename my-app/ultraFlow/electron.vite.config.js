import { defineConfig } from 'electron-vite'
import path from 'path'

export default defineConfig({
  main: {
    entry: path.join(__dirname, 'electron/main.js')
  },
  preload: {
    input: {
      preload: path.join(__dirname, 'electron/preload.js')
    }
  },
  renderer: {
    input: path.join(__dirname, 'src/index.html') // MUST point to your Vue entry HTML
  }
})
