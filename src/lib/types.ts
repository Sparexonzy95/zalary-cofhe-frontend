export type Hex = `0x${string}`;

export type EncryptedInput = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: Hex;
};

export type ScheduleConfig = {
  id?: number;
  type: "instant" | "daily" | "weekly" | "monthly" | "yearly";
  start_at: string;
  end_at?: string | null;
  hour?: number;
  minute?: number;
  weekday?: number | null;
  day_of_month?: number | null;
  month_of_year?: number | null;
};

export type TemplateEmployee = {
  id?: number;
  employee_address: string;
  employee_name?: string;
  employee_email?: string;
  amount_atomic: number;
  is_active?: boolean;
};

export type PayrollTemplate = {
  id: number;
  chain: number;
  token_address: string;
  schedule: ScheduleConfig;
  title: string;
  payroll_name?: string | null;
  payroll_title?: string | null;
  template_title?: string | null;
  description: string;
  employer_address: string;
  company_name?: string | null;
  employer_company_name?: string | null;
  employer_name?: string | null;
  employer?: {
    company_name?: string | null;
    name?: string | null;
    wallet_address?: string | null;
    address?: string | null;
  } | null;
  status: string;
  next_run_at?: string | null;
  last_run_at?: string | null;
  employees?: TemplateEmployee[];
};

export type PayrollRun = {
  id: number;
  template: number;
  chain: number;
  run_at: string;
  deadline_u64: string | number;
  employee_count_u32: number;
  required_total_atomic: string | number;
  onchain_payroll_id?: string | number | null;
  employer_address?: string;
  status: string;
  last_error?: string;

  create_tx_hash?: string;
  fund_tx_hash?: string;
  activate_tx_hash?: string;

  funded_once_handle?: string;
  funded_plaintext?: boolean | null;
  funded_sig?: string;

  created_at?: string;
  updated_at?: string;
};

export type RunAllocation = {
  id?: number;
  run: number;

  employee_address: string;
  employee_name?: string;
  employee_email?: string;

  amount_atomic: string | number;
  amount_ciphertext_hex?: string;

  uploaded?: boolean;
  upload_tx_hash?: string;

  claim_invitation_sent_at?: string | null;
  deadline_3d_reminder_sent_at?: string | null;
  deadline_24h_reminder_sent_at?: string | null;
  claim_completion_reminder_sent_at?: string | null;

  claim_id?: number | null;
  claim_status?: string | null;
};

export type ClaimRecord = {
  id: number;
  run: number;
  employee_address: string;

  request_tx_hash?: string;
  finalize_tx_hash?: string;
  cancel_tx_hash?: string;

  request_id?: string;
  pending_ok_handle?: string;
  pending_request_id?: string;

  ok_plaintext?: boolean | null;
  ok_sig?: string;

  status: string;
  last_error?: string;

  run_onchain_payroll_id?: number | null;

  withdraw_id?: number | null;
  withdraw_key?: string | null;
  withdraw_status?: string | null;
  withdraw_request_tx_hash?: string | null;
  withdraw_finalize_tx_hash?: string | null;
  withdraw_cancel_tx_hash?: string | null;
};

export type EmployeeClaimable = {
  run_id: number;
  template_id: number;
  run_at: string;
  created_at?: string | null;
  updated_at?: string | null;
  deadline_u64: string;
  onchain_payroll_id: string;
  token_address: string;
  run_status: string;
  claim_status: string;
  claim_id: number | null;
  payroll_name?: string | null;
  payroll_title?: string | null;
  template_title?: string | null;
  company_name?: string | null;
  employer_company_name?: string | null;
  employer_name?: string | null;
  employer_address?: string | null;
  employer?: {
    company_name?: string | null;
    name?: string | null;
    wallet_address?: string | null;
    address?: string | null;
  } | null;
  template?: Partial<PayrollTemplate> | null;
};

export type SwapRouterWithdraw = {
  id: number;
  claim?: number;
  chain?: number;

  user_address: string;
  withdraw_key?: string | null;

  request_tx_hash?: string;
  finalize_tx_hash?: string;
  cancel_tx_hash?: string;

  request_id?: string;
  pending_amount_handle?: string;
  pending_ok_handle?: string;
  pending_request_id?: string;

  amount_plaintext?: string | number | null;
  amount_sig?: string;

  ok_plaintext?: boolean | null;
  ok_sig?: string;

  status: string;
  last_error?: string;

  created_at?: string;
  updated_at?: string;
};

export type FundingQuoteBreakdownItem = {
  employee?: string;
  employee_address?: string;
  employee_name?: string;
  employee_email?: string;
  amount_atomic: string;
};

export type FundingQuote = {
  run_id: number;
  run_at: string;
  employee_count: number;
  required_total_atomic: string;
  breakdown: FundingQuoteBreakdownItem[];
};
