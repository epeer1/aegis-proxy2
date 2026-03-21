"use client";
import React from 'react';

export function ToastNotification({ toast }: { toast: { message: string; type: "success" | "error" } | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 ${
      toast.type === "error" ? "bg-red-950/90 border border-red-500/50 text-red-100" : "bg-emerald-950/90 border border-emerald-500/50 text-emerald-100"
    }`}>
      {toast.type === "error" ? (
         <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      ) : (
         <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      )}
      <span className="text-sm font-sans tracking-wide">{toast.message}</span>
    </div>
  );
}
