import type { RiskStatus } from './supabase';

export interface ReminderTone {
  label: string;
  tone: string;
  message: string;
}

export function generateReminders(
  name: string,
  balance: number,
  risk: RiskStatus,
  lastTransaction: string
): ReminderTone[] {
  const firstName = name.split(' ')[0];
  const balanceStr = `$${balance.toFixed(2)}`;

  if (risk === 'green') {
    return [
      {
        label: 'Friendly',
        tone: 'friendly',
        message: `Hi ${firstName}! 😊 Hope you're doing well. Just a gentle reminder that your outstanding balance is ${balanceStr}. Whenever it's convenient for you, a payment would be appreciated. Thank you for being a valued customer!`,
      },
      {
        label: 'Polite Follow-up',
        tone: 'polite',
        message: `Dear ${firstName}, we hope everything is fine on your end. This is a friendly follow-up about your outstanding balance of ${balanceStr}. No rush at all — just keeping you in the loop. Wishing you a great day!`,
      },
      {
        label: 'Warm Reminder',
        tone: 'warm',
        message: `Hello ${firstName}! Just reaching out to remind you about your balance of ${balanceStr}. We truly appreciate your trust and partnership. Feel free to settle it whenever works best for you. Take care!`,
      },
    ];
  }

  if (risk === 'yellow') {
    return [
      {
        label: 'Firm',
        tone: 'firm',
        message: `Dear ${firstName}, this is a formal reminder regarding your outstanding balance of ${balanceStr}. We kindly request that you arrange payment at your earliest convenience. Please contact us if there are any issues with payment. Thank you.`,
      },
      {
        label: 'Direct Notice',
        tone: 'direct',
        message: `${firstName}, your account currently shows an outstanding balance of ${balanceStr} (${lastTransaction}). We need this resolved promptly. Please make a payment or contact us within 7 days to discuss a payment plan.`,
      },
      {
        label: 'Urgent Reminder',
        tone: 'urgent',
        message: `ATTENTION ${firstName.toUpperCase()}: Your outstanding balance of ${balanceStr} is now overdue. Immediate payment is expected. Failure to respond within 7 days may result in suspension of further credit. Please address this urgently.`,
      },
    ];
  }

  return [
    {
      label: 'Final Legal Notice',
      tone: 'legal',
      message: `FINAL NOTICE — ${name}. Your account is seriously in arrears with an outstanding balance of ${balanceStr}. Despite multiple reminders, no payment has been received. This is a FINAL NOTICE before legal proceedings. You have 72 HOURS to settle this amount in full. Failure to comply will result in legal action without further notice. All legal costs will be borne by you.`,
    },
    {
      label: 'Pre-Litigation Warning',
      tone: 'pre-litigation',
      message: `PRE-LITIGATION WARNING: ${name}. Outstanding debt: ${balanceStr}. This account is now being prepared for legal collection. You have 48 hours to contact us and arrange full payment. After this period, the matter will be referred to our legal representatives. This is your last opportunity to resolve this amicably.`,
    },
    {
      label: 'Collection Agency Referral',
      tone: 'collection',
      message: `NOTICE OF COLLECTION REFERRAL: ${name}. Debt amount: ${balanceStr}. Your account has been flagged for external collection. To avoid this, full payment must be received within 24 hours. Once referred to our collection agency, additional fees and legal charges will apply. Contact us immediately to halt this process.`,
    },
  ];
}

export function calculateRecoveryRating(
  totalOutstanding: number,
  activeDebtors: number,
  greenCount: number,
  yellowCount: number,
  redCount: number
): { rating: string; score: number; label: string; color: string } {
  if (activeDebtors === 0) {
    return { rating: 'A+', score: 100, label: 'Excellent', color: 'text-emerald-400' };
  }

  const greenWeight = 1.0;
  const yellowWeight = 0.5;
  const redWeight = 0.1;

  const weightedScore =
    (greenCount * greenWeight + yellowCount * yellowWeight + redCount * redWeight) /
    activeDebtors;

  const score = Math.round(weightedScore * 100);

  let rating: string;
  let label: string;
  let color: string;

  if (score >= 85) {
    rating = 'A+';
    label = 'Excellent';
    color = 'text-emerald-400';
  } else if (score >= 70) {
    rating = 'A';
    label = 'Very Good';
    color = 'text-emerald-400';
  } else if (score >= 55) {
    rating = 'B+';
    label = 'Good';
    color = 'text-yellow-400';
  } else if (score >= 40) {
    rating = 'B';
    label = 'Fair';
    color = 'text-yellow-400';
  } else if (score >= 25) {
    rating = 'C';
    label = 'At Risk';
    color = 'text-orange-400';
  } else {
    rating = 'D';
    label = 'Critical';
    color = 'text-red-400';
  }

  return { rating, score, label, color };
}

export function parseVoicePhrase(
  text: string
): { name: string; action: 'credit' | 'payment'; amount: number; item?: string } | null {
  const normalized = text.trim().replace(/\s+/g, ' ');

  // Payment patterns: "Fatima paid $300", "John pay 50", "Ali paid 25 dollars"
  const paymentMatch = normalized.match(
    /(\w+).*?\b(?:paid|pay|pays|payment of|gave)\b.*?\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars|bucks|rs)?/i
  );

  if (paymentMatch) {
    return {
      name: paymentMatch[1],
      action: 'payment',
      amount: parseFloat(paymentMatch[2]),
    };
  }

  // Credit patterns with item: "Fatima bought 3kg oil for $30", "Ali took 2kg sugar $5"
  // Handles "for $X", "$X", "X dollars", "X bucks" as price markers
  const creditWithItem = normalized.match(
    /(\w+).*?\b(?:took|bought|purchased|borrowed|got|owe[s]?)\b\s+(.+?)\s+(?:for\s+)?\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars|bucks|rs)?/i
  );

  if (creditWithItem) {
    const item = creditWithItem[2]
      .replace(/\b(?:for|price|cost|costing|amounting)\b.*$/i, '')
      .replace(/\$?\s*\d+.*$/, '')
      .trim();
    return {
      name: creditWithItem[1],
      action: 'credit',
      amount: parseFloat(creditWithItem[3]),
      item: item || undefined,
    };
  }

  // Credit with amount before item: "Ali took $5 of sugar", "Fatima owes 30 dollars for oil"
  const creditAmountFirst = normalized.match(
    /(\w+).*?\b(?:took|borrowed|owe[s]?|got)\b.*?\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars|bucks|rs)?\s*(?:of|for|worth of)?\s*(.+)/i
  );

  if (creditAmountFirst) {
    return {
      name: creditAmountFirst[1],
      action: 'credit',
      amount: parseFloat(creditAmountFirst[2]),
      item: creditAmountFirst[3].trim() || undefined,
    };
  }

  // Bare amount with name: "Fatima $300" or "Fatima 300 dollars"
  const bareAmount = normalized.match(/^(\w+).*?\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars|bucks|rs)?\s*$/i);
  if (bareAmount) {
    return {
      name: bareAmount[1],
      action: 'credit',
      amount: parseFloat(bareAmount[2]),
    };
  }

  return null;
}
