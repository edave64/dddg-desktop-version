const IPC = require('../ipc');
const config = require('../config');
const { dialog } = require('electron');

const { getWindow } = require('../window');
const { log } = require('../logger');

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
