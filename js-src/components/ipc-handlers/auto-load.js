const IPC = require('../ipc');
const config = require('../config');

const currentConfig = config.getConfig();

IPC.onConversation('auto-load.add', async (id) => {
	currentConfig.autoLoad = [...(currentConfig.autoLoad || []), id];
	IPC.autoloadChanged(currentConfig.autoLoad);
	config.saveConfig();
});

IPC.onConversation('auto-load.remove', async (id) => {
	currentConfig.autoLoad = (currentConfig.autoLoad || []).filter(
		(x) => x !== id
	);
	IPC.autoloadChanged(currentConfig.autoLoad);
	config.saveConfig();
});
