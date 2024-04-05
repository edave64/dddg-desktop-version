const IPC = require('../ipc');
const config = require('../config').getConfig();
const { join } = require('path');
const fs = require('fs');

IPC.onConversation('save-file', async (filename, blob) => {
	await fs.promises.mkdir(config.downloadPath, { recursive: true });
	const fullPath = join(config.downloadPath, join('/', filename));
	fs.writeFile(fullPath, blob, (err) => {
		if (!err) {
			IPC.pushMessage(`File '${fullPath}' successfully saved!`);
		} else {
			IPC.pushMessage(`Error while saving. ${err.message}`);
		}
	});
});
