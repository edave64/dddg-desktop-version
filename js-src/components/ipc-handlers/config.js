import IPC from '../ipc.js';
import * as config from '../config.js';
import { dialog } from 'electron';

import { getWindow } from '../window.js';
import { log } from '../logger.js';

const currentConfig = config.getConfig();

IPC.onConversation(
	'config.set',
	/**
	 * @param {string} key
	 * @param {string|boolean|number} value
	 */
	async (key, value) => {
		currentConfig[key] = value;
		config.saveConfig();
	}
);

IPC.onConversation('config.get', async (key) => {
	log('requesting', key);
	return currentConfig[key];
});

IPC.on('config.newDownloadFolder', async () => {
	const newPath = dialog.showOpenDialogSync(getWindow(), {
		title: 'Set download folder',
		defaultPath: config.downloadPath,
		properties: ['openDirectory'],
	});
	if (!newPath) return;
	currentConfig.downloadPath = newPath[0];
	config.saveConfig();
	IPC.dowloadFolderUpdate(newPath[0]);
});
