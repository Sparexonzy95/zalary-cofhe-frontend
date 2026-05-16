export const API_PREFIX = "/api/v1";

export const routes = {
  templates: {
    list: (employer?: string) =>
      employer
        ? `${API_PREFIX}/templates/?employer_address=${encodeURIComponent(employer)}`
        : `${API_PREFIX}/templates/`,

    detail: (id: string | number) => `${API_PREFIX}/templates/${id}/`,
    activate: (id: string | number) => `${API_PREFIX}/templates/${id}/activate/`,
    previewRuns: (id: string | number) => `${API_PREFIX}/templates/${id}/preview_runs/`,
    runs: (id: string | number) => `${API_PREFIX}/templates/${id}/runs/`,
    createNextRun: (id: string | number) => `${API_PREFIX}/templates/${id}/create_next_run/`,
  },

  runs: {
    detail: (id: string | number) => `${API_PREFIX}/runs/${id}/`,
    allocations: (id: string | number) => `${API_PREFIX}/runs/${id}/allocations/`,
    fundingQuote: (id: string | number) => `${API_PREFIX}/runs/${id}/funding_quote/`,
    fundingContext: (id: string | number) => `${API_PREFIX}/runs/${id}/funding_context/`,

    fundedOnceHandle: (id: string | number, employerAddress: string) =>
      `${API_PREFIX}/runs/${id}/funded_once_handle/?employer_address=${encodeURIComponent(
        employerAddress
      )}`,

    submitCreateOnchain: (id: string | number) => `${API_PREFIX}/runs/${id}/create_payroll/`,
    submitUploadAllocationsChunk: (id: string | number) =>
      `${API_PREFIX}/runs/${id}/upload_allocations/`,
    submitFinalizeAllocations: (id: string | number) =>
      `${API_PREFIX}/runs/${id}/finalize_allocations/`,
    submitFund: (id: string | number) => `${API_PREFIX}/runs/${id}/fund_payroll/`,
    submitActivate: (id: string | number) => `${API_PREFIX}/runs/${id}/activate_payroll/`,
  },

  claims: {
    create: `${API_PREFIX}/claims/`,
    list: `${API_PREFIX}/claims/`,
    detail: (id: string | number) => `${API_PREFIX}/claims/${id}/`,

    submitRequestClaim: (id: string | number) =>
      `${API_PREFIX}/claims/${id}/submit_request_claim/`,
    syncPending: (id: string | number) => `${API_PREFIX}/claims/${id}/sync_pending/`,
    submitFinalizeClaim: (id: string | number) =>
      `${API_PREFIX}/claims/${id}/submit_finalize_claim/`,
    submitCancelClaim: (id: string | number) =>
      `${API_PREFIX}/claims/${id}/submit_cancel_claim/`,
  },

  employees: {
    claimables: (address: string) => `${API_PREFIX}/employees/${address}/claimables/`,
  },

  withdraws: {
    create: `${API_PREFIX}/swaprouter/withdraws/`,
    detail: (id: string | number) => `${API_PREFIX}/swaprouter/withdraws/${id}/`,

    submitRequest: (id: string | number) =>
      `${API_PREFIX}/swaprouter/withdraws/${id}/submit_request/`,
    syncPending: (id: string | number) =>
      `${API_PREFIX}/swaprouter/withdraws/${id}/sync_pending/`,
    submitFinalize: (id: string | number) =>
      `${API_PREFIX}/swaprouter/withdraws/${id}/submit_finalize/`,
    submitFinalizeFallback: (id: string | number) =>
      `${API_PREFIX}/swaprouter/withdraws/${id}/submit_finalize_with_payload/`,
  },

  onboarding: {
    nonce: `${API_PREFIX}/onboarding/auth/nonce/`,
    verify: `${API_PREFIX}/onboarding/auth/verify/`,
    logout: `${API_PREFIX}/onboarding/auth/logout/`,
    profile: `${API_PREFIX}/onboarding/profile/`,
    employerProfile: `${API_PREFIX}/onboarding/profile/employer/`,
    employeeProfile: `${API_PREFIX}/onboarding/profile/employee/`,
    privateAccess: `${API_PREFIX}/onboarding/profile/employee/private-access/`,
    requestCode: `${API_PREFIX}/onboarding/email/request-code/`,
    verifyEmail: `${API_PREFIX}/onboarding/email/verify/`,
  },
};