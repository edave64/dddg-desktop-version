const IPC = require('../ipc');
const openInExplorer = require('../fileManager');
const constants = require('../constants');
const config = require('../config');

/**
 * @param {'downloads'|'backgrounds'|'sprites'}
 */
IPC.on('open-folder', async (kind) => {
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
