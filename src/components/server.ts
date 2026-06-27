import express from 'express';
import * as constants from './constants.js';
import { port } from './constants.js';
import { join } from 'path';
import fs from 'fs';
import deepmerge from 'deepmerge';
import { getConfig } from './config.js';
import IPC from './ipc.js';
import { queueUninstallContentPack } from './packManager.js';
import { log } from './logger.js';

const warnedAbout = new Set();

const fsp = fs.promises;

async function loadRepoFiles(): Promise<
	{ pack: Object; authors: { [author: string]: Object } }[]
> {
	let folders: string[] = [];
	try {
		folders = await fsp.readdir(constants.localRepoPath);
	} catch {
		log('local repo path does not exist');
	}
	log('localrepo folders', folders);
	const conf = getConfig();
	const ignore = constants.depricatedPackages.filter(
		(id) => !conf.skipDeprication.includes(id)
	);
	log('ignore', ignore);

	return (
		await Promise.all(
			folders.map(async (folder) => {
				const lowerFolder = folder.toLowerCase();
				if (lowerFolder === '.ds_store') return null;
				if (lowerFolder === 'desktop.ini') return null;

				try {
					const packFolder = join(constants.localRepoPath, folder);
					try {
						await fsp.stat(join(packFolder, '.incomplete'));
						log('Skipping', packFolder);
						return null;
					} catch (e) {}
					const repoFile = await fsp.readFile(
						join(packFolder, 'repo.json'),
						'utf8'
					);
					const folderUrl = `http://localhost:${constants.port}/repo/${folder}/`;
					const json = JSON.parse(repoFile);
					const id = json.pack.id;
					if (ignore.includes(id)) {
						if (warnedAbout.has(id)) return null;
						IPC.resolvableError(
							`The installed pack ${id} is depricated. Do you want to delete it?`,
							['Delete', 'Dismiss']
						).then((action) => {
							if (action === 'Delete') {
								queueUninstallContentPack(id);
							}
						});
						warnedAbout.add(id);
						return null;
					}
					if (!json.pack.dddg2Path) {
						json.pack.dddg2Path = `${folderUrl}index.json`;
					} else {
						json.pack.dddg2Path = new URL(json.pack.dddg2Path, folderUrl).href;
					}
					if (json.pack.preview) {
						json.pack.preview = json.pack.preview.map((preview: string) => {
							return new URL(preview, folderUrl).href;
						});
					}
					return json;
				} catch (e) {
					log('No repo', folder, e);
					return null;
				}
			})
		)
	).filter((x) => x);
}

const server = express();

server.use('/repo', express.static(constants.localRepoPath));
server.use('/repo/repo.json', async (req, res) => {
	try {
		const files = await loadRepoFiles();
		res.json(files.map((p) => p.pack));
	} catch (e) {
		log(e);
		res.status(500).send();
	}
});
server.use('/repo/people.json', async (req, res) => {
	try {
		const files = await loadRepoFiles();
		let authors = {};
		log(files);

		for (const file of files) {
			authors = deepmerge(authors, file.authors ?? {});
		}

		res.json(authors);
	} catch (e) {
		log(e);
		res.status(500).send();
	}
});
server.use('/custom_backgrounds', express.static(constants.backgroundsPath));
server.use('/custom_sprites', express.static(constants.spritesPath));
server.use(express.static(join(import.meta.dirname, '../../dddgWeb/')));
/*server.use(
 proxy.createProxyMiddleware('/', { target: 'http://localhost:3000/' })
);*/

var { promise, resolve, reject } = Promise.withResolvers<void>();

export default {
	start() {
		server.listen(port, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	},
	isReady: promise,
};
