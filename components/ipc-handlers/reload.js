const IPC = require('../ipc');
const { getWindow } = require('../window');

IPC.on('reload', async () => {
	getWindow().reload();
});
