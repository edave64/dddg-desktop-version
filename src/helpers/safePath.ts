import { join } from 'path';

/**
 * Takes a base directory and a list of path segments, and returns a path that is relative to the
 * base directory.
 *
 * All paths returned will be inside the base directory. You cannot break out of it with '..' or
 * absolute paths.
 *
 * @param basedir The directory that all path segments have to be relative to.
 * @param paths The path segments
 * @returns
 */
export function safeJoin(basedir: string, ...paths: string[]) {
	// Note: join does not allow escaping with absolute paths. It just concatenates the paths
	// with the platform specific separator, then normalizes it.
	// So join('/basedir', '/file.txt') returns '/basedir/file.txt', not '/file.txt' as one might
	// assume.
	// The inner join basically just resolves all relative path movements, as if it were in the
	// root directory, then we put our basedir in front of it, and normalize will get rid of
	// the double slash.
	return join(basedir, join('/', ...paths));
}
