import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  autoLiveSource,
  fsaSupported,
  httpScanHandle,
  LiveSourceError,
  pickScanFile,
  type WatchHandle,
} from "./live";

export interface LiveWatch {
  supported: boolean;
  /** True when live mode was bootstrapped by the launcher (`?live=` in the URL). */
  auto: boolean;
  watching: boolean;
  fileName: string | null;
  lastUpdate: number | null;
  error: string | null;
  start: () => void;
  stop: () => void;
}

/**
 * Polls a picked file (the scan.txt the loop is overwriting) and forwards its
 * text whenever the file changes. Poll cadence is fixed at ~1.2 s, far faster
 * than the user's 5 s write loop, so every new scan is picked up quickly.
 *
 * When the app is opened with `?live=<file>` — that's what `start.bat` does — the
 * source is the dev server instead of the file picker, and watching starts on load.
 */
export function useLiveWatch(onText: (text: string) => void): LiveWatch {
  const autoSource = useMemo(() => autoLiveSource(), []);
  const supported = autoSource !== null || fsaSupported();
  const [watching, setWatching] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRef = useRef<WatchHandle | null>(null);
  const lastKeyRef = useRef<string | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  const attach = useCallback((handle: WatchHandle) => {
    handleRef.current = handle;
    lastKeyRef.current = null;
    setFileName(handle.name);
    setError(null);
    setWatching(true);
  }, []);

  const start = useCallback(async () => {
    if (autoSource) {
      // Dev-server source: no picker, no permission prompt.
      attach(httpScanHandle(autoSource));
      return;
    }
    if (!supported) return;
    const h = await pickScanFile();
    if (!h) return;
    attach(h);
  }, [attach, autoSource, supported]);

  // Launcher-opened app (`?live=scan.txt`): go live on load. The ref keeps
  // StrictMode's double-invoked effects from attaching twice.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!autoSource || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void start();
  }, [autoSource, start]);

  const stop = useCallback(() => {
    setWatching(false);
    handleRef.current = null;
  }, []);

  useEffect(() => {
    if (!watching) return;
    let cancelled = false;

    const tick = async () => {
      const h = handleRef.current;
      if (!h) return;
      try {
        const f = await h.getFile();
        const key = `${f.lastModified}:${f.size}`;
        if (key !== lastKeyRef.current) {
          lastKeyRef.current = key;
          const text = await f.text();
          if (!cancelled) {
            setLastUpdate(Date.now());
            onTextRef.current(text);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof LiveSourceError
              ? err.message
              : "Lost access to the file. The scan may have moved or the loop stopped — pick the file again."
          );
        }
      }
    };

    void tick();
    const id = setInterval(() => void tick(), 1200);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [watching]);

  return { supported, auto: autoSource !== null, watching, fileName, lastUpdate, error, start, stop };
}
