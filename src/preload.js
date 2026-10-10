'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// NOTE: the exposed name (`usageBridge`) must not clash with any global function in the page,
// otherwise the page renders blank with no visible error.
contextBridge.exposeInMainWorld('usageBridge', {
  setHeight: (h) => ipcRenderer.send('widget:height', Number(h)),
});
