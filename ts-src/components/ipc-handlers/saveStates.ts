import { getConfig } from '../config.js';
import IPC from '../ipc.js';
import * as packManager from '../packManager.js';
import fs from 'fs';
import fsp from 'fs/promises';
import JSZip from 'jszip';
import path from 'path';
import { dialog } from 'electron';
import { getWindow } from '../window.js';

// save-file collides with the save-file ipc handler! Make this a
// "saveStates." namespace

IPC.onConversation('save-states.get-all', async () => {
	try {
		const saves = await fsp.readdir(getConfig().savesPath);
		return saves
			.filter((saveName) => !saveName.startsWith('.'))
			.map((saveName) => {
				const stat = fs.statSync(path.join(getConfig().savesPath, saveName));

				return {
					name: saveName,
					size: stat.size,
					timestamp: stat.mtime,
				};
			});
	} catch (e) {
		return [];
	}
});

/** @type {string | null} */
let currentSaveName = null;
let exportingDefault = false;

IPC.onConversation('save-states.default-begin', async () => {
	currentSaveName = 'default';
	exportingDefault = true;
	const saveFolder = getConfig().defaultSavePath;
	try {
		await fsp.rmdir(saveFolder, { recursive: true });
	} catch (e) {
		// Ignore
		// We do this to clear an existing save. If none exists, it's fine
	}
	await fsp.mkdir(saveFolder, { recursive: true });
});

IPC.onConversation(
	'save-states.begin',
	/**
	 * @param {string} saveName
	 */
	async (saveName) => {
		currentSaveName = saveName;
		exportingDefault = false;
		const saveFolder = getSaveFolder(saveName);
		try {
			await fsp.rmdir(saveFolder, { recursive: true });
		} catch (e) {
			// Ignore
			// We do this to clear an existing save. If none exists, it's fine
		}
		await fsp.mkdir(saveFolder, { recursive: true });
	}
);

IPC.onConversation(
	'save-states.file',
	/**
	 *
	 * @param {string} saveName
	 * @param {string} fileName
	 * @param {ArrayBuffer} blob
	 */
	async (saveName, fileName, blob) => {
		const saveFolder = getSaveFolder(saveName);
		await fsp.writeFile(path.join(saveFolder, fileName), new Uint8Array(blob));
	}
);

IPC.onConversation(
	'save-states.end',
	/**
	 *
	 * @param {string} saveName
	 */
	async (saveName) => {
		const stat = fs.statSync(path.join(getConfig().savesPath, saveName));

		return {
			name: saveName,
			size: stat.size,
			timestamp: stat.mtime,
		};
	}
);

IPC.onConversation(
	'save-states.load',
	/**
	 * @param {string} saveName
	 * @returns {[File[]]}
	 */
	async (saveName) => {
		const saveFolder = getSaveFolder(saveName);
		const files = await fsp.readdir(saveFolder);
		return Promise.all(
			files
				.filter((fileName) => !fileName.startsWith('.'))
				.map(async (fileName) => ({
					name: fileName,
					data: (await fsp.readFile(path.join(saveFolder, fileName))).buffer,
				}))
		);
	}
);

IPC.onConversation(
	'save-states.load-default',
	/**
	 * @param {string} saveName
	 * @returns {[File[]]}
	 */
	async (saveName) => {
		const saveFolder = getConfig().defaultSavePath;
		try {
			const files = (await fsp.readdir(saveFolder)).filter(
				(fileName) => !fileName.startsWith('.')
			);
			if (!files.length) return null;
			return Promise.all(
				files.map(async (fileName) => ({
					name: fileName,
					data: (await fsp.readFile(path.join(saveFolder, fileName))).buffer,
				}))
			);
		} catch (e) {
			return null;
		}
	}
);

IPC.onConversation(
	'save-states.download-zip',
	/**
	 *
	 * @param {string} saveName
	 */
	async (saveName) => {
		const saveFolder = getSaveFolder(saveName);
		const files = await fsp.readdir(saveFolder);
		const zipPath = await dialog.showSaveDialog(getWindow(), {
			title: 'Save ZIP',
			defaultPath: path.join(saveFolder, 'save.zip'),
			filters: [{ name: 'Zip', extensions: ['zip'] }],
		});

		const zip = new JSZip();
		for (const fileName of files) {
			zip.file(fileName, await fsp.readFile(path.join(saveFolder, fileName)));
		}
		const stream = zip.generateNodeStream({});
		stream.pipe(fs.createWriteStream(zipPath));
	}
);

IPC.onConversation(
	'save-states.upload-zip',
	/**
	 *
	 * @param {string} packId
	 * @param {Blob} blob
	 */
	async (saveName, blob) => {
		const saveFolder = getSaveFolder(saveName);
		await fsp.mkdir(saveFolder, { recursive: true });

		const zip = await JSZip.loadAsync(blob);
		for (const file of Object.values(zip.files)) {
			await fsp.writeFile(
				path.join(saveFolder, file.name),
				await file.async('nodebuffer')
			);
		}
	}
);

IPC.onConversation(
	'save-states.delete',
	/**
	 *
	 * @param {string} saveName
	 */
	async (saveName) => {
		const saveFolder = getSaveFolder(saveName);
		await fsp.rmdir(saveFolder, { recursive: true });
	}
);

function getSaveFolder(saveName) {
	if (currentSaveName !== currentSaveName) {
		throw new Error(
			`Unexpected mixing of save commands! Probably a bug. Received ${currentSaveName} but expected ${saveName}`
		);
	}
	if (exportingDefault) {
		return getConfig().defaultSavePath;
	}
	return path.join(getConfig().savesPath, saveName);
}
