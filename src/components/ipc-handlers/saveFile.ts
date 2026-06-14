import IPC from '../ipc.js';
import * as config from '../config.js';
import fs from 'fs';
import { safeJoin } from '../../helpers/safePath.js';

IPC.onConversation('save-file', async (filename: string, blob: Uint8Array) => {
	const currentConfig = config.getConfig();
	await fs.promises.mkdir(currentConfig.downloadPath, { recursive: true });
	const fullPath = safeJoin(currentConfig.downloadPath, filename);
	fs.writeFile(fullPath, blob, (err) => {
		if (!err) {
			IPC.pushMessage(`File '${fullPath}' successfully saved!`);
		} else {
			IPC.pushMessage(`Error while saving. ${err.message}`);
		}
	});
});
