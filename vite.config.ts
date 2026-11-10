import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ViteDevServer } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

type HttpServer = ViteDevServer["httpServer"];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Launcher helper used by `start.bat`, for both the dev server and the
 * production preview server.
 *
 * Two jobs:
 *  1. publish the port the server actually bound to (5173/4173, or the next free
 *     port when busy) into `.floorscope-port`, so the launcher can wait for the
 *     server without probing ports from the shell and then open the right URL;
 *  2. expose the `scan.txt` / `wired.txt` files the launcher loops keep overwriting,
 *     so the app can start its live watches without the File System Access picker -
 *     see `autoLiveSource()` / `autoWiredSource()` in `src/lib/live.ts`, triggered
 *     by opening the app with `?live=scan.txt&wired=wired.txt`.
 */
function serveScanFile(): Plugin {
  const scanFilePattern = /\.(txt|log|out)$/i;
  const pointerFile = path.resolve(__dirname, ".floorscope-port");

  const removePortFile = () => {
    try {
      fs.rmSync(pointerFile, { force: true });
    } catch {
      // best effort only - the launcher falls back to its timeout message
    }
  };

  const publishPort = (httpServer: HttpServer | null | undefined) => {
    const address = httpServer?.address();
    const port = typeof address === "object" && address ? address.port : 0;
    if (!port) return;
    try {
      fs.writeFileSync(pointerFile, String(port), "utf8");
    } catch {
      // best effort only - the launcher falls back to its timeout message
    }
  };

  const attachPortFile = (httpServer: HttpServer | null | undefined) => {
    // Drop a leftover pointer from a previous (possibly crashed) run.
    removePortFile();
    const publish = () => publishPort(httpServer);
    httpServer?.once("listening", publish);
    if (httpServer?.listening) publish();
    httpServer?.once("close", removePortFile);
  };

  const scanMiddleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void
  ) => {
    const pathname = decodeURIComponent((req.url ?? "").split("?")[0]);
    if (req.method !== "GET" || !scanFilePattern.test(pathname)) return next();

    const file = path.resolve(__dirname, pathname.replace(/^\/+/, ""));
    if (!file.startsWith(__dirname + path.sep)) return next();

    fs.stat(file, (err, stats) => {
      if (err || !stats.isFile()) {
        // The loop hasn't written the file yet (or it was removed): tell the
        // app plainly instead of serving index.html.
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(`${path.basename(file)} not written yet - is the scan loop running?`);
        return;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      // Pollers use Last-Modified to spot a new scan, so send it every time.
      res.setHeader("Last-Modified", new Date(stats.mtimeMs).toUTCString());
      res.setHeader("ETag", `W/"${stats.mtimeMs}-${stats.size}"`);
      fs.createReadStream(file).pipe(res);
    });
  };

  return {
    name: "floorscope-serve-scan-file",
    configureServer(server) {
      attachPortFile(server.httpServer);
      // Registered before Vite's internal middlewares, so /scan.txt and
      // /wired.txt never fall through to the SPA index.html fallback.
      server.middlewares.use(scanMiddleware);
    },
    configurePreviewServer(server) {
      attachPortFile(server.httpServer);
      // Same order as above: serve the live scan files before the production
      // static files.
      server.middlewares.use(scanMiddleware);
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Dev server stays at the root path; production builds use relative asset
  // paths so the same bundle works on GitHub Pages (project subpath) or any
  // other static host without environment-specific configuration.
  base: command === "build" ? "./" : "/",
  // Classic GitHub Pages flow: build directly into ./docs so it can be
  // published from the `docs/` folder on `main` without copying files.
  build: {
    outDir: "docs",
  },
  plugins: [react(), tailwindcss(), serveScanFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
}));
