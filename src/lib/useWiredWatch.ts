import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { autoWiredSource, httpScanHandle, LiveSourceError, type WatchHandle } from "./live";

export interface WiredWatch {
  /** True when the page was opened with a `?wired=` source. */
  available: boolean;
  auto: boolean;
  /** True when the source is the portable loopback bridge. */
  bridge: boolean;
  watching: boolean;
  fileName: string | null;
  lastUpdate: number | null;
  error: string | null;
  start: () => void;
  stop: () => void;
}

/**
 * Polls the wired snapshot (`wired.txt`) written by the scanner loop. Same
 * cadence and loopback handling as `useLiveWatch`, but a separate source so
 * Wi-Fi and LAN discovery can be connected independently.
 */
export function useWiredWatch(onText: (text: string) => void): WiredWatch {
  const source = useMemo(() => autoWiredSource(), []);
  const bridge = source?.bridge ?? false;
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

  const start = useCallback(() => {
    if (!source) return;
    handleRef.current = httpScanHandle(source);
    lastKeyRef.current = null;
    setFileName(source.name);
    setError(null);
    setWatching(true);
  }, [source]);

  const stop = useCallback(() => {
    setWatching(false);
    handleRef.current = null;
  }, []);

  // Loopback bridges need an explicit click (Chrome's Local Network Access
  // prompt). Same-origin dev-server sources can start on load.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!source || source.bridge || autoStartedRef.current) return;
    autoStartedRef.current = true;
    start();
  }, [source, start]);

  useEffect(() => {
    if (!watching) return;
    let cancelled = false;

    const tick = async () => {
      const handle = handleRef.current;
      if (!handle) return;
      try {
        const file = await handle.getFile();
        const key = `${file.lastModified}:${file.size}`;
        if (key !== lastKeyRef.current) {
          lastKeyRef.current = key;
          const text = await file.text();
          if (!cancelled) {
            setLastUpdate(Date.now());
            if (text) setError(null);
            onTextRef.current(text);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof LiveSourceError
              ? err.message
              : "Lost access to the wired snapshot. The scanner may have stopped — reconnect to read it again."
          );
          if (bridge) {
            setWatching(false);
            handleRef.current = null;
          }
        }
      }
    };

    void tick();
    const id = setInterval(() => void tick(), 1200);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [bridge, watching]);

  return {
    available: source !== null,
    auto: source !== null,
    bridge,
    watching,
    fileName,
    lastUpdate,
    error,
    start,
    stop,
  };
}
