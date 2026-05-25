import { getConfig } from '../config.js';
import IPC from '../ipc.js';
import fs from 'fs';
import fsp from 'fs/promises';
import JSZip from 'jszip';
import path from 'path';
import { dialog } from 'electron';
import { getWindow } from '../window.js';
import { safeJoin } from '../../helpers/safePath.js';

IPC.onConversation('save-states.get-all', async () => {
	try {
		const saves = await fsp.readdir(getConfig().savesPath);
		return saves
			.filter((saveName) => !saveName.startsWith('.'))
			.map((saveName) => {
				const stat = fs.statSync(getSaveFolder(saveName));
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

let currentSaveName: string | null = null;
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

IPC.onConversation('save-states.begin', async (saveName: string) => {
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
});

IPC.onConversation(
	'save-states.file',
	async (saveName: string, fileName: string, blob: ArrayBuffer) => {
		const saveFolder = getSaveFolder(saveName);
		await fsp.writeFile(safeJoin(saveFolder, fileName), new Uint8Array(blob));
	}
);

IPC.onConversation('save-states.end', async (saveName: string) => {
	const stat = fs.statSync(getSaveFolder(saveName));
	return {
		name: saveName,
		size: stat.size,
		timestamp: stat.mtime,
	};
});

IPC.onConversation(
	'save-states.load',
	async (saveName: string): Promise<{ name: string; data: ArrayBuffer }[]> => {
		const saveFolder = getSaveFolder(saveName);
		const files = await fsp.readdir(saveFolder);
		return Promise.all(
			files
				.filter((fileName) => !fileName.startsWith('.'))
				.map(async (fileName) => ({
					name: fileName,
					data: (await fsp.readFile(safeJoin(saveFolder, fileName))).buffer,
				}))
		);
	}
);

IPC.onConversation(
	'save-states.load-default',
	async (
		saveName: string
	): Promise<null | { name: string; data: ArrayBuffer }[]> => {
		const saveFolder = getConfig().defaultSavePath;
		try {
			const files = (await fsp.readdir(saveFolder)).filter(
				(fileName) => !fileName.startsWith('.')
			);
			if (!files.length) return null;
			return Promise.all(
				files.map(async (fileName) => ({
					name: fileName,
					data: (await fsp.readFile(safeJoin(saveFolder, fileName))).buffer,
				}))
			);
		} catch {
			return null;
		}
	}
);

IPC.onConversation('save-states.download-zip', async (saveName: string) => {
	const saveFolder = getSaveFolder(saveName);
	const files = await fsp.readdir(saveFolder);
	const zipPath = await dialog.showSaveDialog(getWindow(), {
		title: 'Save ZIP',
		defaultPath: path.join(saveFolder, 'save.zip'),
		filters: [{ name: 'Zip', extensions: ['zip'] }],
	});

	if (!zipPath.filePath) return;

	const zip = new JSZip();
	for (const fileName of files) {
		zip.file(fileName, await fsp.readFile(safeJoin(saveFolder, fileName)));
	}
	const stream = zip.generateNodeStream({});
	stream.pipe(fs.createWriteStream(zipPath.filePath));
});

IPC.onConversation(
	'save-states.upload-zip',
	async (saveName: string, blob: Blob) => {
		const saveFolder = getSaveFolder(saveName);
		await fsp.mkdir(saveFolder, { recursive: true });

		const zip = await JSZip.loadAsync(blob);
		for (const file of Object.values(zip.files)) {
			await fsp.writeFile(
				// Prevent malicious zips from breaking out of the save folder
				safeJoin(saveFolder, file.name),
				await file.async('nodebuffer')
			);
		}
	}
);

IPC.onConversation(
	'save-states.delete',
	async (saveName: string): Promise<void> => {
		const saveFolder = getSaveFolder(saveName);
		await fsp.rmdir(saveFolder, { recursive: true });
	}
);

function getSaveFolder(saveName: string): string {
	if (currentSaveName !== currentSaveName) {
		throw new Error(
			`Unexpected mixing of save commands! Probably a bug. Received ${currentSaveName} but expected ${saveName}`
		);
	}
	if (exportingDefault) {
		return getConfig().defaultSavePath;
	}
	return safeJoin(getConfig().savesPath, saveName);
}
