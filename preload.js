// This file is loaded whenever a javascript context is created. It runs in a
// private scope that can access a subset of Electron renderer APIs. We must be
// careful to not leak any objects into the global scope!
const { ipcRenderer } = require('electron');

window.isElectron = true;

const channelWhitelist = [];

// Abstract the IPC object. This way we don't leak the the native ipcRenderer,
// instance further minimizing the attack surface
window.ipcRenderer = {
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
};
