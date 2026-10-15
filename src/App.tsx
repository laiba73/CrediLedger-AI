import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Sparkles, Loader2, BookOpenText, RefreshCw } from 'lucide-react';
import { supabase, type Debtor, type RiskStatus } from '@/lib/supabase';
import { calculateRecoveryRating, parseVoicePhrase } from '@/lib/aiHelpers';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import LedgerTable from '@/components/LedgerTable';
import VoiceEntrySimulator from '@/components/VoiceEntrySimulator';
import DebtorForm from '@/components/DebtorForm';

type SortBy = 'name' | 'balance' | 'risk';
type SortDir = 'asc' | 'desc';

export default function App() {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | RiskStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [formOpen, setFormOpen] = useState(false);
  const [editingDebtor, setEditingDebtor] = useState<Debtor | null>(null);
  const [voiceText, setVoiceText] = useState('');
  const [voiceParsed, setVoiceParsed] = useState<string | null>(null);

  const fetchDebtors = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('debtors')
      .select('*')
      .order('created_at', { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setDebtors(data as Debtor[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDebtors();
  }, [fetchDebtors]);

  const handleSave = useCallback(
    async (
      name: string,
      phone: string,
      balance: number,
      riskStatus: RiskStatus,
      lastTransaction: string
    ) => {
      if (editingDebtor) {
        const { error: updateError } = await supabase
          .from('debtors')
          .update({
            name,
            phone,
            balance,
            risk_status: riskStatus,
            last_transaction: lastTransaction,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDebtor.id);
        if (updateError) {
          setError(updateError.message);
          return;
        }
      } else {
        const { error: insertError } = await supabase.from('debtors').insert({
          name,
          phone,
          balance,
          risk_status: riskStatus,
          last_transaction: lastTransaction,
        });
        if (insertError) {
          setError(insertError.message);
          return;
        }
      }
      setFormOpen(false);
      setEditingDebtor(null);
      await fetchDebtors();
    },
    [editingDebtor, fetchDebtors]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase.from('debtors').delete().eq('id', id);
      if (deleteError) {
        setError(deleteError.message);
        return;
      }
      await fetchDebtors();
    },
    [fetchDebtors]
  );

  const handleVoiceTranscript = useCallback(
    async (text: string) => {
      setVoiceText(text);
      const parsed = parseVoicePhrase(text);
      if (parsed) {
        const actionVerb = parsed.action === 'payment' ? 'Paid' : 'Took';
        setVoiceParsed(
          `Detected: ${parsed.name} ${actionVerb === 'Paid' ? 'paid' : 'took'} $${parsed.amount}${
            parsed.item ? ` (${parsed.item})` : ''
          }`
        );
        const existing = debtors.find(
          (d) => d.name.toLowerCase() === parsed.name.toLowerCase()
        );
        if (existing) {
          const newBalance =
            parsed.action === 'payment'
              ? Math.max(0, existing.balance - parsed.amount)
              : existing.balance + parsed.amount;
          const newRisk: RiskStatus =
            newBalance === 0
              ? 'green'
              : parsed.action === 'payment' && newBalance < existing.balance
              ? existing.risk_status === 'red'
                ? 'yellow'
                : 'green'
              : existing.risk_status;
          const newLastTx = text;
          const { error: updateError } = await supabase
            .from('debtors')
            .update({
              balance: newBalance,
              risk_status: newRisk,
              last_transaction: newLastTx,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          if (updateError) {
            setError(updateError.message);
          } else {
            await fetchDebtors();
          }
        } else {
          const newRisk: RiskStatus = parsed.action === 'payment' ? 'green' : 'green';
          const { error: insertError } = await supabase.from('debtors').insert({
            name: parsed.name,
            phone: '',
            balance: parsed.action === 'payment' ? 0 : parsed.amount,
            risk_status: newRisk,
            last_transaction: text,
          });
          if (insertError) {
            setError(insertError.message);
          } else {
            await fetchDebtors();
          }
        }
      }
      setTimeout(() => {
        setVoiceParsed(null);
        setVoiceText('');
      }, 4000);
    },
    [debtors, fetchDebtors]
  );

  const handleToggleSort = useCallback(
    (field: SortBy) => {
      if (sortBy === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortDir(field === 'balance' ? 'desc' : 'asc');
      }
    },
    [sortBy]
  );

  const filteredDebtors = useMemo(() => {
    let result = debtors;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.phone.toLowerCase().includes(q) ||
          d.last_transaction.toLowerCase().includes(q)
      );
    }
    if (riskFilter !== 'all') {
      result = result.filter((d) => d.risk_status === riskFilter);
    }
    const sorted = [...result];
    sorted.sort((a, b) => {
      let cmp: number;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'balance') {
        cmp = a.balance - b.balance;
      } else {
        const riskOrder = { red: 0, yellow: 1, green: 2 };
        cmp = riskOrder[a.risk_status] - riskOrder[b.risk_status];
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [debtors, searchQuery, riskFilter, sortBy, sortDir]);

  const analytics = useMemo(() => {
    const totalOutstanding = debtors.reduce((sum, d) => sum + d.balance, 0);
    const activeDebtors = debtors.filter((d) => d.balance > 0).length;
    const greenCount = debtors.filter((d) => d.risk_status === 'green').length;
    const yellowCount = debtors.filter((d) => d.risk_status === 'yellow').length;
    const redCount = debtors.filter((d) => d.risk_status === 'red').length;
    const recovery = calculateRecoveryRating(
      totalOutstanding,
      activeDebtors,
      greenCount,
      yellowCount,
      redCount
    );
    return { totalOutstanding, activeDebtors, ...recovery };
  }, [debtors]);

  const filterButtons: { label: string; value: 'all' | RiskStatus; count: number }[] = [
    { label: 'All', value: 'all', count: debtors.length },
    { label: 'Safe', value: 'green', count: debtors.filter((d) => d.risk_status === 'green').length },
    { label: 'Warning', value: 'yellow', count: debtors.filter((d) => d.risk_status === 'yellow').length },
    { label: 'High Risk', value: 'red', count: debtors.filter((d) => d.risk_status === 'red').length },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <motion.div
                animate={{ rotate: [0, 3, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-xl shadow-emerald-500/30"
              >
                <BookOpenText className="w-8 h-8 text-white" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1"
              >
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </motion.div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                CrediLedger <span className="text-emerald-400">AI</span>
              </h1>
              <p className="text-sm text-slate-400">
                Intelligent Financial Assistant for Micro-Merchants
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchDebtors}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-slate-200 bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setEditingDebtor(null);
                setFormOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </motion.button>
          </div>
        </motion.header>

        <div className="mb-6">
          <AnalyticsDashboard
            totalOutstanding={analytics.totalOutstanding}
            activeDebtors={analytics.activeDebtors}
            recoveryRating={analytics.rating}
            recoveryScore={analytics.score}
            recoveryLabel={analytics.label}
            recoveryColor={analytics.color}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-700/50 p-5 mb-6 shadow-xl"
        >
          <VoiceEntrySimulator onTranscript={handleVoiceTranscript} />
          <AnimatePresence>
            {voiceText && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3"
              >
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300">
                      <span className="text-emerald-400 font-semibold">Voice captured:</span> "{voiceText}"
                    </p>
                    {voiceParsed && (
                      <p className="text-xs text-yellow-400 mt-1">{voiceParsed}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-5 flex flex-col md:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or transaction..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/50 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setRiskFilter(btn.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  riskFilter === btn.value
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800/60 text-slate-300 border border-slate-700/50 hover:bg-slate-700/60'
                }`}
              >
                {btn.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                  riskFilter === btn.value ? 'bg-emerald-600/50' : 'bg-slate-700/50'
                }`}>
                  {btn.count}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : (
          <LedgerTable
            debtors={filteredDebtors}
            onEdit={(d) => {
              setEditingDebtor(d);
              setFormOpen(true);
            }}
            sortBy={sortBy}
            onToggleSort={handleToggleSort}
          />
        )}

        <footer className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            CrediLedger AI — Smart Credit Management for Local Merchants
          </p>
        </footer>
      </div>

      <DebtorForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingDebtor(null);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
        debtor={editingDebtor}
      />
    </div>
  );
}
