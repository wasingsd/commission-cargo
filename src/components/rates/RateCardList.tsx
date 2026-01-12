'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings2, Plus, Calendar, CheckCircle2, AlertCircle, Copy, Edit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface RateCard {
    id: string;
    name: string;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    effectiveFrom: string | null;
    effectiveTo: string | null;
    createdAt: string;
    _count?: {
        rows: number;
    }
}

export function RateCardList() {
    const router = useRouter();
    const [rateCards, setRateCards] = useState<RateCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRateCards();
    }, []);

    const fetchRateCards = async () => {
        try {
            const res = await fetch('/api/rate-cards');
            const data = await res.json();
            if (data.success) {
                setRateCards(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch rate cards:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        createDraft();
    };

    const createDraft = async () => {
        try {
            const res = await fetch('/api/rate-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `New Rate Card - ${format(new Date(), 'yyyy-MM-dd')}`,
                })
            });
            const json = await res.json();
            if (json.success) {
                router.push(`/rates/${json.data.id}`);
            }
        } catch (error) {
            alert('Failed to create draft');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Settings2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Rate Cards</h2>
                        <p className="text-sm text-slate-500">Manage shipping rates and costs</p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue700 text-white rounded-lg transition shadow-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    New Rate Card
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rateCards.map((card) => (
                        <div
                            key={card.id}
                            onClick={() => router.push(`/rates/${card.id}`)}
                            className={`
                                group relative bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition cursor-pointer
                                ${card.status === 'ACTIVE' ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className={`
                                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-3
                                        ${card.status === 'ACTIVE'
                                            ? 'bg-green-50 text-green-700 border border-green-100'
                                            : card.status === 'ARCHIVED'
                                                ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                                        }
                                    `}>
                                        {card.status === 'ACTIVE' && <CheckCircle2 className="w-3 h-3" />}
                                        {card.status}
                                    </span>
                                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition">
                                        {card.name}
                                    </h3>
                                </div>
                                <div className="text-slate-400">
                                    <Calendar className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-slate-500 mb-6">
                                <div className="flex justify-between">
                                    <span>Effective Date:</span>
                                    <span className="font-medium text-slate-700">
                                        {card.effectiveFrom ? format(new Date(card.effectiveFrom), 'dd MMM yyyy') : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Created Date:</span>
                                    <span>{format(new Date(card.createdAt), 'dd MMM yyyy')}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 text-sm font-medium">
                                <span className="text-blue-600 group-hover:underline">Edit Rates &rarr;</span>
                            </div>
                        </div>
                    ))}

                    {rateCards.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                            <p className="font-medium">No rate cards found</p>
                            <p className="text-sm mt-1">Create your first rate card to get started</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
