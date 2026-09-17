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
