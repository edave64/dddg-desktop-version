const { app } = require('electron');
const { statSync } = require('fs');
const { join } = require('path');

let contentPath = app.getPath('userData');

console.log('basePath', contentPath);

module.exports = Object.freeze({
	basePath: contentPath,
	configPath: join(contentPath, './config.json'),
	characterPath: join(contentPath, './custom_characters/'),
	backgroundsPath: join(contentPath, './custom_backgrounds/'),
	spritesPath: join(contentPath, './custom_sprites/'),
	localRepoPath: join(contentPath, './localRepo/'),

	port: 4716,
});
