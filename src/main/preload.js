const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Monitoring
  startMonitor: (username) => ipcRenderer.send('start-monitor', username),
  setIphoneUser: (username) => ipcRenderer.send('monitor:set-user', username),
  stopMonitor: () => ipcRenderer.send('stop-monitor'),

  // Pinned items
  pinItem: (item) => ipcRenderer.send('pin-item', item),
  unpinItem: (index) => ipcRenderer.send('unpin-item', index),
  updatePinnedItems: (items) => ipcRenderer.send('update-pinned-items', items),
  openPinnedWindow: () => ipcRenderer.send('open-pinned-window'),
  openPinnedDialog: () => ipcRenderer.invoke('open-pinned-dialog'),

  // Event listeners
  onNewEvent: (callback) => {
    ipcRenderer.on('new-event', (_event, payload) => {
      callback(payload);
    });
  },
  removeNewEventListener: () => {
    ipcRenderer.removeAllListeners('new-event');
  },

  // ✅ FIXED: Proper listener registration for pinned-items-updated
  onPinnedItemsUpdated: (callback) => {
    ipcRenderer.on('pinned-items-updated', (_event, items) => {
      if (typeof callback === 'function') {
        callback(items);
      }
    });
  },

  // Optional: generic send method
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  }
});

