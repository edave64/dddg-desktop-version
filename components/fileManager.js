const childProcess = require('child_process');
const process = require('process');
const path = require('path');

module.exports = function openInExplorer(pathToOpen) {
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
	console.log('Executing command', command, args);
	childProcess.execFile(command, args);
};
