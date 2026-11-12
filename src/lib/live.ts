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

/** Thrown when a non-picker source (the dev server or a local bridge) can't hand over the scan. */
export class LiveSourceError extends Error {}

/** Three typical 5 s scan cycles. A source older than this is shown as offline. */
export const LIVE_STALE_MS = 15_000;

export interface HttpSource {
  /** URL to poll, either same-origin (`/scan.txt`) or a loopback bridge. */
  url: string;
  name: string;
  /** True when the URL points at the local scanner bridge (127.0.0.1). */
  bridge: boolean;
}

function isLoopbackHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h === "::1" ||
    h === "[::1]" ||
    /^127(?:\.\d{1,3}){3}$/.test(h)
  );
}

function isLoopbackUrl(url: string): boolean {
  try {
    return isLoopbackHost(new URL(url, window.location.href).hostname);
  } catch {
    return false;
  }
}

/**
 * Live mode can be bootstrapped by the launcher or the portable bridge:
 *  - `start-wifi.bat` opens `?live=scan.txt` and `start-wired.bat` opens
 *    `?wired=wired.txt`, served by the local Vite server.
 *  - the downloaded scanner `.bat` opens `?live=http://127.0.0.1:<port>/<token>/scan.txt`.
 * Returns null when the app was opened without the parameter (normal manual flow).
 */
export function autoLiveSource(): HttpSource | null {
  return sourceFromParam("live");
}

/**
 * Wired snapshots use the same mechanism as Wi-Fi scans: `?wired=wired.txt` for
 * the local dev server, or `?wired=http://127.0.0.1:<port>/<token>/wired.txt`
 * for the portable bridge. Returns null when the parameter is absent.
 */
export function autoWiredSource(): HttpSource | null {
  return sourceFromParam("wired");
}

function sourceFromParam(name: "live" | "wired"): HttpSource | null {
  if (typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get(name);
  if (param === null) return null;

  const raw = param.trim();
  const localPage = isLoopbackHost(window.location.hostname);
  const defaultFile = name === "wired" ? "wired.txt" : "scan.txt";

  if (raw === "" || raw === "1") {
    // A relative file only makes sense when the app itself is served locally
    // (the local launchers / Vite). On a hosted site it would just 404.
    return localPage ? { url: `/${defaultFile}`, name: defaultFile, bridge: false } : null;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return null;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const last = url.pathname.split("/").filter(Boolean).pop() ?? defaultFile;
    let fileName = last;
    try {
      fileName = decodeURIComponent(last);
    } catch {
      // Malformed escape in the URL path - keep the raw segment.
    }
    return {
      url: url.toString(),
      name: fileName,
      bridge: isLoopbackHost(url.hostname),
    };
  }

  // Relative file name: only valid on a local page served by the Vite server.
  return localPage ? { url: `/${encodeURIComponent(raw)}`, name: raw, bridge: false } : null;
}

/**
 * WatchHandle backed by a plain HTTP GET: no user gesture or permission needed
 * for same-origin sources, so the local launchers can go live on page load.
 *
 * Loopback bridges additionally need `targetAddressSpace: "loopback"` so the
 * browser exempts them from mixed-content blocking (Chrome 142+ Local Network
 * Access) after the user grants permission.
 */
export function httpScanHandle(src: HttpSource): WatchHandle {
  return {
    name: src.name,
    async getFile(): Promise<File> {
      const loopback = src.bridge || isLoopbackUrl(src.url);
      const init: RequestInit & { targetAddressSpace?: "loopback" } = {
        cache: "no-store",
        mode: "cors",
      };
      if (loopback) init.targetAddressSpace = "loopback";

      let res: Response;
      try {
        res = await fetch(new Request(src.url, init));
      } catch {
        throw new LiveSourceError(
          src.bridge
            ? "Can't reach the local scanner. Allow local network access for this site, then make sure the FloorScope scanner window is still open."
            : `Can't reach the dev server for ${src.name} - is it still running?`
        );
      }
      if (res.status === 404) {
        // Loop hasn't written the file yet: report "nothing new" and keep polling.
        return new File([""], src.name, { lastModified: 0, type: "text/plain" });
      }
      if (!res.ok) {
        throw new LiveSourceError(
          `Couldn't read ${src.name} from the server (HTTP ${res.status}).`
        );
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) {
        throw new LiveSourceError(
          `This server doesn't serve ${src.name} - use a local launcher or the portable scanner.`
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

export type LoopbackPermission = "granted" | "prompt" | "denied" | "unknown";

/**
 * Chrome/Edge 142+ gate public-site → loopback requests behind a permission.
 * Older builds used `local-network-access`; newer ones split it into
 * `loopback-network`. Browsers without the API return "unknown".
 */
export async function queryLoopbackPermission(): Promise<LoopbackPermission> {
  if (typeof navigator === "undefined" || !navigator.permissions) return "unknown";
  const names = ["loopback-network", "local-network-access", "local-network"];
  for (const name of names) {
    try {
      const status = await navigator.permissions.query({ name: name as PermissionName });
      return status.state;
    } catch {
      // Unknown permission name on this browser - try the next one.
    }
  }
  return "unknown";
}
