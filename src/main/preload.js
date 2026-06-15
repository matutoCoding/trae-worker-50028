const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  peg: {
    create: (data) => ipcRenderer.invoke('peg:create', data),
    find: (query) => ipcRenderer.invoke('peg:find', query),
    findOne: (id) => ipcRenderer.invoke('peg:findOne', id),
    update: (id, data) => ipcRenderer.invoke('peg:update', id, data),
    remove: (id) => ipcRenderer.invoke('peg:remove', id),
  },
  archive: {
    create: (data) => ipcRenderer.invoke('archive:create', data),
    find: (query) => ipcRenderer.invoke('archive:find', query),
    findOne: (id) => ipcRenderer.invoke('archive:findOne', id),
    update: (id, data) => ipcRenderer.invoke('archive:update', id, data),
    remove: (id) => ipcRenderer.invoke('archive:remove', id),
  },
  library: {
    create: (data) => ipcRenderer.invoke('library:create', data),
    find: (query) => ipcRenderer.invoke('library:find', query),
    findOne: (id) => ipcRenderer.invoke('library:findOne', id),
    update: (id, data) => ipcRenderer.invoke('library:update', id, data),
    remove: (id) => ipcRenderer.invoke('library:remove', id),
  },
});
