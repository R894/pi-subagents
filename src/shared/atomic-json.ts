import * as fs from "node:fs";
import * as path from "node:path";

function sleepSync(ms: number): void {
	const end = Date.now() + ms;
	while (Date.now() < end) { /* busy-wait for short Windows retry delays */ }
}

function tryRenameWithRetry(tempPath: string, filePath: string): void {
	const delays = [50, 100, 200];
	let lastErr: unknown;
	for (let i = 0; i <= delays.length; i++) {
		try {
			fs.renameSync(tempPath, filePath);
			return;
		} catch (err) {
			lastErr = err;
			if ((err as NodeJS.ErrnoException).code !== "EPERM") throw err;
			if (i < delays.length) sleepSync(delays[i]!);
		}
	}
	// All retries exhausted — final fallback: copy to a clean temp, then rename
	const copyTemp = `${tempPath}.fallback`;
	try {
		fs.copyFileSync(tempPath, copyTemp);
		fs.renameSync(copyTemp, filePath);
	} catch {
		try { fs.rmSync(copyTemp, { force: true }); } catch { /* best effort */ }
		throw lastErr;
	} finally {
		try { fs.rmSync(copyTemp, { force: true }); } catch { /* best effort */ }
	}
}

export function writeAtomicJson(filePath: string, payload: object): void {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	const tempPath = path.join(
		path.dirname(filePath),
		`.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
	);
	try {
		fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), "utf-8");
		tryRenameWithRetry(tempPath, filePath);
	} finally {
		try { fs.rmSync(tempPath, { force: true }); } catch { /* best effort */ }
	}
}
