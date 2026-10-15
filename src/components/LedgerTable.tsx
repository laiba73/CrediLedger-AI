import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, ArrowUpDown, Sparkles } from 'lucide-react';
import type { Debtor, RiskStatus } from '@/lib/supabase';
import SmartReminders from './SmartReminders';

interface LedgerTableProps {
  debtors: Debtor[];
  onEdit: (debtor: Debtor) => void;
  sortBy: 'name' | 'balance' | 'risk';
  onToggleSort: (field: 'name' | 'balance' | 'risk') => void;
}

const riskConfig: Record<
  RiskStatus,
  { dot: string; label: string; glow: string; badge: string; text: string }
> = {
  green: {
    dot: 'bg-emerald-400',
    label: 'Safe / Good History',
    glow: 'shadow-emerald-400/50 shadow-[0_0_10px]',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    text: 'text-emerald-400',
  },
  yellow: {
    dot: 'bg-yellow-400',
    label: 'Warning',
    glow: 'shadow-yellow-400/50 shadow-[0_0_10px]',
    badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    text: 'text-yellow-400',
  },
  red: {
    dot: 'bg-red-500',
    label: 'High Risk / Stop Credit',
    glow: 'shadow-red-500/50 shadow-[0_0_10px]',
    badge: 'bg-red-500/10 text-red-400 border-red-500/30',
    text: 'text-red-400',
  },
};

const riskOrder: Record<RiskStatus, number> = { red: 0, yellow: 1, green: 2 };

export default function LedgerTable({ debtors, onEdit, sortBy, onToggleSort }: LedgerTableProps) {
  if (debtors.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/80 border border-slate-700/50 p-12 text-center">
        <p className="text-slate-400 text-lg">No customers found.</p>
        <p className="text-slate-500 text-sm mt-1">Try adding a new customer or adjusting your search.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-800/50 border-b border-slate-700">
              <th className="px-4 py-4 text-left">
                <button
                  onClick={() => onToggleSort('name')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Customer Name
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortBy === 'name' ? 'text-emerald-400' : 'text-slate-500'}`} />
                </button>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider hidden md:table-cell">
                Phone
              </th>
              <th className="px-4 py-4 text-left">
                <button
                  onClick={() => onToggleSort('balance')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Balance
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortBy === 'balance' ? 'text-emerald-400' : 'text-slate-500'}`} />
                </button>
              </th>
              <th className="px-4 py-4 text-left">
                <button
                  onClick={() => onToggleSort('risk')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider hover:text-white transition-colors"
                >
                  AI Risk Status
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortBy === 'risk' ? 'text-emerald-400' : 'text-slate-500'}`} />
                </button>
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {debtors.map((debtor, index) => {
                const cfg = riskConfig[debtor.risk_status];
                return (
                  <motion.tr
                    key={debtor.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.4) }}
                    className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${
                          debtor.risk_status === 'green' ? 'from-emerald-500 to-green-600' :
                          debtor.risk_status === 'yellow' ? 'from-yellow-500 to-amber-600' :
                          'from-red-500 to-rose-600'
                        }`}>
                          {debtor.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{debtor.name}</p>
                          <p className="text-xs text-slate-500 md:hidden">{debtor.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-sm text-slate-400 font-mono">{debtor.phone}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-lg font-bold text-white">
                          ${debtor.balance.toFixed(2)}
                        </p>
                        {debtor.last_transaction && (
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">
                            {debtor.last_transaction}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <motion.div
                          whileHover={{ scale: 1.3 }}
                          className={`relative w-3.5 h-3.5 rounded-full ${cfg.dot} ${cfg.glow}`}
                        >
                          <motion.div
                            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                            className={`absolute inset-0 rounded-full ${cfg.dot}`}
                          />
                        </motion.div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <SmartReminders debtor={debtor} />
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onEdit(debtor)}
                          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
