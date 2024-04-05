const { join, relative } = require('path');

const config = require('./config');
const fs = require('fs');
const fsp = fs.promises;
const crypto = require('crypto');

const IPC = require('./ipc');
const { backgroundsPath, spritesPath, port } = require('./constants');

let lastBackgroundWatcherHash = null;
let lastSpriteWatcherHash = null;

const currentConfig = config.getConfig();

module.exports.triggerBackgroundWatcher = async function (force) {
	const folder = backgroundsPath;
	const [listing, folderHash] = await hashFolder(folder);
	if (folderHash === lastBackgroundWatcherHash && !force) return;
	lastBackgroundWatcherHash = folderHash;

	const backgrounds = [];

	const grouped = {};
	for (const item of listing) {
		const rel = relative(folder, item).replace(/\\/g, '/');
		const group = rel.split('/')[0];
		if (!grouped[group]) grouped[group] = [];
		grouped[group].push(rel);
	}

	const groupKeys = Object.keys(grouped);
	groupKeys.sort();

	for (const groupKey of groupKeys) {
		const group = grouped[groupKey];
		backgrounds.push({
			id: group[0],
			label: group[0],
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
};

module.exports.triggerSpriteWatcher = async function (force) {
	const folder = spritesPath;
	const [listing, folderHash] = await hashFolder(folder);
	if (folderHash === lastSpriteWatcherHash && !force) return;
	lastSpriteWatcherHash = folderHash;

	const sprites = [];

	const grouped = {};
	for (const item of listing) {
		const rel = relative(folder, item).replace(/\\/g, '/');
		const group = rel.split('/')[0];
		if (!grouped[group]) grouped[group] = [];
		grouped[group].push(rel);
	}

	const groupKeys = Object.keys(grouped);
	groupKeys.sort();

	for (const groupKey of groupKeys) {
		const group = grouped[groupKey];
		sprites.push({
			id: group[0],
			label: group[0],
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
};

/**
 * @param {*} folder
 * @returns
 */
async function hashFolder(folder, rec) {
	const sha = crypto.createHmac('sha256', '');
	try {
		const listing = await fsp.readdir(folder);
		const ret = [];

		for (const item of listing) {
			try {
				const itempath = join(folder, item);
				const stat = await fsp.stat(itempath);
				if (stat.isDirectory()) {
					const [subListing, subHash] = hashFolder(itempath);
					ret.push(...subListing);
				} else if (stat.isFile) {
					ret.push(itempath);
				}
			} catch (e) {}
		}

		return [ret, sha.update(JSON.stringify(ret)).digest('hex')];
	} catch (e) {
		if (rec) return [[], 0];
		console.log('Making folder', folder);
		await fsp.mkdir(folder, { recursive: true });
		return hashFolder(folder, true);
	}
}
