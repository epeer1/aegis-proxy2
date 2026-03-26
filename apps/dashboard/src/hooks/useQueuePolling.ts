import { useState, useEffect, useCallback, useRef } from 'react';

export interface Classification {
  rationale: string;
  confidenceScore: number;
  flaggedMarkers: string[];
}

export interface QueuedRequest {
  id: string;
  payload: any;
  status: string;
  classification: Classification;
  timestamp: number;
}

export function useQueuePolling(apiUrl: string) {
  const [queue, setQueue] = useState<QueuedRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);
  const sseConnected = useRef(false);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`/api/proxy/queue`);
      if (res.ok) {
        const data = await res.json();
        if (isMounted.current) {
          setQueue(data);
          setError(null);
        }
      } else {
        if (isMounted.current) setError("Failed to fetch queue");
      }
    } catch (e: any) {
      if (isMounted.current) setError("Gateway unreachable: " + e.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    // Initial fetch
    fetchQueue();

    // Try SSE connection for real-time updates
    let eventSource: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    try {
      eventSource = new EventSource(`/api/proxy/queue/events`);

      eventSource.addEventListener('connected', () => {
        sseConnected.current = true;
        // With SSE active, use slower polling as backup (every 10s instead of 1.5s)
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(fetchQueue, 10000);
      });

      eventSource.addEventListener('request:added', () => {
        fetchQueue();
      });

      eventSource.addEventListener('request:approved', () => {
        fetchQueue();
      });

      eventSource.addEventListener('request:denied', () => {
        fetchQueue();
      });

      eventSource.addEventListener('error', () => {
        // SSE failed — fall back to fast polling
        sseConnected.current = false;
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(fetchQueue, 1500);
      });
    } catch {
      // SSE not supported — use polling
      sseConnected.current = false;
    }

    // Start polling (SSE will switch to slow polling when connected)
    if (!sseConnected.current) {
      pollInterval = setInterval(fetchQueue, 1500);
    }

    return () => {
      isMounted.current = false;
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [apiUrl, fetchQueue]);

  return { queue, setQueue, error, loading };
}
