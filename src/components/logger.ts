import fs from 'fs';
import { logPath } from './constants.js';
import os from 'os';

let initialized = false;
let logFileStream: fs.WriteStream | null = null;

const censored = [os.userInfo().username];

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

export function log(...args: unknown[]) {
	console.log(...args);
	if (!initialized) init();
	writeLog(args.map(normalize).join(' '));
}

export function error(...args: unknown[]) {
	console.error(...args);
	if (!initialized) init();
	writeLog(`ERROR: ${args.map(normalize).join(' ')}`);
}

export function warn(...args: unknown[]) {
	console.warn(...args);
	if (!initialized) init();
	writeLog(`WARN: ${args.map(normalize).join(' ')}`);
}

function normalize(arg: unknown): unknown {
	if (typeof arg === 'object') {
		return JSON.stringify(arg);
	}
	return arg;
}

function censor(str: string): string {
	return censored.reduce(
		(acc, censor) => acc.replace(censor, '[redacted]'),
		str
	);
}

function writeLog(str: string): void {
	if (!logFileStream) return;
	logFileStream.write(`${new Date().toISOString()} - ${censor(str)}\n`);
}
