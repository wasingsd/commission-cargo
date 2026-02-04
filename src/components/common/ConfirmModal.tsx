'use client';

import React from 'react';
import { AlertCircle, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'ยืนยัน',
    cancelText = 'ยกเลิก',
    isDestructive = false,
    isLoading = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'
                        }`}>
                        <AlertCircle className="w-8 h-8" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="p-6 bg-slate-50 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-3 px-4 text-white rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 ${isDestructive
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                            }`}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
