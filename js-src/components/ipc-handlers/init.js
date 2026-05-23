import IPC from '../ipc.js';
import * as packManager from '../packManager.js';
import * as config from '../config.js';
import { triggerBackgroundWatcher, triggerSpriteWatcher } from '../watchers.js';

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
