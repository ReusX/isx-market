// ─── Market ────────────────────────────────────────────────────────────────

export type Sector = 'BANK' | 'IND' | 'SVC' | 'HTL' | 'AGR' | 'INS' | 'INV' | 'TEL'

export interface CompanyMeta {
  sym:   string
  ar:    string
  en:    string
  logo:  string
  sec:   Sector | string
  color: string
  mcap:  number  // millions IQD (static baseline)
}

export interface LiveStock {
  code:   string
  close:  number
  open:   number
  high:   number
  low:    number
  change: number
  pct:    number
  vol:    number
  deals:  number
}

export interface Company extends CompanyMeta {
  close:  number
  open:   number
  high:   number
  low:    number
  change: number
  pct:    number
  vol:    number
  deals:  number
}

export interface RsisxData {
  value:  string | number
  date:   string
  change: number
  pct:    number
}

export interface LiveData {
  updated: string
  stocks:  LiveStock[]
  rsisx:   RsisxData | null
  breadth: { up: number; dn: number; fl: number }
  sectors: Record<string, number>
}

// ─── Gamification ──────────────────────────────────────────────────────────

export type RankId = 'noob' | 'trader' | 'investor' | 'shark'

export interface Rank {
  id:    RankId
  en:    string
  ar:    string
  min:   number
  max:   number
  color: string
  icon:  string
}

export interface UserProfile {
  id:                    string
  username:              string | null
  email:                 string | null
  points:                number
  streak:                number
  streak_history:        string[]
  spin_cooldown_ends_at: string | null
  referral_code:         string | null
  rank:                  RankId
  watchlist:             string[]
  og_member:             boolean
  created_at:            string
}

// ─── Wallet / Transactions ──────────────────────────────────────────────────

export type TxKind = 'spin' | 'streak' | 'referral' | 'mission' | 'buy' | 'sell' | 'withdrawal'

export interface Transaction {
  id:         string
  user_id:    string
  kind:       TxKind
  points:     number        // positive = credit, negative = debit
  sym:        string | null // for buy/sell
  meta:       Record<string, any>
  created_at: string
}

export interface Holding {
  id:         string
  user_id:    string
  sym:        string
  shares:     number
  avg_price:  number        // IQD per share
  created_at: string
}

export interface WalletRequest {
  id:         string
  user_id:    string
  points:     number
  status:     'pending' | 'approved' | 'rejected'
  created_at: string
}

// ─── Referral ───────────────────────────────────────────────────────────────

export interface Referral {
  id:          string
  referrer_id: string
  referred_id: string
  reward_pts:  number
  claimed_at:  string
}

// ─── App state ──────────────────────────────────────────────────────────────

export type Lang = 'ar' | 'en'
export type Theme = 'dark' | 'light'
