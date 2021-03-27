const IPC = require('../ipc');
const packManager = require('../packManager');
const config = require('../config');
const {
	triggerBackgroundWatcher,
	triggerSpriteWatcher,
} = require('../watchers');

const currentConfig = config.getConfig();

IPC.on(
	'init-dddg',
	/**
	 * @param {string} repoUrl
	 */
	async () => {
		IPC.autoloadChanged(currentConfig.autoLoad);
		IPC.loadContentPacks(currentConfig.autoLoad);
		IPC.dowloadFolderUpdate(currentConfig.downloadPath);
		triggerBackgroundWatcher(true);
		triggerSpriteWatcher(true);
	}
);
