"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ConfirmModalProps {
  isOpen: boolean;
  action: "approve" | "deny";
  request: {
    id: string;
    payload: any;
    classification: {
      rationale: string;
      confidenceScore: number;
      flaggedMarkers: string[];
      riskLevel?: string;
    };
  };
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, action, request, isLoading, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;
  
  const isApprove = action === "approve";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onCancel}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-md mx-4 rounded-xl border overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
        isApprove 
          ? 'bg-[#001a00] border-emerald-900/50 shadow-[0_0_60px_rgba(16,185,129,0.15)]' 
          : 'bg-[#0a0000] border-red-900/50 shadow-[0_0_60px_rgba(220,38,38,0.15)]'
      }`}>
        {/* Header bar */}
        <div className={`h-1 ${isApprove ? 'bg-emerald-500' : 'bg-red-500'}`} />
        
        <div className="p-6 space-y-5">
          {/* Icon + Title */}
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isApprove ? 'bg-emerald-950/50 border border-emerald-500/30' : 'bg-red-950/50 border border-red-500/30'
            }`}>
              {isApprove ? (
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {isApprove ? 'Authorize Execution' : 'Deny Execution'}
              </h2>
              <p className="text-xs text-neutral-500 font-mono mt-0.5">
                Process {request.id.substring(0, 8)}...
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-black/40 rounded-lg border border-neutral-800/50 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500">Action</span>
              <Badge className="bg-red-600/20 text-red-400 border border-red-900/50 text-[10px] uppercase">
                {request.payload?.action || 'unknown'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500">Confidence</span>
              <span className="text-sm font-bold text-white">{request.classification.confidenceScore}%</span>
            </div>
            {request.classification.flaggedMarkers?.length > 0 && (
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase tracking-widest text-neutral-500 pt-1">Markers</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                  {request.classification.flaggedMarkers.map((m: string, i: number) => (
                    <Badge key={i} variant="outline" className="border-red-900/50 text-red-400 bg-red-950/30 text-[9px] py-0 uppercase">{m}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Warning text */}
          <p className={`text-xs leading-relaxed font-sans ${isApprove ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
            {isApprove 
              ? 'This will issue an Auth0 Token Vault delegation token and release the suspended agent request. The agent will proceed with the flagged action.'
              : 'This will permanently reject the agent request. The agent will receive a 403 Forbidden response and cannot retry this request.'
            }
          </p>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs tracking-widest uppercase h-11 font-sans"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 text-white border-0 text-xs font-bold tracking-widest uppercase h-11 font-sans transition-all ${
                isApprove 
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]'
              }`}
            >
              {isLoading 
                ? (isApprove ? 'Authorizing...' : 'Rejecting...')
                : (isApprove ? 'Confirm Authorize' : 'Confirm Reject')
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
