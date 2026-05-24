import IPC from '../ipc.js';
import * as packManager from '../packManager.js';

IPC.onConversation(
	'repo.install',
	async (repoUrl: string, repoEntry: any, authors: any) => {
		await packManager.installContentPack(repoUrl, repoEntry, authors);
	}
);

IPC.onConversation('repo.uninstall', async (packId: string) => {
	await packManager.queueUninstallContentPack(packId);
});
