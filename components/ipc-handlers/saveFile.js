const IPC = require('../ipc');
const config = require('../config').getConfig();
const { join } = require('path');
const { writeFile } = require('fs');
const mkdirp = require('mkdirp');

IPC.onConversation('save-file', async (filename, blob) => {
	await mkdirp(config.downloadPath);
	const fullPath = join(config.downloadPath, join('/', filename));
	writeFile(fullPath, blob, (err) => {
		if (!err) {
			IPC.pushMessage(`File '${fullPath}' successfully saved!`);
		} else {
			IPC.pushMessage(`Error while saving. ${err.message}`);
		}
	});
});
