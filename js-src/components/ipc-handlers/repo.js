const IPC = require('../ipc');
const packManager = require('../packManager');

IPC.onConversation(
	'repo.install',
	/**
	 * @param {string} repoUrl
	 */
	async (repoUrl, repoEntry, authors) => {
		await packManager.installContentPack(repoUrl, repoEntry, authors);
	}
);

IPC.onConversation(
	'repo.uninstall',
	/**
	 *
	 * @param {string} packId
	 */
	async (packId) => {
		await packManager.queueUninstallContentPack(packId);
	}
);
