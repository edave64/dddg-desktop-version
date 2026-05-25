import IPC from './ipc.js';
import { dirname, join, basename } from 'path';
import { localRepoPath, port } from './constants.js';
import http from 'https';
import fs from 'fs';
import crypto from 'crypto';
import { deleteAsync } from 'del';

import { walkPackImages } from './packHelpers.js';

import AwaitLock from 'await-lock';
import { error } from './logger.js';

const fsp = fs.promises;

const contentPackLock = new AwaitLock();

export async function deleteIncompleteInstalls() {
	await contentPackLock.acquireAsync();
	try {
		const uninstalls: Promise<void>[] = [];
		const dirs = await fsp.readdir(localRepoPath);
		await Promise.all(
			dirs.map(async (dir) => {
				const repoDir = join(localRepoPath, dir);
				try {
					// If that file exists, we didn't get to finish installing the content pack
					// delete it, just to be safe.
					const a = join(repoDir, '.incomplete');
					await fsp.stat(a);
					uninstalls.push(
						(async () => {
							try {
								await deleteAsync(repoDir, { force: true });
							} catch (e) {
								error(e);
							}
						})()
					);
				} catch (e) {}
			})
		);
		await Promise.all(uninstalls);
	} finally {
		contentPackLock.release();
	}
}

export async function installContentPack(
	url: string,
	repoEntry: any,
	authors: any
) {
	await contentPackLock.acquireAsync();
	try {
		let response: string;
		try {
			if (url.startsWith('/')) {
				url = 'http://localhost:3000' + url;
			}
			response = await new Promise((resolve, reject) => {
				const request = http.get(url);
				request.on('response', (response) => {
					let data = '';

					// A chunk of data has been received.
					response.on('data', (chunk) => {
						data += chunk;
					});

					// The whole response has been received. Print out the result.
					response.on('end', () => {
						resolve(data);
					});

					response.on('error', (err) => reject(err));
				});
				request.on('error', (err) => reject(err));
			});
		} catch (e: any) {
			throw new Error('Could not fetch content pack: ' + e.message);
		}
		let json;
		try {
			json = JSON.parse(response);
		} catch (e: any) {
			throw new Error('Cannot parse json: ' + e.message);
		}
		const baseFetch = dirname(url);
		const baseTarget = join(localRepoPath, join('/', json.packId));
		const incompleteMarker = join(baseTarget, '.incomplete');
		const indexPath = join(baseTarget, './index.json');
		const repoPath = join(baseTarget, './repo.json');
		const localRepoUrl = `.`;

		try {
			// If there is a valid pack with an incomplete marker, just remove it and you are done
			await Promise.all([fsp.stat(indexPath), fsp.stat(repoPath)]);
			await fsp.unlink(incompleteMarker);
			IPC.reloadLocalRepo();
			return;
		} catch (e) {}

		await fsp.mkdir(baseTarget, { recursive: true });
		await fsp.writeFile(incompleteMarker, '');

		const translationCache: Record<string, string> = {};

		const walker = (path: string) => {
			const ret = importImage(baseFetch, baseTarget, path);
			translationCache[path] = ret[0];
			return ret;
		};

		await walkPackImages(json, './', walker);

		delete repoEntry.dddg1Path;
		delete repoEntry.ddcc2Path;
		repoEntry.dddg2Path = `${localRepoUrl}/index.json`;
		const thumbnailImageLoaders: Promise<void>[] = [];

		function translateImage(image: string) {
			if (image.startsWith(baseFetch)) {
				image = './' + image.substr(baseFetch.length);
			}
			if (translationCache[image]) {
				return `${localRepoUrl}/${translationCache[image]!.substring(2).replace(
					/\\/g,
					'/'
				)}`;
			}

			const ret = importImage(baseFetch, baseTarget, image);
			thumbnailImageLoaders.push(ret[1]);
			return `${localRepoUrl}/${ret[0].substring(2).replace(/\\/g, '/')}`;
		}

		if (repoEntry.preview) {
			for (let i = 0; i < repoEntry.preview.length; ++i) {
				repoEntry.preview[i] = translateImage(repoEntry.preview[i]);
			}
		}

		await Promise.all(thumbnailImageLoaders);

		await Promise.all([
			fsp.writeFile(indexPath, JSON.stringify(json, undefined, 4), {
				encoding: 'utf8',
			}),
			fsp.writeFile(
				repoPath,
				JSON.stringify(
					{
						pack: repoEntry,
						authors: authors,
					},
					undefined,
					4
				),
				{ encoding: 'utf8' }
			),
		]);
		await fsp.unlink(incompleteMarker);
		IPC.reloadLocalRepo();
	} finally {
		contentPackLock.release();
	}
}

export async function queueUninstallContentPack(packId: string): Promise<void> {
	const baseTarget = join(localRepoPath, join('/', packId));
	const incompleteMarker = join(baseTarget, '.incomplete');
	await fsp.writeFile(incompleteMarker, '');
	IPC.reloadLocalRepo();
}

function importImage(
	packBaseUrl: string,
	packBasePath: string,
	path: string
): [string, Promise<void>] {
	// Images in the assets folder are simply redirected
	// TODO: Perhaps check if the target exists first, in case
	if (path.startsWith('@assets/'))
		return [
			`http://localhost:${port}/assets/` + path.substr('@assets/'.length),
			Promise.resolve(),
		];

	if (path === './') debugger;
	const isInBaseUrl = path.startsWith('./');

	const requestUrl = isInBaseUrl ? packBaseUrl + path.substr(1) : path;
	const sha256 = crypto.createHash('sha256');
	const retPath = isInBaseUrl
		? '.' + join('/', path).replace(/\\/g, '/')
		: `./$external/${sha256.update(path).digest('hex')}_${basename(path)}`;
	const targetPath = join(packBasePath, retPath);

	return [
		retPath,
		new Promise(async (resolve, reject) => {
			try {
				const query = http.get(requestUrl);

				await fsp.mkdir(dirname(targetPath), { recursive: true });
				const stream = fs.createWriteStream(targetPath, { flags: 'w' });

				stream.on('error', (err) => {
					reject(err);
				});

				query.on('response', (response) => {
					response.pipe(stream);
					stream.on('finish', () => {
						if (response.statusCode !== 200) {
							reject(
								`Resource '${requestUrl}' could not be loaded. (Responded with code ${response.statusCode})`
							);
						}
						resolve();
					});
					stream.on('error', (err) => reject(err));
				});
				query.on('error', (err) => reject(err));
			} catch (e) {
				reject(e);
			}
		}),
	];
}

type PathData = {
	baseFetch: string;
	baseTarget: string;
	externalTarget: string;
	paths: Record<string, string>;
};
