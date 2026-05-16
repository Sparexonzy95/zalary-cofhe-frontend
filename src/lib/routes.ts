export const routes = {
  templates: {
    list: (employer?: string) =>
      employer
        ? `/api/v1/templates/?employer_address=${encodeURIComponent(employer)}`
        : "/api/v1/templates/",

    detail: (id: string | number) => `/api/v1/templates/${id}/`,
    activate: (id: string | number) => `/api/v1/templates/${id}/activate/`,
    previewRuns: (id: string | number) => `/api/v1/templates/${id}/preview_runs/`,
    runs: (id: string | number) => `/api/v1/templates/${id}/runs/`,
    createNextRun: (id: string | number) => `/api/v1/templates/${id}/create_next_run/`,
  },

  runs: {
    detail: (id: string | number) => `/api/v1/runs/${id}/`,
    fundingQuote: (id: string | number) => `/api/v1/runs/${id}/funding_quote/`,
    fundingContext: (id: string | number) => `/api/v1/runs/${id}/funding_context/`,

    fundedOnceHandle: (id: string | number, employerAddress: string) =>
      `/api/v1/runs/${id}/funded_once_handle/?employer_address=${encodeURIComponent(
        employerAddress
      )}`,

    submitCreateOnchain: (id: string | number) => `/api/v1/runs/${id}/create_payroll/`,
    submitUploadAllocationsChunk: (id: string | number) => `/api/v1/runs/${id}/upload_allocations/`,
    submitFinalizeAllocations: (id: string | number) => `/api/v1/runs/${id}/finalize_allocations/`,
    submitFund: (id: string | number) => `/api/v1/runs/${id}/fund_payroll/`,
    submitActivate: (id: string | number) => `/api/v1/runs/${id}/activate_payroll/`,
  },

  claims: {
    create: "/api/v1/claims/",
    list: "/api/v1/claims/",
    detail: (id: string | number) => `/api/v1/claims/${id}/`,

    submitRequestClaim: (id: string | number) => `/api/v1/claims/${id}/submit_request_claim/`,
    syncPending: (id: string | number) => `/api/v1/claims/${id}/sync_pending/`,
    submitFinalizeClaim: (id: string | number) => `/api/v1/claims/${id}/submit_finalize_claim/`,
    submitCancelClaim: (id: string | number) => `/api/v1/claims/${id}/submit_cancel_claim/`,
  },

  employees: {
    claimables: (address: string) => `/api/v1/employees/${address}/claimables/`,
  },

  withdraws: {
    create: "/api/v1/swaprouter/withdraws/",
    detail: (id: string | number) => `/api/v1/swaprouter/withdraws/${id}/`,

    submitRequest: (id: string | number) => `/api/v1/swaprouter/withdraws/${id}/submit_request/`,
    syncPending: (id: string | number) => `/api/v1/swaprouter/withdraws/${id}/sync_pending/`,
    submitFinalize: (id: string | number) => `/api/v1/swaprouter/withdraws/${id}/submit_finalize/`,
    submitFinalizeFallback: (id: string | number) =>
      `/api/v1/swaprouter/withdraws/${id}/submit_finalize_with_payload/`,
  },
};