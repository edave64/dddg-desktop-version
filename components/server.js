const express = require('express');
const constants = require('./constants');
const { port } = require('./constants');
const { join } = require('path');
//const proxy = require('http-proxy-middleware');
const fs = require('fs');
const deepmerge = require('deepmerge');
const { getConfig } = require('./config');
const IPC = require('./ipc');
const { queueUninstallContentPack } = require('./packManager');
const server = express();

const warnedAbout = new Set();

const fsp = fs.promises;

/**
 * @returns {Promise<{ pack: Object, authors: { [author: string]: Object } }[]>}
 */
async function loadRepoFiles() {
	let folders = [];
	try {
		folders = await fsp.readdir(constants.localRepoPath);
	} catch (e) {
		console.log('local repo path does not exist');
	}
	console.log('localrepo folders', folders);
	const conf = getConfig();
	const ignore = constants.depricatedPackages.filter(
		(id) => !conf.skipDeprication.includes(id)
	);
	console.log('ignore', ignore);

	return (
		await Promise.all(
			folders.map(async (folder) => {
				try {
					const packFolder = join(constants.localRepoPath, folder);
					try {
						await fsp.stat(join(packFolder, '.incomplete'));
						console.log('Skipping', packFolder);
						return null;
					} catch (e) {}
					const repoFile = await fsp.readFile(join(packFolder, 'repo.json'));
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
						json.pack.preview = json.pack.preview.map((preview) => {
							return new URL(preview, folderUrl).href;
						});
					}
					return json;
				} catch (e) {
					console.log('No repo', folder, e);
					return null;
				}
			})
		)
	).filter((x) => x);
}

server.use('/repo', express.static(constants.localRepoPath));
server.use('/repo/repo.json', async (req, res) => {
	try {
		const files = await loadRepoFiles();
		res.json(files.map((p) => p.pack));
	} catch (e) {
		console.log(e);
		res.status(500).send();
	}
});
server.use('/repo/people.json', async (req, res) => {
	try {
		const files = await loadRepoFiles();
		let authors = {};
		console.log(files);

		for (const file of files) {
			authors = deepmerge(authors, file.authors);
		}

		res.json(authors);
	} catch (e) {
		console.log(e);
		res.status(500).send();
	}
});
server.use('/custom_backgrounds', express.static(constants.backgroundsPath));
server.use('/custom_sprites', express.static(constants.spritesPath));
server.use(express.static(join(__dirname, '../dddgWeb/')));
/*server.use(
 proxy.createProxyMiddleware('/', { target: 'http://localhost:3000/' })
);*/

var serverLoaded;

module.exports = {
	start() {
		server.listen(port, () => {
			server_ready = true;
			serverLoaded();
		});
	},
	isReady: new Promise((resolve, reject) => {
		serverLoaded = resolve;
	}),
};
