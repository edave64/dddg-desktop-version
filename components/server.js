const express = require('express');
const constants = require('./constants');
const { port } = require('./constants');
const { join } = require('path');
const http = require('http');
const fs = require('fs');
const deepmerge = require('deepmerge');
const server = express();

const fsp = fs.promises;

/**
 * @returns {Promise<{ pack: Object, authors: { [author: string]: Object } }[]>}
 */
async function loadRepoFiles() {
	const folders = await fsp.readdir(constants.localRepoPath);
	console.log('localrepo folders', folders);

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
					return JSON.parse(repoFile);
				} catch (e) {
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
/*server.all('/*', function (req, res) {
	http
		.request({
			hostname: 'localhost',
			port: 8080,
			path: req.params[0],
			search: req.query,
			method: req.method,
		})
		.on('response', (res) => {
			req.pipe(res);
		});
});*/

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
