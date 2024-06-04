const { port } = require('./constants');
const { log } = require('./logger');

/**
 * @param {import('@edave64/doki-doki-dialog-generator-pack-format/dist/v2/jsonFormat').JSONContentPack | import('@edave64/doki-doki-dialog-generator-pack-format/dist/v1/jsonFormat').JSONCharacter} pack
 * @param {(path: string) => string} callback
 */
module.exports.walkPackImages = async function walkPackImages(
	pack,
	baseUrl,
	callback
) {
	if (pack.version === '2.0') {
		await walkPackImagesV2(pack, baseUrl, callback);
	} else {
		await walkPackImagesV1(pack, baseUrl, callback);
	}
};

/**
 *
 * @param {import('@edave64/doki-doki-dialog-generator-pack-format/dist/v1/jsonFormat').JSONCharacter<import('@edave64/doki-doki-dialog-generator-pack-format/dist/v1/jsonFormat').JSONHeadCollections>} pack
 * @param {(path: string) => ([string, Promise<void>])} callback
 */
async function walkPackImagesV1(pack, baseUrl, callback) {
	var ctx = {
		paths: {
			'./': './',
			'/': '@assets/',
		},
		packId: pack.packId,
	};
	const loading = [];

	/**
	 * @param {string} base
	 * @param {string} sub
	 */
	function join(base, sub) {
		const ret = joinNormalize(base, sub, ctx);
		log(base, sub, ret);
		return ret;
	}

	/**
	 * @param {string} basePath
	 * @param {string | {img: string, nsfw: boolean;}} value
	 */
	function transformPath(basePath, value) {
		if (value.img) {
			const [path, loader] = callback(join(basePath, value.img));
			loading.push(loader);
			return {
				nsfw: !!value.nsfw,
				img: path,
			};
		} else {
			const [path, loader] = callback(join(basePath, value));
			loading.push(loader);
			return path;
		}
	}

	const baseFolder = join(baseUrl, pack.folder);
	delete pack.folder;

	if (pack.chibi) {
		const [path, loader] = callback(join(baseFolder, pack.chibi));
		pack.chibi = path;
		loading.push(loader);
	}
	if (pack.eyes) {
		for (const key in pack.eyes) {
			const [path, loader] = callback(join(baseFolder, pack.eyes[key]));
			pack.eyes[key] = path;
			loading.push(loader);
		}
	}
	if (pack.hairs) {
		for (const key in pack.hairs) {
			const [path, loader] = callback(join(baseFolder, pack.hairs[key]));
			pack.hairs[key] = path;
			loading.push(loader);
		}
	}
	if (pack.heads) {
		for (const key in pack.heads) {
			let headGroup = pack.heads[key];
			let headFolder = baseFolder;

			if (headGroup.all) {
				log('Head group folder', key, headGroup.folder);
				headFolder = join(baseFolder, headGroup.folder);
				headGroup = headGroup.all;
			}
			delete headGroup.folder;

			for (let i = 0; i < headGroup.length; ++i) {
				headGroup[i] = transformPath(headFolder, headGroup[i]);
			}
		}
	}
	if (pack.poses) {
		for (const pose of pack.poses) {
			const poseFolder = join(baseFolder, pose.folder);
			delete pose.folder;
			if (pose.static) {
				pose.static = transformPath(poseFolder, pose.static);
			}
			if (pose.variant) {
				for (let i = 0; i < pose.variant.length; ++i) {
					pose.variant[i] = transformPath(poseFolder, pose.variant[i]);
				}
			}
			if (pose.left) {
				for (let i = 0; i < pose.left.length; ++i) {
					pose.left[i] = transformPath(poseFolder, pose.left[i]);
				}
			}
			if (pose.right) {
				for (let i = 0; i < pose.right.length; ++i) {
					pose.right[i] = transformPath(poseFolder, pose.right[i]);
				}
			}
		}
	}

	await Promise.all(loading);
}

/**
 *
 * @param {import('@edave64/doki-doki-dialog-generator-pack-format/dist/v2/jsonFormat').JSONContentPack} pack
 * @param {(path: string) => (string | Promise<string>)} callback
 */
async function walkPackImagesV2(pack, baseUrl, callback) {
	var ctx = {
		paths: {
			'./': baseUrl,
			'/': 'http://localhost:' + port + '/assets/',
		},
		packId: pack.packId,
	};
	const loading = [];

	/**
	 * @param {string} base
	 * @param {string} sub
	 * @returns {string}
	 */
	function join(base, sub) {
		return joinNormalize(base, sub, ctx);
	}

	/**
	 * @param {string[]} spriteCollection
	 */
	async function migrateSpriteCollection(baseUrl, spriteCollection) {
		for (let i = 0; i < spriteCollection.length; ++i) {
			const [path, loader] = callback(join(baseUrl, spriteCollection[i]));
			spriteCollection[i] = path;
			loading.push(loader);
		}
	}

	/**
	 * @param {string[][]} spriteList
	 */
	async function migrateSpriteList(baseUrl, spriteList) {
		spriteList.map((x) => migrateSpriteCollection(baseUrl, x));
	}

	const baseFolder = join(baseUrl, pack.folder);

	if (pack.backgrounds) {
		for (const background of pack.backgrounds) {
			const bgFolder = join(baseFolder, background.folder);
			delete background.folder;
			migrateSpriteList(bgFolder, background.variants);
		}
	}

	if (pack.sprites) {
		for (const sprite of pack.sprites) {
			const spriteFolder = join(baseFolder, sprite.folder);
			delete sprite.folder;
			migrateSpriteList(spriteFolder, sprite.variants);
		}
	}

	if (pack.fonts) {
		for (const font of pack.fonts) {
			const fontFolder = join(baseFolder, font.folder);
			delete font.folder;
			migrateSpriteCollection(fontFolder, font.files);
		}
	}

	if (pack.poemBackgrounds) {
		for (const poemBackground of pack.poemBackgrounds) {
			const poemBgFolder = join(baseFolder, poemBackground.folder);
			delete poemBackground.folder;
			migrateSpriteCollection(poemBgFolder, poemBackground.images);
		}
	}

	if (pack.characters) {
		for (const character of pack.characters) {
			const charFolder = join(baseFolder, character.folder);
			delete character.folder;

			if (character.chibi) {
				const [path, loader] = callback(join(charFolder, character.chibi));
				pack.chibi = path;
				loading.push(loader);
			}

			if (character.heads) {
				for (const key in character.heads) {
					const head = character.heads[key];
					if (head.variants) {
						const headFolder = join(charFolder, head.folder);
						delete head.folder;
						migrateSpriteList(headFolder, head.variants);
					} else {
						migrateSpriteList(charFolder, head);
					}
				}
			}

			if (character.styleGroups) {
				for (const styleGroup of character.styleGroups) {
					const styleGroupFolder = join(charFolder, styleGroup.folder);
					delete styleGroup.folder;

					if (styleGroup.styleComponents) {
						for (const styleComponent of styleGroup.styleComponents) {
							for (const key in styleComponent.variants) {
								const [path, loader] = callback(
									join(styleGroupFolder, styleComponent.variants[key])
								);
								styleComponent.variants[key] = path;
								loading.push(loader);
							}
						}
					}

					if (styleGroup.styles) {
						for (const style of styleGroup.styles) {
							const styleFolder = join(styleGroupFolder, style.folder);
							delete style.folder;
							if (style.poses) {
								for (const pose of style.poses) {
									const poseFolder = join(styleFolder, pose.folder);
									delete pose.folder;
									if (pose.renderCommands) {
										for (const renderCommand of pose.renderCommands) {
											if (renderCommand.type === 'image') {
												migrateSpriteCollection(
													poseFolder,
													renderCommand.images
												);
											}
										}
									}
									if (pose.positions) {
										for (const posKey in pose.positions) {
											migrateSpriteList(poseFolder, pose.positions[posKey]);
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
	await Promise.all(loading);
}

/**
 * @param {string} path
 * @returns {boolean}
 */
function isWebUrl(path) {
	return (
		path.startsWith('blob:') ||
		path.startsWith('http://') ||
		path.startsWith('https://') ||
		path.startsWith('://')
	);
}

/**
 * @param {string} base
 * @param {string | undefined} sub
 * @param {{ paths: { [a: string]: string } }} ctx
 * @returns {string}
 */
function joinNormalize(base, sub, ctx) {
	if (!sub) return base;

	for (const path in ctx.paths) {
		if (sub.startsWith(path)) {
			return ctx.paths[path] + sub.slice(path.length);
		}
	}
	if (isWebUrl(sub)) return sub;
	return base + sub;
}
