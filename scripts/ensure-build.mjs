import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distIndex = path.join(root, "dist", "index.html");

const WATCHED = [
  "src",
  "index.html",
  "package.json",
  "package-lock.json",
  "vite.config.ts",
  "tsconfig.json",
];
const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);

/** Newest modification time in a file or directory tree (ms since epoch). */
function newestMtime(target) {
  if (!existsSync(target)) return 0;
  const stat = statSync(target);
  if (!stat.isDirectory()) return stat.mtimeMs;

  let newest = stat.mtimeMs;
  for (const entry of readdirSync(target)) {
    if (SKIP_DIRS.has(entry)) continue;
    newest = Math.max(newest, newestMtime(path.join(target, entry)));
  }
  return newest;
}

const sourceMtime = Math.max(...WATCHED.map((entry) => newestMtime(path.join(root, entry))));
const distMtime = existsSync(distIndex) ? statSync(distIndex).mtimeMs : 0;

if (distMtime > 0 && sourceMtime <= distMtime) {
  console.log("[FloorScope] Production build is up to date.");
  process.exit(0);
}

console.log(
  distMtime > 0
    ? "[FloorScope] Source changed - rebuilding production bundle..."
    : "[FloorScope] No production build found - building the production bundle..."
);

const result = spawnSync("npm", ["run", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
