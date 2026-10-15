import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import type { Debtor, RiskStatus } from '@/lib/supabase';

interface DebtorFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    phone: string,
    balance: number,
    riskStatus: RiskStatus,
    lastTransaction: string
  ) => void;
  onDelete?: (id: string) => void;
  debtor?: Debtor | null;
}

export default function DebtorForm({ open, onClose, onSave, onDelete, debtor }: DebtorFormProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {debtor ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
                const balance = parseFloat((form.elements.namedItem('balance') as HTMLInputElement).value) || 0;
                const riskStatus = (form.elements.namedItem('risk') as HTMLSelectElement).value as RiskStatus;
                const lastTransaction = (form.elements.namedItem('lastTx') as HTMLInputElement).value;
                onSave(name, phone, balance, riskStatus, lastTransaction);
                form.reset();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Customer Name</label>
                <input
                  name="name"
                  required
                  defaultValue={debtor?.name || ''}
                  placeholder="e.g. Ali Ahmed"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone Number</label>
                <input
                  name="phone"
                  defaultValue={debtor?.phone || ''}
                  placeholder="+92 300 1234567"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Balance ($)</label>
                  <input
                    name="balance"
                    type="number"
                    step="0.01"
                    defaultValue={debtor?.balance || ''}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Risk Status</label>
                  <select
                    name="risk"
                    defaultValue={debtor?.risk_status || 'green'}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  >
                    <option value="green">Green — Safe</option>
                    <option value="yellow">Yellow — Warning</option>
                    <option value="red">Red — High Risk</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Last Transaction (optional)</label>
                <input
                  name="lastTx"
                  defaultValue={debtor?.last_transaction || ''}
                  placeholder="e.g. Took 2kg sugar - $5"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold bg-gradient-to-r from-emerald-500 to-green-600 hover:shadow-lg hover:shadow-emerald-500/30 text-white transition-all"
                >
                  {debtor ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {debtor ? 'Update Customer' : 'Add Customer'}
                </button>
                {debtor && onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(debtor.id);
                      onClose();
                    }}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
