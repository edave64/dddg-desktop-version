// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron');

app.enableSandbox();

app.whenReady().then(() => {
	app.on('activate', function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

async function main() {
	const server = require('./components/server.js');
	const ipc = require('./components/ipc.js');
	const window = require('./components/window.js');

	ipc.install();
	server.start();

	await Promise.all([server.isReady, window.isReady]);
	window.open();
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') app.quit();
});

main();
