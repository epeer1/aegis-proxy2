"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AuditEntry {
  timestamp: string;
  requestId: string;
  action: string;
  decision: "approved" | "denied";
  analyst: string;
  riskLevel?: string;
  confidenceScore?: number;
}

export function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await fetch("/api/proxy/audit");
        if (res.ok) {
          const data = await res.json();
          setEntries(data);
        }
      } catch {
        // Silently fail — audit log is non-critical
      }
    };
    fetchAudit();
    const interval = setInterval(fetchAudit, 5000);
    return () => clearInterval(interval);
  }, []);

  if (entries.length === 0) return null;

  return (
    <Card className="border border-neutral-800 bg-black/80 backdrop-blur-xl rounded-xl overflow-hidden shadow-2xl">
      <CardHeader 
        className="border-b border-neutral-800/50 bg-neutral-900/20 py-3 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm text-neutral-300 uppercase tracking-widest flex items-center justify-between">
          <span className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Decision Log
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9px] bg-neutral-900 border-neutral-800 text-neutral-400">{entries.length}</Badge>
            <svg className={`w-3 h-3 text-neutral-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-0 max-h-[300px] overflow-y-auto">
          {entries.slice(0, 10).map((entry, i) => (
            <div key={i} className="px-4 py-3 border-b border-neutral-900/50 last:border-0 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className={`text-[8px] uppercase px-1.5 py-0 border-0 ${
                    entry.decision === 'approved' 
                      ? 'bg-emerald-950/50 text-emerald-400' 
                      : 'bg-red-950/50 text-red-400'
                  }`}>
                    {entry.decision}
                  </Badge>
                  <span className="text-[10px] text-neutral-400 font-mono truncate">{entry.action}</span>
                </div>
                <span className="text-[9px] text-neutral-600 font-mono">{entry.requestId?.substring(0, 8)}...</span>
                {entry.analyst && entry.analyst !== 'admin' && (
                  <span className="text-[9px] text-emerald-600 font-mono">{entry.analyst}</span>
                )}
              </div>
              <span className="text-[9px] text-neutral-600 whitespace-nowrap">
                {new Date(entry.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
