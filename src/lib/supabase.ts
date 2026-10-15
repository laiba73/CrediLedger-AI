import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pellgypptklvqaefhvnb.supabase.co';
const supabaseAnonKey = 'sb_publishable_vwIwWAcgU0i0sJdzQomCEA_3wAyrVqA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type RiskStatus = 'green' | 'yellow' | 'red';

export interface Debtor {
  id: string;
  name: string;
  phone: string;
  balance: number;
  risk_status: RiskStatus;
  last_transaction: string;
  created_at: string;
  updated_at: string;
}

export type DebtorInsert = Omit<Debtor, 'id' | 'created_at' | 'updated_at'>;