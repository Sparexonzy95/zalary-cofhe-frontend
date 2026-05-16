# Zalary CoFHE Frontend

This is a clean new frontend project folder for the CoFHE version of Zalary.

## What this frontend preserves

It keeps the same user journey and route structure used in the previous frontend:

- `/`
- `/app`
- `/employer`
- `/employer/templates/new`
- `/employer/templates/:id`
- `/employer/runs/:runId`
- `/employee/claims`
- `/employee/claims/:claimId`

## What changed for CoFHE

The old Inco-specific cryptography path is replaced with direct browser-side CoFHE flows:

- `@cofhe/sdk/web`
- explicit self permits
- `decryptForView` for balances and salary display
- `decryptForTx` for proof-backed actions such as:
  - payroll activation
  - claim finalization or cancellation
  - withdrawal finalization

## Confirmed configuration used here

- Chain: Base Sepolia `84532`
- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- ConfidentialToken: `0x63E6700226c7f72038d3c3CA7fD36281ab38A930`
- PayrollVault: `0x2cCb5Dc0154884eD7CbE0A0facf3237c3d0913f3`
- SwapRouter: `0x08DB82D51E38969b2360E375380D86e90059CEd2`

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

## Important note about backend action endpoints

The DRF router endpoints are confirmed at `/api/v1/templates/`, `/api/v1/runs/`, `/api/v1/claims/`, `/api/v1/employees/:address/claimables/`, and `/api/v1/swaprouter/withdraws/...`.

The custom run and claim action endpoints are centralized in `src/lib/routes.ts`. They follow the same action names already used by the previous frontend and backend notes. If your current backend renamed any custom action, update only `src/lib/routes.ts`.

## Main files

- `src/lib/cofhe.ts` — CoFHE client, permits, encrypt/decrypt helpers
- `src/lib/abi.ts` — minimal contract ABIs
- `src/lib/routes.ts` — API endpoint map
- `src/hooks/` — all React Query hooks
- `src/pages/` — employer and employee pages

## Design choice

Where an old Inco endpoint name may have changed during the CoFHE backend port, this frontend uses fallback posting for the few finalize endpoints so you can keep moving without rewriting the whole app.
