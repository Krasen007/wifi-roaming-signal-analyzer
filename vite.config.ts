import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Dev-only helper for `start.bat` (the single point of start).
 *
 * Two jobs:
 *  1. publish the port the dev server actually bound to (5173, or 5174/5175 when
 *     5173 is busy) into `.floorscope-port`, so the launcher can wait for the server
 *     without probing ports from the shell and then open the right URL;
 *  2. expose the `scan.txt` the netsh loop keeps overwriting, so the app can start
 *     its live watch without the File System Access picker — see `autoLiveSource()`
 *     in `src/lib/live.ts`, triggered by opening the app with `?live=scan.txt`.
 */
function serveScanFile(): Plugin {
  const scanFilePattern = /\.(txt|log|out)$/i;
  const pointerFile = path.resolve(__dirname, ".floorscope-port");

  return {
    name: "floorscope-serve-scan-file",
    apply: "serve",
    configureServer(server) {
      // Drop a leftover port pointer from a previous (possibly crashed) run.
      try {
        fs.rmSync(pointerFile, { force: true });
      } catch {
        // best effort only - the launcher falls back to its timeout message
      }

      const publishPort = () => {
        const address = server.httpServer?.address();
        const port = typeof address === "object" && address ? address.port : 0;
        if (!port) return;
        try {
          fs.writeFileSync(pointerFile, String(port), "utf8");
        } catch {
          // best effort only - the launcher falls back to its timeout message
        }
      };

      server.httpServer?.once("listening", publishPort);
      if (server.httpServer?.listening) publishPort();
      server.httpServer?.once("close", () => {
        try {
          fs.rmSync(pointerFile, { force: true });
        } catch {
          // best effort only
        }
      });

      // Registered before Vite's internal middlewares, so /scan.txt never falls
      // through to the SPA index.html fallback.
      server.middlewares.use((req, res, next) => {
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
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), serveScanFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
