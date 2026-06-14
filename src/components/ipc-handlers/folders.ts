import IPC from '../ipc.js';
import { openInExplorer } from '../fileManager.js';
import * as constants from '../constants.js';
import * as config from '../config.js';

IPC.on('open-folder', async (kind: 'downloads' | 'backgrounds' | 'sprites') => {
	const currentConfig = config.getConfig();
	let path;
	switch (kind) {
		case 'downloads':
			path = currentConfig.downloadPath;
			break;
		case 'backgrounds':
			path = constants.backgroundsPath;
			break;
		case 'sprites':
			path = constants.spritesPath;
			break;
		default:
			throw new Error(`Unknown type of folder ${kind}`);
	}
	openInExplorer(path);
});
