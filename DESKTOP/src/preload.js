const os = require('os')
const fs = require('fs')
const path = require('path')
const { contextBridge, ipcRenderer } = require('electron');
const { createClient } = require('@supabase/supabase-js');

const supabaseClient = createClient(
  'https://vxukqznjkdtuytnkhldu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4dWtxem5qa2R0dXl0bmtobGR1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTI0NDE4MCwiZXhwIjoyMDc2ODIwMTgwfQ.7hCf7BDqlVuNkzP1CcbORilAzMqOHhexP4Y7bsTPRJA' // your actual key
);

// Expose to renderer process
contextBridge.exposeInMainWorld('supabase', {
  auth: {
    signUp: (credentials) => supabaseClient.auth.signUp(credentials),
    signInWithPassword: (credentials) => supabaseClient.auth.signInWithPassword(credentials),
    signOut: () => supabaseClient.auth.signOut(),
    getSession: () => supabaseClient.auth.getSession(),
    onAuthStateChange: (callback) => supabaseClient.auth.onAuthStateChange(callback)
  },
  from: (table) => supabaseClient.from(table),
  // Alternative: expose the entire client
  client: supabaseClient
});

/**
 * IPC Bridge (main <-> renderer)
 */
contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => {
    const validChannels = ['toMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  receive: (channel, func) => {
    const validChannels = ['fromMain']
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