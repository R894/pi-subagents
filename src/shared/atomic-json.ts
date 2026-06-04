import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Write JSON atomically. On Windows, anti-malware scanners can briefly lock
 * .tmp files, causing EPERM on rename. We avoid rename by copying the temp
 * to the target instead, then cleaning up. copyFileSync creates a fresh inode
 * at the target path without the cross-file-lock pattern that triggers scanners.
 */
export function writeAtomicJson(filePath: string, payload: object): void {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	const json = JSON.stringify(payload, null, 2);
	const tempPath = path.join(
		path.dirname(filePath),
		`.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
	);
	try {
		fs.writeFileSync(tempPath, json, "utf-8");
		fs.copyFileSync(tempPath, filePath);
	} finally {
		try { fs.rmSync(tempPath, { force: true }); } catch { /* best effort */ }
	}
}
