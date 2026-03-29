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

export default function MidosocDashboard() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  const { queue, setQueue, error, loading } = useQueuePolling(apiUrl);
  const { user, isAuthenticated, ensureLoggedIn, authLoading } = useAuthProfile();

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
    <div className={`min-h-screen bg-[#050505] text-neutral-300 font-mono flex flex-col selection:bg-red-900 selection:text-white ${!isAuthenticated ? 'overflow-hidden max-h-screen' : ''}`}>
      <ToastNotification toast={toast} />

      {/* Auth0 Login Overlay */}
      {!isAuthenticated && !authLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/70">
          <div className="relative border border-neutral-800 bg-black/90 rounded-2xl p-10 max-w-md w-full mx-4 shadow-[0_0_80px_rgba(16,185,129,0.08)] text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-950/40 border border-emerald-500/30 mb-6">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-[0.15em] text-white uppercase mb-2">MIDOSOC</h1>
            <p className="text-[10px] text-neutral-500 uppercase tracking-[0.3em] mb-6">Zero-Trust AI Agent Command Center</p>
            <p className="text-sm text-neutral-400 font-sans mb-8 leading-relaxed">
              Authenticate via Auth0 to access the SOC dashboard. Only authorized analysts may review and authorize AI agent actions.
            </p>
            <a
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm tracking-wide transition-all duration-200 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In with Auth0
            </a>
            <p className="text-[9px] text-neutral-600 mt-4 uppercase tracking-widest">Powered by Auth0 Token Vault</p>
          </div>
        </div>
      )}

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
                <p className="text-red-400/60 font-sans">Are you sure the Midosoc backend is running on {apiUrl}?</p>
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
