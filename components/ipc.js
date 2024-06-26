const { ipcMain } = require('electron');
const { readdirSync } = require('fs');
const { join } = require('path');
const { log } = require('./logger');

/** @type {Electron.WebContents | null} */
let target;

const IPC = {
	ready: false,
	install() {
		log('installing ipc');
		const ipcFolder = join(__dirname, './ipc-handlers/');
		for (const file of readdirSync(ipcFolder)) {
			require(join(ipcFolder, file));
		}
	},
	/**
	 * @param {string} text
	 */
	pushMessage(text) {
		send('push-message', text);
	},
	updateReady() {
		send('update-ready');
	},
	dowloadFolderUpdate(folder) {
		send('config.downloadFolderUpdate', folder);
	},
	reloadLocalRepo() {
		send('reload-repo');
	},
	update: {
		/**
		 * @param {string} version
		 */
		currentVersion(version) {
			send('update.current-version', version);
		},
		/**
		 * @param {string} version
		 */
		versionAvailable(version) {
			send('update.available-version', version);
		},
		/**
		 * @param {number|'done'} percentage
		 */
		progress(percentage) {
			send('update.progress', percentage);
		},
		checkStopped() {
			send('update.checkStopped', percentage);
		},
	},
	/**
	 * @param {string[]} ids
	 */
	autoloadChanged(ids) {
		sendConvo('auto-load.changed', ids || []);
	},
	/**
	 * @param {string[]} packIds
	 */
	loadContentPacks(packIds) {
		sendConvo('load-packs', packIds);
	},
	/**
	 *
	 * @param {import('@edave64/doki-doki-dialog-generator-pack-format/dist/v2/model').ContentPack<string>} pack
	 */
	replacePack(pack) {
		log('replace pack', JSON.stringify(pack, undefined, 2));
		sendConvo('replace-pack', pack);
	},
	/**
	 * @param {string} message
	 * @param {string[]} answers
	 * @returns {Promise<string>}
	 */
	async resolvableError(message, answers) {
		return await sendConvo('resolvable-error', message, answers);
	},
	/**
	 * @param {string} name
	 * @param {Function} callback
	 */
	on(name, callback) {
		receiver(name, callback);
	},
	/**
	 * @param {string} name
	 * @param {Function} callback
	 */
	onConversation(name, callback) {
		receiver(name, async function (convoId, ...args) {
			try {
				const ret = await callback(...args);
				send('convo-answer', convoId, ret);
			} catch (e) {
				send('convo-error', convoId, e);
			}
		});
	},
};

let pendingSends = [];

function sendAllPending() {
	const oldPendings = pendingSends;
	pendingSends = [];
	for (const pendingSend of oldPendings) {
		send(pendingSend[0], ...pendingSend[1]);
	}
}

let currentConvoId = 0;
/**
 * @type {Map<string, {resolve: Function, reject: Function}>}
 */
const waitingConvos = new Map();

/**
 * @param {string} name
 * @param {any[]} params
 */
function sendConvo(name, ...params) {
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

/**
 *
 * @param {string} name
 * @param {any[]} params
 */
function send(name, ...params) {
	if (!target) {
		stuckSends.push([name, params]);
		return;
	}

	log('Sending', name, ...params);
	return target.send(name, ...params);
}

/**
 *
 * @param {string} name
 * @param {Function} callback
 */
function receiver(name, callback) {
	log('registering', name);
	ipcMain.on(name, async (e, ...args) => {
		log('receiving', name, ...args);
		target = e.sender;
		IPC.ready = true;
		try {
			await callback(...args);
		} catch (e) {
			IPC.pushMessage('Error: ' + e.message);
			throw e;
		}
		sendAllPending();
	});
}

receiver('convo-answer', function (id, ret) {
	if (!waitingConvos.has(id)) return;
	waitingConvos.get(id).resolve(ret);
});

receiver('convo-error', function (id, err) {
	if (!waitingConvos.has(id)) return;
	waitingConvos.get(id).reject(err);
});

module.exports = IPC;
