"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useQueuePolling } from "@/hooks/useQueuePolling";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import { ToastNotification } from "@/components/soc/ToastNotification";
import { SOCHeader } from "@/components/soc/SOCHeader";
import { AgentSimulator } from "@/components/soc/AgentSimulator";
import { ForensicCard } from "@/components/soc/ForensicCard";
import { ConfirmModal } from "@/components/soc/ConfirmModal";
import { AuditLog } from "@/components/soc/AuditLog";

export default function AegisDashboard() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  const { queue, setQueue, error, loading } = useQueuePolling(apiUrl);
  const { user, isAuthenticated, ensureLoggedIn } = useAuthProfile();

  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isDenying, setIsDenying] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; action: "approve" | "deny"; requestId: string } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openConfirmModal = (id: string, action: "approve" | "deny") => {
    setModalState({ isOpen: true, action, requestId: id });
  };

  const closeModal = () => setModalState(null);

  const executeAction = async (id: string, action: "approve" | "deny") => {
    if (action === "approve") setIsApproving(id);
    else setIsDenying(id);

    try {
      const loggedIn = await ensureLoggedIn();
      if (!loggedIn) return;

      const res = await fetch(`/api/proxy/queue/${action}/${id}`, { 
        method: "POST",
      });
      
      const data = await res.json();

      if (res.ok) {
         showToast(
           action === "approve" 
             ? `Authorized — Token Vault delegation issued for ${id.substring(0,8)}...` 
             : `Denied — Execution blocked for ${id.substring(0,8)}...`, 
           "success"
         );
         setQueue(q => q.filter(r => r.id !== id));
      } else {
         throw new Error(data.error || "Gateway rejected the operation.");
      }
    } catch(e: any) {
      showToast(e.message, "error");
    } finally {
      if (action === "approve") setIsApproving(null);
      else setIsDenying(null);
      closeModal();
    }
  };

  const handleConfirmFromModal = () => {
    if (modalState) {
      executeAction(modalState.requestId, modalState.action);
    }
  };

  const modalRequest = modalState ? queue.find(r => r.id === modalState.requestId) : null;

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-300 font-mono flex flex-col selection:bg-red-900 selection:text-white">
      <ToastNotification toast={toast} />

      {/* Confirmation Modal */}
      {modalState && modalRequest && (
        <ConfirmModal
          isOpen={modalState.isOpen}
          action={modalState.action}
          request={modalRequest}
          isLoading={isApproving === modalState.requestId || isDenying === modalState.requestId}
          onConfirm={handleConfirmFromModal}
          onCancel={closeModal}
        />
      )}

      <SOCHeader 
        queueLength={queue.length} 
        user={user} 
        isAuthenticated={isAuthenticated} 
        apiUrl={apiUrl} 
      />

      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[url('/cubes.png')] bg-fixed overflow-y-auto">
        <div className="lg:col-span-4 space-y-6">
          <AgentSimulator apiUrl={apiUrl} showToast={showToast} />
          <AuditLog />
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          {error && queue.length === 0 ? (
            <Card className="flex-1 border border-red-900/30 bg-red-950/20 text-white rounded-xl flex items-center justify-center p-12 min-h-[500px]">
              <div className="text-center space-y-4">
                <svg className="w-12 h-12 mx-auto text-red-500 opacity-50 block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <h2 className="text-xl font-bold tracking-widest uppercase text-red-500">{error}</h2>
                <p className="text-red-400/60 font-sans">Are you sure the Aegis Proxy backend is running on {apiUrl}?</p>
              </div>
            </Card>
          ) : queue.length > 0 ? (
             queue.map((req, index) => (
               <ForensicCard 
                 key={req.id} 
                 request={req} 
                 index={index} 
                 total={queue.length} 
                 isApproving={isApproving} 
                 isDenying={isDenying} 
                 onConfirm={openConfirmModal} 
               />
             ))
          ) : (
            <Card className="flex-1 border border-emerald-900/30 bg-black/60 backdrop-blur-xl text-white rounded-xl flex items-center justify-center p-12 transition-all duration-1000 min-h-[500px]">
              <div className="text-center space-y-6 max-w-sm">
                <div className="inline-flex flex-col items-center justify-center w-28 h-28 rounded-full bg-emerald-950/30 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)] mb-4 relative">
                   <div className="absolute inset-0 rounded-full border-r border-t border-emerald-500/50 animate-spin" style={{ animationDuration: '3s' }}></div>
                  <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-widest uppercase text-emerald-400 mb-2">{loading ? 'Scanning...' : 'All Clear — No Active Threats'}</h2>
                  <p className="text-sm text-emerald-500/60 leading-relaxed font-sans">
                    Zero-Trust Policy Engine active. All incoming AI agent traffic is being monitored. No suspicious payloads detected.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
