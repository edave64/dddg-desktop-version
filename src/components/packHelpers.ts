import { port } from './constants.js';
import { log } from './logger.js';

import type { JSONContentPack as V2Json } from '@edave64/doki-doki-dialog-generator-pack-format/dist/v2/jsonFormat.js';
import type { JSONCharacter as V1Json } from '@edave64/doki-doki-dialog-generator-pack-format/dist/v1/jsonFormat.js';
import type { NsfwAbleImg } from '@edave64/doki-doki-dialog-generator-pack-format/dist/v1/model.js';

export async function walkPackImages(
	pack: V2Json | V1Json<any>,
	baseUrl: string,
	callback: (path: string) => [string, Promise<void>]
) {
	if ('version' in pack) {
		await walkPackImagesV2(pack, baseUrl, callback);
	} else {
		await walkPackImagesV1(pack, baseUrl, callback);
	}
}

async function walkPackImagesV1(
	pack: V1Json<any>,
	baseUrl: string,
	callback: (path: string) => [string, Promise<void>]
) {
	var ctx = {
		paths: {
			'./': './',
			'/': '@assets/',
		},
		packId: pack.packId,
	};
	const loading = [];

	function join(base: string, sub: string) {
		const ret = joinNormalize(base, sub, ctx);
		log(base, sub, ret);
		return ret;
	}

	function transformPath<T extends string | NsfwAbleImg>(
		basePath: string,
		value: T
	): T {
		if (typeof value === 'object') {
			const [path, loader] = callback(join(basePath, value.img));
			loading.push(loader);
			//@ts-expect-error: TS doesn't get it, but this should be fine
			return {
				nsfw: !!value.nsfw,
				img: path,
			};
		} else {
			const [path, loader] = callback(join(basePath, value));
			loading.push(loader);
			//@ts-expect-error: TS doesn't get it, but this should be fine
			return path;
		}
	}

	const baseFolder = join(baseUrl, pack.folder!);
	delete pack.folder;

	if (pack.chibi) {
		const [path, loader] = callback(join(baseFolder, pack.chibi));
		pack.chibi = path!;
		loading.push(loader);
	}
	if (pack.eyes) {
		for (const key in pack.eyes) {
			const [path, loader] = callback(join(baseFolder, pack.eyes[key]!));
			pack.eyes[key] = path;
			loading.push(loader);
		}
	}
	if (pack.hairs) {
		for (const key in pack.hairs) {
			const [path, loader] = callback(join(baseFolder, pack.hairs[key]!));
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
			const poseFolder = join(baseFolder, pose.folder!);
			delete pose.folder;
			if ('static' in pose) {
				pose.static = transformPath(poseFolder, pose.static);
			}
			if ('variant' in pose) {
				pose.variant = pose.variant.map((v) => transformPath(poseFolder, v!));
			}
			if ('left' in pose) {
				pose.left = pose.left.map((v) => transformPath(poseFolder, v!));
			}
			if ('right' in pose) {
				pose.right = pose.right.map((v) => transformPath(poseFolder, v!));
			}
		}
	}

	await Promise.all(loading);
}

async function walkPackImagesV2(
	pack: V2Json,
	baseUrl: string,
	callback: (path: string) => [string, Promise<void>]
) {
	var ctx = {
		paths: {
			'./': baseUrl,
			'/': 'http://localhost:' + port + '/assets/',
		},
		packId: pack.packId,
	};
	const loading = [];

	function join(base: string, sub: string): string {
		return joinNormalize(base, sub, ctx);
	}

	async function migrateSpriteCollection(
		baseUrl: string,
		spriteCollection: string[]
	) {
		for (let i = 0; i < spriteCollection.length; ++i) {
			const [path, loader] = callback(join(baseUrl, spriteCollection[i]!));
			spriteCollection[i] = path;
			loading.push(loader);
		}
	}

	async function migrateSpriteList(baseUrl: string, spriteList: string[][]) {
		spriteList.map((x) => migrateSpriteCollection(baseUrl, x));
	}

	const baseFolder = join(baseUrl, pack.folder!);

	if (pack.backgrounds) {
		for (const background of pack.backgrounds) {
			const bgFolder = join(baseFolder, background.folder!);
			delete background.folder;
			migrateSpriteList(bgFolder, background.variants);
		}
	}

	if (pack.sprites) {
		for (const sprite of pack.sprites) {
			const spriteFolder = join(baseFolder, sprite.folder!);
			delete sprite.folder;
			migrateSpriteList(spriteFolder, sprite.variants);
		}
	}

	if (pack.fonts) {
		for (const font of pack.fonts) {
			const fontFolder = join(baseFolder, font.folder!);
			delete font.folder;
			migrateSpriteCollection(fontFolder, font.files);
		}
	}

	if (pack.poemBackgrounds) {
		for (const poemBackground of pack.poemBackgrounds) {
			const poemBgFolder = join(baseFolder, poemBackground.folder!);
			delete poemBackground.folder;
			migrateSpriteCollection(poemBgFolder, poemBackground.images);
		}
	}

	if (pack.characters) {
		for (const character of pack.characters) {
			const charFolder = join(baseFolder, character.folder!);
			delete character.folder;

			if (character.chibi) {
				const [path, loader] = callback(join(charFolder, character.chibi));
				character.chibi = path;
				loading.push(loader);
			}

			if (character.heads) {
				for (const key in character.heads) {
					const head = character.heads[key]!;
					if ('variants' in head) {
						const headFolder = join(charFolder, head.folder!);
						delete head.folder;
						migrateSpriteList(headFolder, head.variants);
					} else {
						migrateSpriteList(charFolder, head);
					}
				}
			}

			if (character.styleGroups) {
				for (const styleGroup of character.styleGroups) {
					const styleGroupFolder = join(charFolder, styleGroup.folder!);
					delete styleGroup.folder;

					if (styleGroup.styleComponents) {
						for (const styleComponent of styleGroup.styleComponents) {
							for (const key in styleComponent.variants) {
								const [path, loader] = callback(
									join(styleGroupFolder, styleComponent.variants[key]!)
								);
								styleComponent.variants[key] = path;
								loading.push(loader);
							}
						}
					}

					if (styleGroup.styles) {
						for (const style of styleGroup.styles) {
							const styleFolder = join(styleGroupFolder, style.folder!);
							delete style.folder;
							if (style.poses) {
								for (const pose of style.poses) {
									const poseFolder = join(styleFolder, pose.folder!);
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
											migrateSpriteList(poseFolder, pose.positions[posKey]!);
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

function isWebUrl(path: string): boolean {
	return (
		path.startsWith('blob:') ||
		path.startsWith('http://') ||
		path.startsWith('https://') ||
		path.startsWith('://')
	);
}

function joinNormalize(
	base: string,
	sub: string | undefined,
	ctx: { paths: { [a: string]: string } }
): string {
	if (!sub) return base;

	for (const path in ctx.paths) {
		if (sub.startsWith(path)) {
			return ctx.paths[path] + sub.slice(path.length);
		}
	}
	if (isWebUrl(sub)) return sub;
	return base + sub;
}
