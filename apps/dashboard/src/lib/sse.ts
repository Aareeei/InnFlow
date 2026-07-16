'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from './api';
import type { StreamEvent } from './api-types';

type UseEventStreamOptions = {
  token: string | null;
  enabled?: boolean;
  onEvent?: (event: StreamEvent) => void;
};

export function useEventStream({ token, enabled = true, onEvent }: UseEventStreamOptions) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const reconnect = useCallback(() => {
    // trigger re-effect by toggling connected
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!enabled || !token) {
      setConnected(false);
      return;
    }

    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout>;
    let source: EventSource | null = null;

    function connect() {
      if (cancelled || !token) return;

      const url = new URL(`${API_URL}/events/stream`);
      url.searchParams.set('token', token);

      source = new EventSource(url.toString());

      source.onopen = () => {
        if (!cancelled) setConnected(true);
      };

      source.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as StreamEvent;
          setLastEvent(event);
          onEventRef.current?.(event);
        } catch {
          // ignore malformed events
        }
      };

      source.onerror = () => {
        if (cancelled) return;
        setConnected(false);
        source?.close();
        retryTimeout = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimeout);
      source?.close();
      setConnected(false);
    };
  }, [enabled, token]);

  return { connected, lastEvent, reconnect };
}
