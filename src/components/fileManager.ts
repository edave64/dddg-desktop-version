import childProcess from 'child_process';
import process from 'process';
import path from 'path';
import { log } from './logger.js';

export function openInExplorer(pathToOpen: string) {
	let command = null;
	let args = [];
	switch (process.platform) {
		case 'darwin':
			command = 'open';
			args = ['-R', pathToOpen];
			break;
		case 'win32':
			args = [`${path.join(pathToOpen, '.')}`];

			if (process.env.SystemRoot)
				command = path.join(process.env.SystemRoot, 'explorer.exe');
			else command = 'explorer.exe';
			break;
		default:
			command = 'xdg-open';
			args = [pathToOpen];
			break;
	}
	if (!command) return;
	log('Executing command', command, args);
	childProcess.execFile(command, args);
}
