import { app } from 'electron';
import { join } from 'path';

let contentPath = app.getPath('userData');

export const basePath = contentPath;
export const configPath = join(contentPath, './config.json');
export const configBackupPath = join(contentPath, './config.backup.json');
export const configBrokenPath = join(contentPath, './config.broken.json');
export const logPath = join(contentPath, './lastRun.log');
export const characterPath = join(contentPath, './custom_characters/');
export const backgroundsPath = join(contentPath, './custom_backgrounds/');
export const spritesPath = join(contentPath, './custom_sprites/');
export const localRepoPath = join(contentPath, './localRepo/');

export const depricatedPackages = [
	'concept_femc.shido_draws.edave64',
	'mc.storm_blaze.edave64',
];

export const port = 4716;
