import { join, relative } from 'path';

import fsp from 'fs/promises';
import crypto from 'crypto';

import IPC from './ipc.js';
import { backgroundsPath, spritesPath, port } from './constants.js';
import { log } from './logger.js';
import type { JSONContentPack } from '@edave64/doki-doki-dialog-generator-pack-format/dist/v2/jsonFormat.js';

let lastBackgroundWatcherHash: string | null = null;
let lastSpriteWatcherHash: string | null = null;

export async function triggerBackgroundWatcher(force: boolean = false) {
	const folder = backgroundsPath;
	const [listing, folderHash] = await hashFolder(folder);
	if (folderHash === lastBackgroundWatcherHash && !force) return;
	lastBackgroundWatcherHash = folderHash;

	const backgrounds: JSONContentPack['backgrounds'] = [];

	const grouped: Record<string, string[]> = {};
	for (const item of listing) {
		const rel = relative(folder, item).replace(/\\/g, '/');
		const group = rel.split('/')[0]!;
		if (!grouped[group]) grouped[group] = [];
		grouped[group].push(rel);
	}

	const groupKeys = Object.keys(grouped);
	groupKeys.sort();

	for (const groupKey of groupKeys) {
		const group = grouped[groupKey]!;
		backgrounds.push({
			id: group[0]!,
			label: group[0]!,
			scaling: 'none',
			variants: group.map((x) => [
				`http://localhost:${port}/custom_backgrounds/${x}`,
			]),
		});
	}

	IPC.replacePack({
		version: '2.0',
		packId: 'dddg.desktop.backgrounds',
		backgrounds,
		characters: [],
		colors: [],
		dependencies: [],
		fonts: [],
		poemBackgrounds: [],
		poemStyles: [],
		sprites: [],
	});
}

export async function triggerSpriteWatcher(force: boolean = false) {
	const folder = spritesPath;
	const [listing, folderHash] = await hashFolder(folder);
	if (folderHash === lastSpriteWatcherHash && !force) return;
	lastSpriteWatcherHash = folderHash;

	const sprites: JSONContentPack['sprites'] = [];

	const grouped: Record<string, string[]> = {};
	for (const item of listing) {
		const rel = relative(folder, item).replace(/\\/g, '/');
		const group = rel.split('/')[0]!;
		if (!grouped[group]) grouped[group] = [];
		grouped[group].push(rel);
	}

	const groupKeys = Object.keys(grouped);
	groupKeys.sort();

	for (const groupKey of groupKeys) {
		const group = grouped[groupKey]!;
		sprites.push({
			id: group[0]!,
			label: group[0]!,
			variants: group.map((x) => [
				`http://localhost:${port}/custom_sprites/${x}`,
			]),
		});
	}

	IPC.replacePack({
		version: '2.0',
		packId: 'dddg.desktop.sprites',
		backgrounds: [],
		characters: [],
		colors: [],
		dependencies: [],
		fonts: [],
		poemBackgrounds: [],
		poemStyles: [],
		sprites,
	});
}

async function hashFolder(
	folder: string,
	rec: boolean = false
): Promise<[string[], string]> {
	const sha = crypto.createHmac('sha256', '');
	try {
		const listing = await fsp.readdir(folder);
		const ret: string[] = [];

		for (const item of listing) {
			try {
				const itempath = join(folder, item);
				const stat = await fsp.stat(itempath);
				if (stat.isDirectory()) {
					const [subListing, _subHash] = await hashFolder(itempath, rec);
					ret.push(...subListing);
				} else if (stat.isFile()) {
					ret.push(itempath);
				}
			} catch {}
		}

		return [ret, sha.update(JSON.stringify(ret)).digest('hex')];
	} catch {
		if (rec) return [[], ''];
		log('Making folder', folder);
		await fsp.mkdir(folder, { recursive: true });
		return hashFolder(folder, true);
	}
}
