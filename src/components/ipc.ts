import { ipcMain } from 'electron';
import { readdirSync } from 'fs';
import { join } from 'path';
import { log } from './logger.js';

let target: Electron.WebContents | null = null;

const IPC = {
	ready: false,
	install(): void {
		log('installing ipc');
		const ipcFolder = join(import.meta.dirname, './ipc-handlers/');
		for (const file of readdirSync(ipcFolder)) {
			if (file.endsWith('.js')) {
				import('file://' + join(ipcFolder, file));
			}
		}
	},
	/**
	 * @param {string} text
	 */
	pushMessage(text: string): void {
		send('push-message', text);
	},
	updateReady(): void {
		send('update-ready');
	},
	dowloadFolderUpdate(folder: string): void {
		send('config.downloadFolderUpdate', folder);
	},
	reloadLocalRepo(): void {
		send('reload-repo');
	},
	update: {
		currentVersion(version: string) {
			send('update.current-version', version);
		},
		versionAvailable(version: string) {
			send('update.available-version', version);
		},
		progress(percentage: number | 'done') {
			send('update.progress', percentage);
		},
		checkStopped() {
			send('update.checkStopped');
		},
	},
	autoloadChanged(ids: string[]) {
		sendConvo('auto-load.changed', ids || []);
	},
	loadContentPacks(packIds: string[]) {
		sendConvo('load-packs', packIds);
	},
	replacePack(
		pack: import('@edave64/doki-doki-dialog-generator-pack-format/dist/v2/jsonFormat.js').JSONContentPack
	) {
		log('replace pack', JSON.stringify(pack, undefined, 2));
		sendConvo('replace-pack', pack);
	},
	async resolvableError(message: string, answers: string[]): Promise<string> {
		return await sendConvo('resolvable-error', message, answers);
	},
	on(name: string, callback: Function): void {
		receiver(name, callback);
	},
	onConversation(name: string, callback: Function): void {
		receiver(name, async function (convoId: string, ...args: any[]) {
			try {
				const ret = await callback(...args);
				send('convo-answer', convoId, ret);
			} catch (e) {
				send('convo-error', convoId, e);
			}
		});
	},
};

let pendingSends: Array<[string, any[]]> = [];

function sendAllPending(): void {
	const oldPendings = pendingSends;
	pendingSends = [];
	for (const pendingSend of oldPendings) {
		send(pendingSend[0], ...pendingSend[1]);
	}
}

let currentConvoId = 0;
const waitingConvos: Map<string, { resolve: Function; reject: Function }> =
	new Map();

function sendConvo(name: string, ...params: any[]): Promise<any> {
	const id = 'main-' + currentConvoId;
	// This is silly unlikely, but whatever
	if (currentConvoId === Number.MAX_SAFE_INTEGER) {
		currentConvoId = 0;
	} else {
		currentConvoId++;
	}

	return new Promise((resolve, reject) => {
		waitingConvos.set(id, { resolve, reject });
		send(name, id, ...params);
	});
}

function send(name: string, ...params: any[]) {
	if (!target) {
		pendingSends.push([name, params]);
		return;
	}

	log('Sending', name, ...params);
	return target.send(name, ...params);
}

function receiver(name: string, callback: Function): void {
	log('registering', name);
	ipcMain.on(name, async (e, ...args) => {
		log('receiving', name, ...args);
		target = e.sender;
		IPC.ready = true;
		try {
			await callback(...args);
		} catch (e: any) {
			IPC.pushMessage('Error: ' + e.message);
			throw e;
		}
		sendAllPending();
	});
}

receiver('convo-answer', function (id: string, ret: any) {
	const convo = waitingConvos.get(id);
	if (!convo) return;
	convo.resolve(ret);
});

receiver('convo-error', function (id: string, err: any) {
	const convo = waitingConvos.get(id);
	if (!convo) return;
	convo.reject(err);
});

export default IPC;
