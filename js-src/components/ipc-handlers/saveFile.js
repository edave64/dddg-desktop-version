import IPC from '../ipc.js';
import * as config from '../config.js';
import { join } from 'path';
import fs from 'fs';

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
