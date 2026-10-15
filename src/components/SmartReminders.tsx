import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, FileWarning, Heart, ShieldAlert } from 'lucide-react';
import type { Debtor, RiskStatus } from '@/lib/supabase';
import { generateReminders, type ReminderTone } from '@/lib/aiHelpers';

interface SmartRemindersProps {
  debtor: Debtor;
}

const toneIcons: Record<string, typeof Heart> = {
  friendly: Heart,
  polite: Heart,
  warm: Heart,
  firm: ShieldAlert,
  direct: ShieldAlert,
  urgent: ShieldAlert,
  legal: FileWarning,
  'pre-litigation': FileWarning,
  collection: FileWarning,
};

const toneColors: Record<string, string> = {
  friendly: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  polite: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  warm: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  firm: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  direct: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  urgent: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  legal: 'text-red-400 bg-red-500/10 border-red-500/30',
  'pre-litigation': 'text-red-400 bg-red-500/10 border-red-500/30',
  collection: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const riskLabel: Record<RiskStatus, string> = {
  green: 'Safe / Good History',
  yellow: 'Warning — Monitor',
  red: 'High Risk — Stop Credit',
};

export default function SmartReminders({ debtor }: SmartRemindersProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const reminders: ReminderTone[] = generateReminders(
    debtor.name,
    debtor.balance,
    debtor.risk_status,
    debtor.last_transaction
  );

  const sendWhatsApp = (message: string) => {
    const phone = debtor.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const copyText = (message: string, id: string) => {
    navigator.clipboard.writeText(message);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 border border-slate-600/50 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
        Smart Reminder
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl"
            >
              <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-5 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Smart AI Reminders</h3>
                    <p className="text-sm text-slate-400">
                      {debtor.name} • {riskLabel[debtor.risk_status]}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {reminders.map((reminder, index) => {
                  const Icon = toneIcons[reminder.tone] || Heart;
                  return (
                    <motion.div
                      key={reminder.tone}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`rounded-xl border p-4 ${toneColors[reminder.tone]}`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-bold uppercase tracking-wide">{reminder.label}</span>
                        <span className="ml-auto text-xs text-slate-400">
                          Tone: {reminder.tone}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed mb-4 whitespace-pre-line">
                        {reminder.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => sendWhatsApp(reminder.message)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 text-white transition-colors shadow-lg shadow-green-500/20"
                        >
                          <Send className="w-4 h-4" />
                          Send via WhatsApp
                        </motion.button>
                        <button
                          onClick={() => copyText(reminder.message, reminder.tone)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 transition-colors"
                        >
                          {copied === reminder.tone ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
