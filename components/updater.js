const { autoUpdater } = require('electron-updater');
const currentConfig = require('./config').getConfig();
const IPC = require('./ipc');

autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.signals.progress((info) => {
	IPC.update.progress(info.percent);
});

autoUpdater.signals.updateDownloaded((info) => {
	IPC.update.progress('done');
});

if (currentConfig.autoUpdateCheck) {
	autoUpdater.autoDownload = true;
	autoUpdater.checkForUpdatesAndNotify();
} else {
	autoUpdater.autoDownload = false;
}

/** @type {string|null}*/
let newVersion = null;

const updater = (module.exports = {
	async checkForUpdate() {
		try {
			const update = await autoUpdater.checkForUpdate();
			IPC.update.sendAvailable(update.updateInfo.version);
		} catch (e) {
			IPC.update.checkStopped();
		}
	},
});
