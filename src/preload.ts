// This file is loaded whenever a javascript context is created. It runs in a
// private scope that can access a subset of Electron renderer APIs. We must be
// careful to not leak any objects into the global scope!
import { ipcRenderer, contextBridge } from 'electron';

// To prevent any kind of exploit of the preload script from poisoning the main process,
// we have to disable require completely once we don't need it anymore
//@ts-expect-error
require = null;

const channelWhitelist = [
	'add-persistent-content-pack',
	'add-persistent-background',
	'push-message',
	'prompt-answered',
	'update.current-version',
	'update.available-version',
	'update.progress',
	'update.checkStopped',
	'config.get',
	'config.set',
	'config.downloadFolderUpdate',
	'config.newDownloadFolder',
	'open-folder',
	'load-packs',
	'auto-load.add',
	'auto-load.remove',
	'auto-load.changed',
	'repo.install',
	'repo.uninstall',
	'reload-repo',
	'init-dddg',
	'replace-pack',
	'resolvable-error',
	'save-file',
	'reload',
	'save-states.get-all',
	'save-states.begin',
	'save-states.file',
	'save-states.end',
	'save-states.load',
	'save-states.download-zip',
	'save-states.upload-zip',
	'save-states.delete',
	'save-states.load-default',
	'save-states.default-begin',
];

let currentConvoId = 0;
/**
 * @type {Map<string, {resolve: Function, reject: Function}>}
 */
const waitingConvos = new Map();

contextBridge.exposeInMainWorld('isElectron', {});
contextBridge.exposeInMainWorld('ipcRenderer', {
	send(channel: string, ...args: any[]): void {
		assertChannelWhitelisted(channel);
		console.log('Sending', channel, ...args);
		ipcRenderer.send(channel, ...args);
	},
	sendConvo(channel: string, ...params: any[]): Promise<any> {
		assertChannelWhitelisted(channel);

		const id = 'sub-' + currentConvoId;
		// This is silly unlikely, but whatever
		if (currentConvoId === Number.MAX_SAFE_INTEGER) {
			currentConvoId = 0;
		} else {
			currentConvoId++;
		}

		return new Promise((resolve, reject) => {
			waitingConvos.set(id, { resolve, reject });
			console.log('Sending convo', channel, id, ...params);
			ipcRenderer.send(channel, id, ...params);
		});
	},
	on(channel: string, listener: Function): void {
		assertChannelWhitelisted(channel);
		ipcRenderer.on(channel, (event, ...args) => {
			console.log('Receiving', channel, ...args);
			listener(...args);
		});
	},
	onConversation(channel: string, callback: Function): void {
		assertChannelWhitelisted(channel);
		ipcRenderer.on(channel, async function (event, convoId, ...args) {
			try {
				console.log('Receiving convo', channel, convoId, ...args);
				const ret = await callback(...args);
				console.log('Sending convo answer', channel, convoId, ...args);
				ipcRenderer.send('convo-answer', convoId, ret);
			} catch (e) {
				console.log('Sending convo error', channel, convoId, e);
				ipcRenderer.send('convo-error', convoId, e);
			}
		});
	},
});

function assertChannelWhitelisted(channel: string): void {
	if (!channelWhitelist.includes(channel)) {
		throw new Error(
			`Security Exception: IPC channel '${channel}' is not on the whitelist!`
		);
	}
}

ipcRenderer.on('convo-answer', function (event, id, ret) {
	if (!waitingConvos.has(id)) return;
	console.log('Receiving convo answer', id, ret);
	waitingConvos.get(id).resolve(ret);
});

ipcRenderer.on('convo-error', function (event, id, err) {
	if (!waitingConvos.has(id)) return;
	console.log('Receiving convo error', id, err);
	waitingConvos.get(id).reject(err);
});
