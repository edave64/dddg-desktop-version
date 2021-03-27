const fs = require('fs');
const path = require('path');
const { configPath } = require('./constants');

const baseConfig = {
	downloadPath: path.join(__dirname, '../panels/'),
	autoUpdateCheck: true,
	autoLoad: [],
};

let readConfig = null;

module.exports = {
	/**
	 * @returns {{ downloadPath: string, autoUpdateCheck: boolean, autoLoad: string[] }}
	 */
	getConfig() {
		if (!readConfig) {
			readConfig = baseConfig;
			try {
				const content = fs.readFileSync(configPath);
				readConfig = {
					...readConfig,
					...JSON.parse(content),
				};
			} catch (e) {}
		}
		return readConfig;
	},
	saveConfig() {
		if (!readConfig) return;
		fs.writeFile(
			configPath,
			JSON.stringify(readConfig, undefined, 4),
			(err) => {}
		);
	},
};
