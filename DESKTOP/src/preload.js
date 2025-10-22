const { contextBridge, ipcRenderer } = require('electron')
const os = require('os')
const fs = require('fs')
const path = require('path')

/**
 * IPC Bridge (main <-> renderer)
 */
contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => {
    const validChannels = ['toMain'] // whitelist outbound channels
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  receive: (channel, func) => {
    const validChannels = ['fromMain'] // whitelist inbound channels
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  }
})

/**
 * File API (safe helpers, no direct fs exposed)
 */
contextBridge.exposeInMainWorld('fileAPI', {
  readConfig: () => {
    const configPath = path.join(__dirname, 'config.json')
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    }
    return {}
  },
  writeConfig: (data) => {
    const configPath = path.join(__dirname, 'config.json')
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2))
    return true
  }
})

/**
 * System API (read-only)
 */
contextBridge.exposeInMainWorld('systemAPI', {
  platform: () => os.platform(),
  release: () => os.release(),
  arch: () => os.arch()
})

let sharedData = {};

contextBridge.exposeInMainWorld('store', {
  set: (key, value) => { sharedData[key] = value },
  get: (key) => sharedData[key],
  clear: () => { sharedData = {} }
});