import { app, Menu, BrowserWindow, shell, nativeTheme } from 'electron';
import path from 'path';
import url from 'url';
import { port } from './constants.js';
import IPC from './ipc.js';
import { deleteIncompleteInstalls } from './packManager.js';
import { triggerSpriteWatcher, triggerBackgroundWatcher } from './watchers.js';
import { error, log } from './logger.js';

const WINDOW_WIDTH = 1280 + 168;
const WINDOW_HEIGHT = 720;

app.on('ready', function () {
	create_menus();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async function () {
	try {
		await deleteIncompleteInstalls();
	} catch (e) {
		error(e);
	}
	log('quitting.');
	if (process.platform !== 'darwin') app.quit();
});

function create_menus() {
	const template = [
		{
			role: 'quit',
		},
		{
			label: 'View',
			submenu: [
				{ role: 'reload' },
				{ type: 'separator' },
				{ role: 'resetzoom' },
				{ role: 'zoomin' },
				{ role: 'zoomout' },
				{ type: 'separator' },
				{ role: 'togglefullscreen' },
			],
		},
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

/** @type {BrowserWindow} */
let win;

export default {
	open() {
		win = new BrowserWindow({
			width: WINDOW_WIDTH,
			height: WINDOW_HEIGHT,
			resizable: true,
			icon:
				process.platform === 'win32'
					? path.join(import.meta.dirname, '../../favicon.ico')
					: path.join(import.meta.dirname, '../../favicon.png'),
			webPreferences: {
				preload: path.join(app.getAppPath(), 'js-src/preload.js'),
				contextIsolation: true,
				enableWebSQL: false,
				enableRemoteModule: false,
				nodeIntegration: false,
				nodeIntegrationInSubFrames: false,
				nodeIntegrationInWorker: false,
				devTools: true,
				webgl: false,
				defaultEncoding: 'utf-8',
				worldSafeExecuteJavaScript: false,
				webviewTag: false,
				navigateOnDragDrop: false,
				autoplayPolicy: 'document-user-activation-required',
			},
			show: false,
			closable: true,
			paintWhenInitiallyHidden: true,
			autoHideMenuBar: true,
		});
		const serverUrl = url.format({
			host: 'localhost:' + port,
			protocol: 'http:',
			slashes: true,
		});

		win.loadURL(serverUrl);

		win.webContents.session.setPermissionCheckHandler(() => false);

		win.webContents.session.setPermissionRequestHandler(
			(webCont, perm, callback, details) => callback(false)
		);
		win.webContents.session.webRequest.onHeadersReceived(
			(details, callback) => {
				if (details.url.startsWith(serverUrl)) {
					callback({
						responseHeaders: {
							...details.responseHeaders,
							'Content-Security-Policy': [
								"script-src 'self'; object-src 'none'; child-src 'none'; form-action 'none'",
							],
						},
					});
				} else {
					callback({ responseHeaders: details.responseHeaders });
				}
			}
		);

		// Prevent new links to open in the same tab
		win.webContents.on('new-window', (event, url) => {
			event.preventDefault();
			shell.openExternal(url);
			//win.loadURL(url);
		});

		// Prevent navigation
		win.webContents.on('will-navigate', (event, url) => {
			event.preventDefault();
			if (url === serverUrl) return;
			log(event, url);
			shell.openExternal(url);
		});

		win.webContents.on('before-input-event', function (e, props) {
			if (props && props.key === 'I' && props.control) {
				win.webContents.openDevTools();
				e.preventDefault();
				return false;
			}
		});

		win.on('closed', function () {
			win = null;
		});

		win.once('ready-to-show', () => {
			win.show();
		});

		win.webContents.on('will-redirect', (e) => e.preventDefault());
		win.webContents.on('will-prevent-unload', (e) => e.preventDefault());
		win.webContents.on('will-attach-webview', (e) => e.preventDefault());

		win.on('focus', function () {
			if (!IPC.ready) return;
			triggerBackgroundWatcher();
			triggerSpriteWatcher();
		});

		IPC.on('reload', () => {
			win.reload();
		});
	},

	isReady: app.whenReady(),

	getWindow() {
		return win;
	},
};

export function getWindow() {
	return win;
}
