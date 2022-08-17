const fs = require('fs');
const path = require('path');
const constants = require('./constants');
const { configPath, basePath } = require('./constants');

const baseConfig = {
	downloadPath: path.join(basePath, './panels/'),
	autoUpdateCheck: true,
	autoLoad: [],
	skipDeprication: [],
};

let readConfig = null;

module.exports = {
	/**
	 * @returns {{ downloadPath: string, autoUpdateCheck: boolean, autoLoad: string[], skipDeprication: string[] }}
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
			if (readConfig.autoLoad) {
				// Filter out depricated autoloads
				readConfig.autoLoad = readConfig.autoLoad.filter((autoload) => {
					const throwOut =
						constants.depricatedPackages.includes(autoload) &&
						!readConfig.skipDeprication.includes(autoload);
					if (throwOut) {
						console.log(
							`Package ${autoload} is depricated and removed from auto loading list.`
						);
					}
					return !throwOut;
				});
			}
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
