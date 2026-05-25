import IPC from '../ipc.js';
import { getWindow } from '../window.js';

IPC.on('reload', async () => {
	getWindow().reload();
});
