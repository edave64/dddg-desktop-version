import electronUpdater from 'electron-updater';
import * as config from './config.js';
import IPC from './ipc.js';

const currentConfig = config.getConfig();

const autoUpdater = electronUpdater.autoUpdater;

autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.signals.progress((info) => {
	IPC.update.progress(info.percent);
});

autoUpdater.signals.updateDownloaded(() => {
	IPC.update.progress('done');
});

if (currentConfig.autoUpdateCheck) {
	autoUpdater.autoDownload = true;
	autoUpdater.checkForUpdatesAndNotify({
		title: 'Doki Doki Dialog Generator - Update',
		body: 'A new update is available. It will be installed automatically.',
	});
} else {
	autoUpdater.autoDownload = false;
}

const updater = {
	async checkForUpdate() {
		try {
			const update = await autoUpdater.checkForUpdates();
			if (!update) return;
			IPC.update.versionAvailable(update.updateInfo.version);
		} catch {
			IPC.update.checkStopped();
		}
	},
};

export default updater;
