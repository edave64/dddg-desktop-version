const path = require('path');
const fs = require('fs');
const { logPath } = require('./constants');

let initialized = false;
let logFileStream = null;

const censored = [require('os').userInfo().username];

function init() {
	initialized = true;
	try {
		logFileStream = fs.createWriteStream(logPath, {
			encoding: 'utf8',
			flags: 'w',
		});
	} catch (e) {
		error('Failed to open log file!', e);
	}
}

const Logger = {
	log(...args) {
		console.log(...args);
		if (!initialized) init();
		writeLog(args.map(normalize).join(' '));
	},
	error(...args) {
		console.error(...args);
		if (!initialized) init();
		writeLog(`ERROR: ${args.map(normalize).join(' ')}`);
	},
	warn(...args) {
		console.warn(...args);
		if (!initialized) init();
		writeLog(`WARN: ${args.map(normalize).join(' ')}`);
	},
};

function normalize(arg) {
	if (typeof arg === 'object') {
		return JSON.stringify(arg);
	}
	return arg;
}

function censor(str) {
	return censored.reduce(
		(acc, censor) => acc.replace(censor, '[redacted]'),
		str
	);
}

/**
 *
 * @param {string} str
 */
function writeLog(str) {
	if (!logFileStream) return;
	logFileStream.write(`${new Date().toISOString()} - ${censor(str)}\n`);
}

module.exports = Logger;
