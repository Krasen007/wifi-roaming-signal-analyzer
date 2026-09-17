export interface WatchHandle {
  getFile(): Promise<File>;
  name: string;
}

declare global {
  interface Window {
    showOpenFilePicker?: (opts?: {
      types?: { description: string; accept: Record<string, string[]> }[];
      multiple?: boolean;
    }) => Promise<WatchHandle[]>;
  }
}

/** File System Access API is available on Chrome/Edge (desktop). */
export function fsaSupported(): boolean {
  return typeof window !== "undefined" && typeof window.showOpenFilePicker === "function";
}

/** Thrown when a non-picker source (the dev server) can't hand over the scan. */
export class LiveSourceError extends Error {}

export interface HttpSource {
  /** Path on the dev server, e.g. `/scan.txt`. */
  url: string;
  name: string;
}

/**
 * Live mode can be bootstrapped by the launcher instead of the file picker:
 * `start.bat` opens the app with `?live=scan.txt`, and the Vite dev server serves
 * that file from the project root (see `serveScanFile()` in vite.config.ts).
 * Returns null when the app was opened without the parameter (normal manual flow).
 */
export function autoLiveSource(): HttpSource | null {
  if (typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get("live");
  if (param === null) return null;
  const name = param.trim() === "" || param.trim() === "1" ? "scan.txt" : param.trim();
  return { url: `/${encodeURIComponent(name)}`, name };
}

/**
 * WatchHandle backed by a plain HTTP GET: no user gesture or permission needed, so
 * the app can go live the moment it loads.
 */
export function httpScanHandle(src: HttpSource): WatchHandle {
  return {
    name: src.name,
    async getFile(): Promise<File> {
      let res: Response;
      try {
        res = await fetch(src.url, { cache: "no-store" });
      } catch {
        throw new LiveSourceError(
          `Can't reach the dev server for ${src.name} - is it still running?`
        );
      }
      if (res.status === 404) {
        // Loop hasn't written the file yet: report "nothing new" and keep polling.
        return new File([""], src.name, { lastModified: 0, type: "text/plain" });
      }
      if (!res.ok) {
        throw new LiveSourceError(
          `Couldn't read ${src.name} from the dev server (HTTP ${res.status}).`
        );
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) {
        throw new LiveSourceError(
          `This server doesn't serve ${src.name} - use start.bat for automatic live mode.`
        );
      }
      const text = await res.text();
      const lastModifiedHeader = res.headers.get("last-modified");
      const lastModified = lastModifiedHeader ? Date.parse(lastModifiedHeader) : 0;
      return new File([text], src.name, {
        lastModified: Number.isNaN(lastModified) ? 0 : lastModified,
        type: "text/plain",
      });
    },
  };
}

/** Ask the user to pick the scan.txt file their loop is writing to. */
export async function pickScanFile(): Promise<WatchHandle | null> {
  if (!fsaSupported() || !window.showOpenFilePicker) return null;
  try {
    const handles = await window.showOpenFilePicker({
      types: [{ description: "WiFi scan output (scan.txt)", accept: { "text/plain": [".txt", ".log", ".out"] } }],
      multiple: false,
    });
    return handles[0] ?? null;
  } catch {
    // user cancelled the picker
    return null;
  }
}
