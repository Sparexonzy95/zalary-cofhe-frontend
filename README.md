# Zalary, Confidential Payroll Frontend

Payroll cannot move fully on-chain if salary data is exposed publicly.

Zalary fixes that with confidential payroll flows powered by Zama FHE.

This repository contains the frontend application for Zalary: the user-facing layer that connects employers and employees to onboarding, payroll templates, payroll runs, encrypted salary allocation workflows, claim discovery, claim finalization, and withdrawal flows.

The frontend applies the dark glass CoFHE design pattern to the Zama backend model while preserving the payroll product journey.

---

## TL;DR

Zalary is confidential payroll infrastructure for teams that want stablecoin payroll without public salary exposure.

This frontend gives employers a clean interface to:

- connect and verify a wallet
- complete employer onboarding
- create payroll templates
- add employees and salary allocations
- schedule payroll runs
- review funding requirements
- create payroll runs
- coordinate encrypted salary handles
- fund payroll
- activate payroll
- track payroll status

It gives employees a simple interface to:

- connect and verify a wallet
- complete employee onboarding
- discover claimable payroll
- open claim details
- follow claim state
- finalize claims
- initiate withdrawals

Think **Stripe for payroll**, but salaries are not publicly readable on-chain.

---

## Frontend Deliverable

This repository contains the public frontend implementation for the Zalary confidential payroll application.

It includes:

- React + Vite + TypeScript application structure
- employer and employee route flows
- wallet connection and onboarding gate
- protected role-based dashboard
- payroll template creation flow
- payroll run detail flow
- employee claim dashboard
- employee claim detail flow
- reusable UI components
- dark glassmorphism visual system
- Zalary landing page
- API client integration
- React Query data layer
- frontend environment configuration
- Zama backend endpoint expectations
- viem worker URL configuration
- Sepolia contract configuration

Runtime secrets, private keys, wallet credentials, backend `.env` values, deployment credentials, and local build artifacts must not be committed.

---

## Review in 3 Minutes

| What to Review | Where |
|---|---|
| Frontend entry point | [`src/main.tsx`](src/main.tsx) |
| Route map | [`src/app/router.tsx`](src/app/router.tsx) |
| Dashboard shell | [`src/app/AppDashboard.tsx`](src/app/AppDashboard.tsx) |
| Query client | [`src/app/queryClient.ts`](src/app/queryClient.ts) |
| Wallet logic | [`src/lib/wallet.ts`](src/lib/wallet.ts) |
| Onboarding logic | [`src/lib/onboarding.ts`](src/lib/onboarding.ts) |
| API client | [`src/lib/api.ts`](src/lib/api.ts) |
| Environment loader | [`src/lib/env.ts`](src/lib/env.ts) |
| Shared UI components | [`src/components/`](src/components/) |
| Employer dashboard | [`src/pages/employer/EmployerDashboardPage.tsx`](src/pages/employer/EmployerDashboardPage.tsx) |
| Create payroll template | [`src/pages/employer/CreateTemplatePage.tsx`](src/pages/employer/CreateTemplatePage.tsx) |
| Payroll template detail | [`src/pages/employer/TemplateDetailPage.tsx`](src/pages/employer/TemplateDetailPage.tsx) |
| Payroll run detail | [`src/pages/employer/RunDetailPage.tsx`](src/pages/employer/RunDetailPage.tsx) |
| Employee claims dashboard | [`src/pages/employee/ClaimsDashboardPage.tsx`](src/pages/employee/ClaimsDashboardPage.tsx) |
| Employee claim detail | [`src/pages/employee/ClaimDetailPage.tsx`](src/pages/employee/ClaimDetailPage.tsx) |
| Environment structure | [`.env.example`](.env.example) |
| Package scripts and dependencies | [`package.json`](package.json) |

---

## The Problem

Payroll is one of the most sensitive financial workflows in the world.

Public blockchains are transparent by default. That makes them powerful for settlement, but unsafe for salary operations.

If payroll runs directly on a public chain without confidentiality:

- employee salaries become visible
- company compensation structures leak
- contributor payment history becomes public
- treasury spending can be tracked forever
- competitors can inspect workforce cost
- confidential compensation agreements become difficult to honor
- employees lose financial privacy

Zalary exists because payroll needs the speed and programmability of on-chain settlement without exposing salary data.

The frontend is the layer that makes this usable for real people.

---

## What This Frontend Proves

The smart contracts and backend provide the confidential payroll foundation.

This frontend proves that the protocol can be turned into a usable payroll application.

It supports:

- wallet-first onboarding
- employer identity setup
- employee identity setup
- protected employer workspace
- protected employee workspace
- payroll template creation
- payroll scheduling
- payroll run review
- funding visibility
- encrypted salary handle coordination
- employee claim discovery
- claim status tracking
- withdrawal flow visibility
- responsive dashboard navigation
- polished product experience

The frontend turns Zalary from backend infrastructure into a real payroll product.

---

## Why Frontend Integration Matters

Confidential payroll is not just a cryptography problem.

A real payroll product needs a user interface that helps people understand:

- which wallet is connected
- whether onboarding is complete
- whether they are acting as an employer or employee
- which payroll templates exist
- which run needs action
- whether payroll has been funded
- whether encrypted values are ready
- whether activation is pending
- whether an employee has claimable salary
- whether claim finalization is ready
- whether withdrawal is pending or completed

Without a clear frontend, confidential payroll becomes too technical for normal users.

Zalary’s frontend hides the operational complexity behind a guided employer and employee journey.

---

## System Architecture

```text
User Browser
    │
    ▼
React + Vite Frontend
    │
    ├── Wallet Provider / Browser Wallet
    │
    ├── Zalary UI State
    │
    ├── React Query Data Layer
    │
    └── API Client
            │
            ▼
Django / DRF Backend
            │
            ▼
Viem Worker / Zama Worker
            │
            ▼
Zama FHE Contracts
            │
            ▼
Ethereum Sepolia
```

The frontend does not replace the backend or worker.

It coordinates user intent, collects required wallet/action data, displays backend state, and guides users through the payroll lifecycle.

---

## Frontend Stack

| Layer | Technology |
|---|---|
| Framework | React |
| Build tool | Vite |
| Language | TypeScript |
| Routing | React Router |
| Data fetching | TanStack React Query |
| HTTP client | Axios |
| Wallet / chain utilities | viem |
| UI icons | lucide-react |
| Animation | framer-motion |
| Styling | Tailwind CSS + custom CSS variables |
| Fonts | Mona Sans + Fira Mono |
| Product tour | Reactour |
| Network target | Ethereum Sepolia |
| Confidential backend model | Zama FHE |

---

## Core Product Flows

### 1. Landing Flow

The landing page introduces Zalary as confidential payroll infrastructure.

Users can enter the app and choose the appropriate role journey:

```text
/
  → /app
  → role selection
  → employer or employee verification
```

---

### 2. Wallet Verification Flow

Before a user can access protected payroll functionality, the frontend verifies wallet identity.

```text
User opens role flow
  → connect wallet
  → request backend nonce
  → sign verification message
  → backend verifies signature
  → onboarding profile is loaded
  → user is routed to the correct workspace
```

Routes:

```text
/verify/employer
/verify/employee
```

---

### 3. Employer Onboarding Flow

Employers must complete company and work identity setup before accessing payroll management.

```text
Connect wallet
  → verify wallet
  → complete employer onboarding
  → confirm email/profile state
  → access employer dashboard
```

Routes:

```text
/onboarding/employer
/employer
```

---

### 4. Employee Onboarding Flow

Employees must complete identity and notification preferences before viewing claimable payroll.

```text
Connect wallet
  → verify wallet
  → complete employee onboarding
  → enable private access
  → access claims dashboard
```

Routes:

```text
/onboarding/employee
/employee/claims
```

---

### 5. Employer Payroll Flow

The employer flow supports the full payroll lifecycle from template creation to run management.

```text
Employer dashboard
  → create payroll template
  → add employees
  → configure salary allocations
  → choose payroll schedule
  → activate template
  → create payroll run
  → review funding quote
  → create payroll on-chain
  → upload encrypted handles
  → finalize allocations
  → fund payroll
  → activate payroll
  → monitor payroll status
```

Routes:

```text
/employer
/employer/templates/new
/employer/templates/:id
/employer/runs/:runId
```

---

### 6. Employee Claim Flow

The employee flow is designed around claim discovery and guided claim finalization.

```text
Employee claims dashboard
  → discover claimable payroll
  → open claim detail
  → request claim
  → wait for proof/readiness state
  → finalize claim
  → initiate withdrawal
  → monitor withdrawal state
```

Routes:

```text
/employee/claims
/employee/claims/:claimId
```

---

## Route Surface

The current frontend route structure is:

| Route | Purpose |
|---|---|
| `/` | Public landing page |
| `/app` | App welcome / role entry |
| `/verify/employer` | Employer wallet verification |
| `/verify/employee` | Employee wallet verification |
| `/onboarding/employer` | Employer onboarding |
| `/onboarding/employee` | Employee onboarding |
| `/account` | Connected account view |
| `/employer` | Employer dashboard |
| `/employer/templates/new` | Create payroll template |
| `/employer/templates/:id` | Payroll template detail |
| `/employer/runs/:runId` | Payroll run detail |
| `/employee/claims` | Employee claim dashboard |
| `/employee/claims/:claimId` | Employee claim detail |
| `*` | Not found page |

Protected employer and employee pages are wrapped by onboarding checks.

---

## Backend API Expectations

The frontend expects the Django/Zama backend to expose payroll and onboarding endpoints.

### Payroll / On-chain State Endpoints

```text
/api/cofhe/templates/
/api/cofhe/runs/
/api/cofhe/claims/
/api/cofhe/employees/<address>/claimables/
/api/cofhe/swaprouter/withdraws/
```

### Onboarding Endpoints

```text
/api/v1/onboarding/auth/nonce/
/api/v1/onboarding/auth/verify/
/api/v1/onboarding/profile/
/api/v1/onboarding/profile/employer/
/api/v1/onboarding/profile/employee/
/api/v1/onboarding/email/verify/
```

### Important Backend Action Data

For encrypted on-chain writes, the frontend/backend flow must preserve worker and contract action fields such as:

```text
tx_hash
sender
nonce
handle
inputProof
input_proof
decryption_proof
```

The frontend reads and writes the Django Zama model.

The worker and contract layer remain responsible for real encrypted on-chain execution.

---

## Environment Variables

Create `.env` from `.env.example`.

```bash
cp .env.example .env
```

Expected variables:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_API_KEY=change-me-to-your-backend-api-key
VITE_CHAIN_ID=11155111
VITE_CHAIN_NAME=Ethereum Sepolia
VITE_CONFIDENTIAL_TOKEN_ADDRESS=0xeb517F61CA9cbffa93ddB4a1452257AeF41058B3
VITE_PAYROLL_VAULT_ADDRESS=0x2C4C63213Ac5b0fd23B6f468709137C9d80C82B7
VITE_SWAP_ROUTER_ADDRESS=0x95FB006A9f3493b69054BcdcA5Cf96C5C43e91Da
VITE_CHAIN_DB_ID=1
VITE_VIEM_WORKER_URL=/zama-worker
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

### Environment Variable Reference

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL for the Django backend |
| `VITE_API_KEY` | API key used when backend endpoints require it |
| `VITE_CHAIN_ID` | Target EVM chain ID |
| `VITE_CHAIN_NAME` | Human-readable chain name shown in the UI |
| `VITE_CONFIDENTIAL_TOKEN_ADDRESS` | Confidential token contract address |
| `VITE_PAYROLL_VAULT_ADDRESS` | Payroll vault contract address |
| `VITE_SWAP_ROUTER_ADDRESS` | SwapRouter contract address |
| `VITE_CHAIN_DB_ID` | Backend chain database ID |
| `VITE_VIEM_WORKER_URL` | Worker URL or proxy path used by frontend/worker flows |
| `VITE_RPC_URL` | RPC URL for chain reads and wallet/worker coordination |

---

## Setup

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd zalary-zama-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 4. Edit Environment Values

```bash
notepad .env
```

Set the backend URL, API key, worker URL, RPC URL, and contract addresses for your active deployment.

### 5. Start the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

---

## Build

Run a production build:

```bash
npm run build
```

The build script type-checks the app and creates a Vite production build.

Preview the production build locally:

```bash
npm run preview
```

---

## Package Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start local Vite development server |
| `npm run build` | Type-check and build production frontend |
| `npm run preview` | Preview built frontend locally |

---

## Repository Structure

```text
zalary-zama-frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── AppDashboard.tsx
│   │   ├── queryClient.ts
│   │   └── router.tsx
│   ├── assets/
│   ├── components/
│   │   ├── tour/
│   │   ├── zalary/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Field.tsx
│   │   ├── RequireOnboarding.tsx
│   │   ├── Toast.tsx
│   │   ├── ui.tsx
│   │   └── WalletConnectButton.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── env.ts
│   │   ├── format.ts
│   │   ├── onboarding.ts
│   │   ├── routes.ts
│   │   ├── types.ts
│   │   └── wallet.ts
│   ├── pages/
│   │   ├── employer/
│   │   │   ├── EmployerDashboardPage.tsx
│   │   │   ├── CreateTemplatePage.tsx
│   │   │   ├── TemplateDetailPage.tsx
│   │   │   └── RunDetailPage.tsx
│   │   ├── employee/
│   │   │   ├── ClaimsDashboardPage.tsx
│   │   │   └── ClaimDetailPage.tsx
│   │   ├── onboarding/
│   │   │   ├── VerifyWallet.tsx
│   │   │   ├── EmployerOnboarding.tsx
│   │   │   └── EmployeeOnboarding.tsx
│   │   ├── AccountPage.tsx
│   │   ├── LandingPage.tsx
│   │   └── WelcomePage.tsx
│   ├── styles/
│   └── main.tsx
├── .env.example
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

---

## Design System

The frontend uses a dark, polished, glassmorphism interface designed for a confidential finance product.

Design principles:

- dark neutral base
- restrained yellow/orange accent
- minimal gradients
- glass cards
- compact dashboard components
- wallet-first navigation
- clear employer/employee separation
- professional payroll software layout
- guided states for complex on-chain actions
- responsive sidebar and mobile topbar
- motion used for clarity, not decoration

Core visual elements include:

- Zalary logo in sidebar/topbar
- role-based navigation
- encrypted/decrypt-style hover text animation
- wallet status display
- status badges
- cards and stat cards
- empty states
- loading states
- error states
- dashboard tour overlays

---

## State and Data Flow

The frontend uses React Query to manage server state.

Default query behavior:

```text
retry: 1
refetchOnWindowFocus: false
staleTime: 20 seconds
```

This keeps payroll data responsive without constantly refetching every time the browser window regains focus.

Typical data flow:

```text
Page component
  → hook or API function
  → Axios API client
  → Django backend
  → backend model / worker / chain state
  → response
  → React Query cache
  → UI state update
```

---

## Onboarding Guard

Protected routes use onboarding checks before rendering sensitive employer or employee pages.

The guard checks:

- whether profile data is loading
- whether a backend auth token exists
- whether the profile exists
- whether the connected wallet matches the profile wallet
- whether the user completed onboarding for the selected role

If the user is not ready, the frontend redirects them to the correct verification or onboarding route.

```text
Employer protected route
  → /verify/employer
  → /onboarding/employer
  → /employer

Employee protected route
  → /verify/employee
  → /onboarding/employee
  → /employee/claims
```

---

## Employer Workspace

The employer workspace is the payroll command center.

It is responsible for showing:

- employer identity state
- active payroll templates
- template status
- employee counts
- payroll run status
- actions that require employer attention
- funding requirements
- activation progress
- historical payroll context

Primary employer pages:

| Page | Responsibility |
|---|---|
| Employer Dashboard | Overview of employer payroll activity |
| Create Template | Create payroll, employees, schedule, and salary allocation data |
| Template Detail | Review template, activate it, preview/generate runs |
| Run Detail | Manage a specific payroll run through create, allocation, funding, activation |

---

## Employee Workspace

The employee workspace is focused on claim clarity.

It is responsible for showing:

- connected employee wallet
- available claimable payroll
- claim status
- pending proof or finalization state
- withdrawal status
- next action guidance

Primary employee pages:

| Page | Responsibility |
|---|---|
| Claims Dashboard | Lists claimable payroll for the connected employee |
| Claim Detail | Guides claim request, finalization, and withdrawal flow |

---

## Contract / Chain Context

Current frontend configuration targets:

| Item | Value |
|---|---|
| Chain | Ethereum Sepolia |
| Chain ID | `11155111` |
| Confidential Token | `0xeb517F61CA9cbffa93ddB4a1452257AeF41058B3` |
| Payroll Vault | `0x2C4C63213Ac5b0fd23B6f468709137C9d80C82B7` |
| SwapRouter | `0x95FB006A9f3493b69054BcdcA5Cf96C5C43e91Da` |
| Worker path | `/zama-worker` |
| Default RPC | `https://ethereum-sepolia-rpc.publicnode.com` |

These values can be changed through `.env`.

---

## Local Development Checklist

Before running the frontend, confirm:

- Node.js is installed
- dependencies are installed with `npm install`
- `.env` exists
- `VITE_API_BASE_URL` points to the running backend
- `VITE_API_KEY` matches backend expectations
- backend migrations have been applied
- backend server is running
- worker endpoint is reachable if using encrypted action flows
- wallet is connected to Ethereum Sepolia
- test wallet has Sepolia ETH for gas
- contract addresses match backend chain config

---

## Production Deployment Notes

For production deployment:

1. Build the frontend.

```bash
npm run build
```

2. Deploy the generated `dist/` folder to a static host such as Vercel, Netlify, Cloudflare Pages, or Nginx.

3. Set production environment variables in the hosting dashboard.

4. Make sure the backend allows the frontend production origin through CORS.

5. Make sure worker proxy paths are correctly mapped.

Example production environment shape:

```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_API_KEY=<production-api-key>
VITE_CHAIN_ID=11155111
VITE_CHAIN_NAME=Ethereum Sepolia
VITE_VIEM_WORKER_URL=/zama-worker
VITE_RPC_URL=<production-rpc-url>
```

If using Vercel rewrites or Nginx reverse proxy, ensure:

```text
/frontend route
  → serves React app

/api/*
  → proxies to Django backend

/zama-worker/*
  → proxies to worker service
```

---

## Security Notes

The frontend follows a simple security rule:

> Never commit secrets, private keys, or production credentials.

Do not commit:

- `.env`
- wallet private keys
- backend API secrets
- RPC provider secrets
- deployment credentials
- local build artifacts
- local logs
- local cache files
- `node_modules`
- `dist`

Frontend environment variables are visible in the browser after build.

Do not place sensitive secrets in any `VITE_*` variable unless they are safe to expose publicly.

Backend-only secrets must stay on the backend.

---

## Known Integration Boundaries

The frontend is not responsible for:

- generating backend database records directly
- storing private keys
- replacing the viem/Zama worker
- bypassing backend onboarding checks
- independently deciding final transaction truth
- making unsafe assumptions about proof readiness
- exposing encrypted salary values as plaintext

The frontend is responsible for:

- collecting user intent
- guiding the user through the right flow
- calling backend endpoints
- displaying backend state
- submitting transaction metadata
- showing loading, pending, success, and error states
- keeping employer and employee flows understandable

---

## Why Zalary Wins

| Area | Traditional Payroll | Transparent On-chain Payroll | Zalary |
|---|---|---|---|
| Salary privacy | Private but centralized | Public forever | Confidential by design |
| Settlement speed | Slow banking rails | Fast | Fast |
| Payroll UX | Mature | Fragmented | Productized |
| Employee claims | Platform controlled | Public wallet actions | Wallet-native confidential claims |
| Employer setup | Centralized dashboard | Manual scripts | Guided payroll workspace |
| Scheduling | Yes | Usually manual | Frontend + backend coordinated |
| Transaction status | Internal ledger | Chain-only | Backend + frontend status tracking |
| Web3 readiness | Limited | Privacy problem | Built for confidential payroll |

Zalary combines the user expectations of payroll software with the settlement advantages of on-chain infrastructure.

---

## Who It Is For

Zalary is for teams that want to pay people on-chain without exposing compensation.

Primary users:

- crypto-native companies
- DAOs paying contributors
- Web3 startups paying contractors
- grant programs distributing contributor compensation
- on-chain organizations that need private stablecoin payroll
- future enterprises that want programmable payroll settlement

The first market is crypto-native teams because they already understand wallets, stablecoins, and on-chain settlement.

The long-term market is any organization that wants faster payroll infrastructure without salary exposure.

---

## Product-Market Fit

The product-market fit is clear:

> Teams already want to pay people in stablecoins, but they cannot expose compensation publicly.

Zalary fits where three needs overlap:

1. **Stablecoin payroll**  
   Teams want fast global settlement.

2. **Salary confidentiality**  
   Salary data must not be public.

3. **Usable payroll operations**  
   Employers and employees need a product interface, not raw contract calls.

Without the frontend, Zalary is infrastructure.

With the frontend, Zalary becomes a usable payroll product.

---

## Roadmap

| Milestone | Description | Status |
|---|---|---|
| Landing page | Product-facing Zalary landing experience | Implemented |
| Wallet verification | Employer and employee wallet verification flow | Implemented |
| Role onboarding | Employer and employee onboarding pages | Implemented |
| Employer dashboard | Payroll management workspace | Implemented |
| Payroll creation | Template and schedule creation flow | Implemented |
| Run detail | Payroll run lifecycle interface | Implemented |
| Employee claims | Claimable payroll discovery and claim detail flow | Implemented |
| Worker hardening | Stronger frontend feedback for worker/proof states | In progress |
| Production polish | More resilient loading/error/retry UX | Planned |
| Mainnet readiness | Production configuration and audits | Planned |

---

## Why This Frontend Matters

Zalary is not only a confidential payroll protocol.

It is becoming a real payroll application.

This frontend makes the product understandable for employers and employees:

- employers can create payroll without touching scripts
- employees can discover salary claims without reading contracts
- wallet verification is guided
- onboarding is role-based
- payroll state is visible
- claim state is trackable
- backend and chain actions are surfaced in the UI
- confidential payroll becomes usable

The frontend is the product layer that turns Zalary into payroll infrastructure people can actually operate.

---

## License

All rights reserved. See [`LICENSE`](LICENSE).
