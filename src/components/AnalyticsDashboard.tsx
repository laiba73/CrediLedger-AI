import { motion } from 'framer-motion';
import {
  Wallet,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';

interface DashboardProps {
  totalOutstanding: number;
  activeDebtors: number;
  recoveryRating: string;
  recoveryScore: number;
  recoveryLabel: string;
  recoveryColor: string;
}

export default function AnalyticsDashboard({
  totalOutstanding,
  activeDebtors,
  recoveryRating,
  recoveryScore,
  recoveryLabel,
  recoveryColor,
}: DashboardProps) {
  const cards = [
    {
      title: 'Total Outstanding Credit',
      value: `$${totalOutstanding.toFixed(2)}`,
      icon: Wallet,
      gradient: 'from-blue-500 to-cyan-500',
      glow: 'shadow-blue-500/25',
      subtitle: totalOutstanding > 0 ? 'Across all customers' : 'No outstanding debt',
      trend: totalOutstanding > 100 ? 'up' : 'flat',
    },
    {
      title: 'Active Debtors',
      value: activeDebtors.toString(),
      icon: Users,
      gradient: 'from-violet-500 to-purple-500',
      glow: 'shadow-violet-500/25',
      subtitle: activeDebtors === 1 ? '1 customer with balance' : `${activeDebtors} customers with balance`,
      trend: activeDebtors > 5 ? 'up' : 'flat',
    },
    {
      title: 'AI Cash Flow Recovery Rating',
      value: recoveryRating,
      icon: Activity,
      gradient: 'from-emerald-500 to-teal-500',
      glow: 'shadow-emerald-500/25',
      subtitle: `${recoveryLabel} • ${recoveryScore}/100`,
      isRating: true,
      recoveryColor,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={`relative overflow-hidden rounded-2xl bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 p-6 shadow-2xl ${card.glow}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-5`} />
            <div className="relative flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              {card.trend === 'up' && (
                <div className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  High
                </div>
              )}
              {card.trend === 'flat' && (
                <div className="flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-700/30 px-2 py-1 rounded-lg">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Stable
                </div>
              )}
            </div>
            <div className="relative">
              <p className="text-sm text-slate-400 font-medium mb-1">{card.title}</p>
              {card.isRating ? (
                <div className="flex items-baseline gap-3">
                  <motion.span
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.12 + 0.3, type: 'spring', stiffness: 200 }}
                    className={`text-5xl font-bold ${card.recoveryColor}`}
                  >
                    {card.value}
                  </motion.span>
                  <div className="flex-1">
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${recoveryScore}%` }}
                        transition={{ delay: index * 0.12 + 0.4, duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.12 + 0.2 }}
                  className="text-3xl font-bold text-white"
                >
                  {card.value}
                </motion.p>
              )}
              <p className="text-xs text-slate-500 mt-2">{card.subtitle}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
