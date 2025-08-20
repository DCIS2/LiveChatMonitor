const { contextBridge, ipcRenderer } = require('electron');

let eventListener = null;

contextBridge.exposeInMainWorld('electronAPI', {
  startMonitor: (username) => ipcRenderer.send('start-monitor', username),

  onNewEvent: (callback) => {
    if (eventListener) {
      ipcRenderer.removeListener('new-event', eventListener);
    }
    eventListener = (_event, data) => callback(data);
    ipcRenderer.on('new-event', eventListener);
  },

  removeNewEventListener: () => {
    if (eventListener) {
      ipcRenderer.removeListener('new-event', eventListener);
      eventListener = null;
    }
  },

  getBuffer: (username) => ipcRenderer.send('get-buffer', username),
  onBufferedEvents: (callback) => ipcRenderer.on('buffered-events', (event, data) => callback(data))
});
