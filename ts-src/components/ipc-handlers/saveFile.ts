import IPC from '../ipc.js';
import * as config from '../config.js';
import { join } from 'path';
import fs from 'fs';

IPC.onConversation('save-file', async (filename: string, blob: Uint8Array) => {
	const currentConfig = config.getConfig();
	await fs.promises.mkdir(currentConfig.downloadPath, { recursive: true });
	const fullPath = join(currentConfig.downloadPath, join('/', filename));
	fs.writeFile(fullPath, blob, (err) => {
		if (!err) {
			IPC.pushMessage(`File '${fullPath}' successfully saved!`);
		} else {
			IPC.pushMessage(`Error while saving. ${err.message}`);
		}
	});
});
