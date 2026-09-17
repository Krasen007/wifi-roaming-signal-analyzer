import { useCallback, useEffect, useRef, useState } from "react";
import { fsaSupported, pickScanFile, type WatchHandle } from "./live";

export interface LiveWatch {
  supported: boolean;
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
 */
export function useLiveWatch(onText: (text: string) => void): LiveWatch {
  const supported = fsaSupported();
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

  const start = useCallback(async () => {
    if (!supported) return;
    const h = await pickScanFile();
    if (!h) return;
    handleRef.current = h;
    lastKeyRef.current = null;
    setFileName(h.name);
    setError(null);
    setWatching(true);
  }, [supported]);

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
      } catch {
        if (!cancelled) {
          setError(
            "Lost access to the file. The scan may have moved or the loop stopped — pick the file again."
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

  return { supported, watching, fileName, lastUpdate, error, start, stop };
}
