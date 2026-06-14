import IPC from '../ipc.js';
import * as config from '../config.js';
import { dialog } from 'electron';

import { getWindow } from '../window.js';
import { log } from '../logger.js';

const currentConfig = config.getConfig();

IPC.onConversation(
	'config.set',
	async <K extends keyof typeof currentConfig>(
		key: K,
		value: (typeof currentConfig)[K]
	) => {
		currentConfig[key] = value;
		config.saveConfig();
	}
);

IPC.onConversation(
	'config.get',
	async <K extends keyof typeof currentConfig>(
		key: K
	): Promise<(typeof currentConfig)[K]> => {
		log('requesting', key);
		return currentConfig[key];
	}
);

IPC.on('config.newDownloadFolder', async () => {
	const newPath = dialog.showOpenDialogSync(getWindow(), {
		title: 'Set download folder',
		defaultPath: currentConfig.downloadPath,
		properties: ['openDirectory'],
	});
	if (!newPath) return;
	currentConfig.downloadPath = newPath[0]!;
	config.saveConfig();
	IPC.dowloadFolderUpdate(newPath[0]!);
});
