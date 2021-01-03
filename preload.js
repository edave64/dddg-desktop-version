// This file is loaded whenever a javascript context is created. It runs in a
// private scope that can access a subset of Electron renderer APIs. We must be
// careful to not leak any objects into the global scope!
const { ipcRenderer } = require('electron');
const { contextBridge } = require('electron');

require = null;

const channelWhitelist = [
	'add-persistent-content-pack',
	'add-persistent-background',
	'push-message',
	'prompt-answered',
	'update-ready',
	'find-customs',
];

contextBridge.exposeInMainWorld('isElectron', {});
contextBridge.exposeInMainWorld('ipcRenderer', {
	on(channel, listener) {
		if (!channelWhitelist.includes(channel))
			throw new Error(
				`Security Exception: IPC channel '${channel}' is not on the whitelist!`
			);
		ipcRenderer.on(channel, listener);
	},
	send(channel, ...args) {
		if (!channelWhitelist.includes(channel))
			throw new Error(
				`Security Exception: IPC channel '${channel}' is not on the whitelist!`
			);
		ipcRenderer.send(channel, ...args);
	},
});
