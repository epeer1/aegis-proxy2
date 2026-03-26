import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ForensicCardProps {
  request: any;
  index: number;
  total: number;
  isApproving: string | null;
  isDenying: string | null;
  onConfirm: (id: string, action: "approve" | "deny") => void;
}

export function ForensicCard({ request, index, total, isApproving, isDenying, onConfirm }: ForensicCardProps) {
  return (
    <Card className="border border-red-900/50 bg-[#0a0000] text-white rounded-xl overflow-hidden shadow-[0_0_40px_rgba(153,27,27,0.15)] animate-in fade-in slide-in-from-bottom-4 duration-500 relative flex flex-col aegis-threat-pulse">
      <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
      <div className="bg-red-950/40 text-red-500 text-[10px] font-bold tracking-[0.2em] uppercase px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
            Threat Neutralized — Step-Up Authorization Required
        </div>
        <span>Item {index + 1} of {total}</span>
      </div>
      
      <CardHeader className="py-6 px-8 border-y border-red-900/20 relative overflow-hidden bg-black/40">
        <div className="absolute inset-0 bg-gradient-to-r from-red-950/20 to-transparent pointer-events-none" />
        <div className="relative flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white mb-1">Forensic Dossier</h2>
            <p className="text-xs text-red-400/80 font-mono uppercase tracking-widest">Process ID: {request.id}</p>
          </div>
          <Badge className="bg-red-600 hover:bg-red-500 text-white border-0 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            Quarantined
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-red-900/20">
          
          {/* LLM Rationale */}
          <div className="p-8 space-y-6 bg-black/20">
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-red-500/70 font-bold mb-3">AI Intelligence Rationale</h3>
              <p className="text-sm leading-relaxed text-neutral-200 border-l-2 border-red-500 pl-4 py-1 italic shadow-sm font-sans">
                "{request.classification.rationale || 'Destructive intent detected by heuristic fallback.'}"
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0f0000] rounded-lg border border-red-900/30 p-4">
                <h4 className="text-[9px] uppercase tracking-widest text-neutral-500 mb-2">Confidence Score</h4>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-red-500 leading-none">{request.classification.confidenceScore || '100'}</span>
                  <span className="text-xs text-red-500/50 uppercase font-bold tracking-widest leading-relaxed">%</span>
                </div>
              </div>
              <div className="bg-[#0f0000] rounded-lg border border-red-900/30 p-4">
                <h4 className="text-[9px] uppercase tracking-widest text-neutral-500 mb-2">Flagged Markers</h4>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {request.classification.flaggedMarkers && request.classification.flaggedMarkers.length > 0 ? (
                    request.classification.flaggedMarkers.map((marker: string, i: number) => (
                      <Badge key={i} variant="outline" className="border-red-900/50 text-red-400 bg-red-950/30 text-[9px] rounded-sm py-0 uppercase">{marker}</Badge>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-600 font-sans">N/A</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Intercepted Payload */}
          <div className="p-8 bg-[#0a0505]">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold mb-3 flex justify-between items-center">
              <span>Intercepted Data</span>
              <span className="text-red-500/60 font-mono text-[9px]">{new Date(request.timestamp).toISOString()}</span>
            </h3>
            <div className="bg-black p-5 rounded-lg border border-red-900/20 text-xs overflow-x-auto shadow-inner relative group h-[200px] overflow-y-auto">
              <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>
              <pre className="text-neutral-400 font-mono leading-relaxed relative z-10 selection:bg-red-900/50">
                {JSON.stringify(request.payload, null, 2).split('\n').map((line: string, i: number) => {
                  const isFlagged = request.classification.flaggedMarkers?.some((m:string) => line.includes(m));
                  return (
                    <div key={i} className={`${isFlagged ? 'text-red-400 bg-red-950/40 -mx-5 px-5 block w-[calc(100%+2.5rem)]' : ''}`}>
                      {line}
                    </div>
                  )
                })}
              </pre>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 bg-[#050000] border-t border-red-900/20 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="h-6 w-6 rounded bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-500">A0</div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Token Vault Protected</span>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button 
            variant="ghost" 
            onClick={() => onConfirm(request.id, "deny")}
            disabled={isDenying === request.id || isApproving === request.id}
            className="flex-1 sm:flex-none border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 hover:border-neutral-700 text-xs tracking-widest uppercase h-12 rounded px-8 transition-all font-sans"
          >
            {isDenying === request.id ? 'Rejecting...' : 'Reject Drop'}
          </Button>
          <Button 
            onClick={() => onConfirm(request.id, "approve")}
            disabled={isApproving === request.id || isDenying === request.id}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] text-xs font-bold tracking-widest uppercase h-12 rounded px-8 transition-all font-sans"
          >
            {isApproving === request.id ? 'Authorizing…' : 'Approve via Auth0'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
