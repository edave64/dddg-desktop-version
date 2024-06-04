const { app } = require('electron');
const { join } = require('path');

let contentPath = app.getPath('userData');

module.exports = Object.freeze({
	basePath: contentPath,
	configPath: join(contentPath, './config.json'),
	configBackupPath: join(contentPath, './config.backup.json'),
	configBrokenPath: join(contentPath, './config.broken.json'),
	logPath: join(contentPath, './lastRun.log'),
	characterPath: join(contentPath, './custom_characters/'),
	backgroundsPath: join(contentPath, './custom_backgrounds/'),
	spritesPath: join(contentPath, './custom_sprites/'),
	localRepoPath: join(contentPath, './localRepo/'),

	depricatedPackages: [
		'concept_femc.shido_draws.edave64',
		'mc.storm_blaze.edave64',
	],

	port: 4716,
});
