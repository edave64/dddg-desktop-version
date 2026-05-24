import fs from 'fs';
import path from 'path';
import * as constants from './constants.js';
import {
	configPath,
	configBackupPath,
	configBrokenPath,
	basePath,
} from './constants.js';
import IPC from './ipc.js';
import { warn, error, log } from './logger.js';

const baseConfig = {
	downloadPath: path.join(basePath, './panels/'),
	savesPath: path.join(basePath, './saves/'),
	defaultSavePath: path.join(basePath, './default-save/'),
	autoUpdateCheck: true,
	autoLoad: [],
	skipDeprication: [],
};

let readConfig = null;

/**
 * Set when the primary config file could not be loaded, and the backup was used.
 * If this is set the backup shall not be overwritten when the config is saved, to preserve the
 * known working state.
 */
let preserveConfigBackup = false;

/**
 * @returns {{ downloadPath: string, autoUpdateCheck: boolean, autoLoad: string[], skipDeprication: string[], defaultSavePath: string, savesPath: string }}
 */
export function getConfig() {
	if (!readConfig) {
		readConfig = baseConfig;
		let configSuccess = false;
		for (let retry = 0; retry < 5; ++retry) {
			try {
				const content = fs.readFileSync(configPath);
				readConfig = {
					...readConfig,
					...JSON.parse(content),
				};
				configSuccess = true;
				break;
			} catch (e) {
				if (e.code === 'ENOENT') {
					// File doesn't exist. This is a valid state, nothing to warn about
					break;
				}
				warn(`Failed to load config. (Attempt ${retry + 1})`, e);
			}
		}
		if (!configSuccess) {
			warn('Failed to load config. Try to restore from backup.');
			try {
				const content = fs.readFileSync(configBackupPath);
				readConfig = {
					...readConfig,
					...JSON.parse(content),
				};
				preserveConfigBackup = true;
				try {
					// Copy config file for error reporting
					fs.copyFileSync(
						configPath,
						configBrokenPath,
						fs.constants.COPYFILE_FICLONE
					);
				} catch (e) {
					// Unimportant
				}
				IPC.pushMessage(
					'Config restored from backup. Some settings may have been lost.'
				);
			} catch (e) {
				error('Failed to load config backup. Using default config.');
			}
		}
		if (readConfig.autoLoad) {
			// Filter out depricated autoloads
			readConfig.autoLoad = readConfig.autoLoad.filter((autoload) => {
				const throwOut =
					constants.depricatedPackages.includes(autoload) &&
					!readConfig.skipDeprication.includes(autoload);
				if (throwOut) {
					log(
						`Package ${autoload} is depricated and removed from auto loading list.`
					);
				}
				return !throwOut;
			});
		}
	}
	return readConfig;
}

export function saveConfig() {
	if (!readConfig) return;
	if (!preserveConfigBackup) {
		// Backup the config file
		try {
			fs.copyFileSync(
				configPath,
				configBackupPath,
				fs.constants.COPYFILE_FICLONE
			);
		} catch (e) {
			error('Failed to backup config!', e);
		}
	}
	fs.writeFile(configPath, JSON.stringify(readConfig, undefined, 4), (err) => {
		if (err) {
			error('Failed to save config!', err);
		}
	});
}
