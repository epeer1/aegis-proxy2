import { useState, useEffect } from 'react';

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

  useEffect(() => {
    let isMounted = true;
    const fetchQueue = async () => {
      try {
        const res = await fetch(`/api/proxy/queue`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setQueue(data);
            setError(null);
          }
        } else {
          if (isMounted) setError("Failed to fetch queue");
        }
      } catch (e: any) {
         if (isMounted) setError("Gateway unreachable: " + e.message);
      } finally {
         if (isMounted) setLoading(false);
      }
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiUrl]);

  return { queue, setQueue, error, loading };
}
