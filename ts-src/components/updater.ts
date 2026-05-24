import electronUpdater from 'electron-updater';
import * as config from './config.js';
import IPC from './ipc.js';

const currentConfig = config.getConfig();

const autoUpdater = electronUpdater.autoUpdater;

autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.signals.progress((info) => {
	IPC.update.progress(info.percent);
});

autoUpdater.signals.updateDownloaded((info) => {
	IPC.update.progress('done');
});

if (currentConfig.autoUpdateCheck) {
	autoUpdater.autoDownload = true;
	autoUpdater.checkForUpdatesAndNotify({
		title: 'Doki Doki Dialog Generator - Update',
	});
} else {
	autoUpdater.autoDownload = false;
}

/** @type {string|null}*/
let newVersion = null;

const updater = {
	async checkForUpdate() {
		try {
			const update = await autoUpdater.checkForUpdate();
			IPC.update.sendAvailable(update.updateInfo.version);
		} catch (e) {
			IPC.update.checkStopped();
		}
	},
};

export default updater;
