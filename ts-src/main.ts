// Modules to control application life and create native browser window
import { app, BrowserWindow } from 'electron';
import server from './components/server.js';
import ipc from './components/ipc.js';
import window from './components/window.js';

app.enableSandbox();

app.whenReady().then(() => {
	app.on('activate', function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) {
			const window = require('./components/window.js');
			window.open();
		}
	});
});

async function main() {
	await ipc.install();
	server.start();

	const updater = await import('./components/updater.js');

	await Promise.all([server.isReady, window.isReady]);
	window.open();
}

main();
