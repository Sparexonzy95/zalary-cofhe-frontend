export const routes = {
  templates: {
    list: (employer?: string) =>
      employer ? `/templates/?employer_address=${encodeURIComponent(employer)}` : "/templates/",
    detail: (id: string | number) => `/templates/${id}/`,
    activate: (id: string | number) => `/templates/${id}/activate/`,
    previewRuns: (id: string | number) => `/templates/${id}/preview_runs/`,
    runs: (id: string | number) => `/templates/${id}/runs/`,
    createNextRun: (id: string | number) => `/templates/${id}/create_next_run/`
  },

  runs: {
    detail: (id: string | number) => `/runs/${id}/`,
    fundingQuote: (id: string | number) => `/runs/${id}/funding_quote/`,
    fundingContext: (id: string | number) => `/runs/${id}/funding_context/`,
    fundedOnceHandle: (id: string | number, employerAddress: string) =>
      `/runs/${id}/funded_once_handle/?employer_address=${encodeURIComponent(employerAddress)}`,

    submitCreateOnchain: (id: string | number) => `/runs/${id}/create_payroll/`,
    submitUploadAllocationsChunk: (id: string | number) => `/runs/${id}/upload_allocations/`,
    submitFinalizeAllocations: (id: string | number) => `/runs/${id}/finalize_allocations/`,
    submitFund: (id: string | number) => `/runs/${id}/fund_payroll/`,
    submitActivate: (id: string | number) => `/runs/${id}/activate_payroll/`,
  },

  claims: {
    create: "/claims/",
    list: "/claims/",
    detail: (id: string | number) => `/claims/${id}/`,
    submitRequestClaim: (id: string | number) => `/claims/${id}/submit_request_claim/`,
    syncPending: (id: string | number) => `/claims/${id}/sync_pending/`,
    submitFinalizeClaim: (id: string | number) => `/claims/${id}/submit_finalize_claim/`,
    submitCancelClaim: (id: string | number) => `/claims/${id}/submit_cancel_claim/`
  },

  employees: {
    claimables: (address: string) => `/employees/${address}/claimables/`
  },

  withdraws: {
    create: "/swaprouter/withdraws/",
    detail: (id: string | number) => `/swaprouter/withdraws/${id}/`,
    submitRequest: (id: string | number) => `/swaprouter/withdraws/${id}/submit_request/`,
    syncPending: (id: string | number) => `/swaprouter/withdraws/${id}/sync_pending/`,
    submitFinalize: (id: string | number) => `/swaprouter/withdraws/${id}/submit_finalize/`,
    submitFinalizeFallback: (id: string | number) => `/swaprouter/withdraws/${id}/submit_finalize_with_payload/`
  }
};