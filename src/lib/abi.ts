export const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

export const ENCRYPTED_INPUT_COMPONENTS = [
  { name: "ctHash", type: "uint256" },
  { name: "securityZone", type: "uint8" },
  { name: "utype", type: "uint8" },
  { name: "signature", type: "bytes" }
] as const;

export const CONFIDENTIAL_TOKEN_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "MINTER_ROLE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "BURNER_ROLE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "VAULT_ROLE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

export const PAYROLL_VAULT_ABI = [
  // ── Errors ─────────────────────────────────────────────────────────────────
  { type: "error", name: "AccessControlBadConfirmation", inputs: [] },
  {
    type: "error",
    name: "AccessControlUnauthorizedAccount",
    inputs: [
      { name: "account", type: "address", internalType: "address" },
      { name: "neededRole", type: "bytes32", internalType: "bytes32" }
    ]
  },
  { type: "error", name: "AllocationMissing", inputs: [] },
  { type: "error", name: "AlreadyClaimed", inputs: [] },
  { type: "error", name: "BadStatus", inputs: [] },
  { type: "error", name: "ClaimNotRequested", inputs: [] },
  { type: "error", name: "DeadlinePassed", inputs: [] },
  { type: "error", name: "DuplicateEmployee", inputs: [] },
  { type: "error", name: "InvalidCount", inputs: [] },
  { type: "error", name: "InvalidDeadline", inputs: [] },
  { type: "error", name: "InvalidDecryptProof", inputs: [] },
  {
    type: "error",
    name: "InvalidEncryptedInput",
    inputs: [
      { name: "got", type: "uint8", internalType: "uint8" },
      { name: "expected", type: "uint8", internalType: "uint8" }
    ]
  },
  { type: "error", name: "LengthMismatch", inputs: [] },
  { type: "error", name: "NoPendingClaim", inputs: [] },
  { type: "error", name: "NotEmployer", inputs: [] },
  { type: "error", name: "NotEnoughBalance", inputs: [] },
  { type: "error", name: "NotFunded", inputs: [] },
  { type: "error", name: "NotYetDeadline", inputs: [] },
  { type: "error", name: "NothingToWithdraw", inputs: [] },
  { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
  {
    type: "error",
    name: "SecurityZoneOutOfBounds",
    inputs: [{ name: "value", type: "int32", internalType: "int32" }]
  },
  { type: "error", name: "TokenNotApproved", inputs: [] },
  { type: "error", name: "UnknownPayroll", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },

  // ── Core payroll flow ──────────────────────────────────────────────────────
  {
    type: "function",
    name: "createPayroll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "deadline", type: "uint64" },
      { name: "employeeCount", type: "uint16" }
    ],
    outputs: [{ name: "payrollId", type: "uint256" }]
  },
  {
    type: "function",
    name: "uploadAllocations",
    stateMutability: "nonpayable",
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "employees", type: "address[]" },
      {
        name: "encryptedAmounts",
        type: "tuple[]",
        components: ENCRYPTED_INPUT_COMPONENTS
      }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "finalizeAllocations",
    stateMutability: "nonpayable",
    inputs: [{ name: "payrollId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "fundPayroll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "payrollId", type: "uint256" },
      {
        name: "encryptedAmount",
        type: "tuple",
        components: ENCRYPTED_INPUT_COMPONENTS
      }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "activatePayroll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "fundedPlaintext", type: "bool" },
      { name: "fundedSig", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "cancelPayroll",
    stateMutability: "nonpayable",
    inputs: [{ name: "payrollId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "closePayroll",
    stateMutability: "nonpayable",
    inputs: [{ name: "payrollId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "withdrawLeftovers",
    stateMutability: "nonpayable",
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "to", type: "address" }
    ],
    outputs: []
  },

  // ── Employee claim flow ────────────────────────────────────────────────────
  {
    type: "function",
    name: "requestClaim",
    stateMutability: "nonpayable",
    inputs: [{ name: "payrollId", type: "uint256" }],
    outputs: [{ name: "requestId", type: "bytes32" }]
  },
  {
    type: "function",
    name: "finalizeClaim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "requestId", type: "bytes32" },
      { name: "okPlaintext", type: "bool" },
      { name: "okSig", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "cancelPendingClaim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "payrollId", type: "uint256" },
      { name: "requestId", type: "bytes32" },
      { name: "okPlaintext", type: "bool" },
      { name: "okSig", type: "bytes" }
    ],
    outputs: []
  },

  // ── Employee view helpers ──────────────────────────────────────────────────
  {
    type: "function",
    name: "getMyAllocation",
    stateMutability: "view",
    inputs: [{ name: "payrollId", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "getMyPendingRequestId",
    stateMutability: "view",
    inputs: [{ name: "payrollId", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "getMyPendingOkHandle",
    stateMutability: "view",
    inputs: [{ name: "payrollId", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "payrolls",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "employer", type: "address" },
      { name: "token", type: "address" },
      { name: "deadline", type: "uint64" },
      { name: "employeeCount", type: "uint16" },
      { name: "uploadedCount", type: "uint16" },
      { name: "status", type: "uint8" }
    ]
  },

  // ── Admin / config helpers ─────────────────────────────────────────────────
  {
    type: "function",
    name: "approvedTokens",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "approveToken",
    stateMutability: "nonpayable",
    inputs: [{ name: "token", type: "address" }],
    outputs: []
  },
  {
    type: "function",
    name: "revokeToken",
    stateMutability: "nonpayable",
    inputs: [{ name: "token", type: "address" }],
    outputs: []
  }
] as const;

export const SWAP_ROUTER_ABI = [
  // ── Errors ─────────────────────────────────────────────────────────────────
  { type: "error", name: "InvalidDecryptProof", inputs: [] },
  { type: "error", name: "WithdrawNotRequested", inputs: [] },
  { type: "error", name: "WithdrawAlreadyPendingForKey", inputs: [] },
  { type: "error", name: "NotWithdrawOwner", inputs: [] },
  { type: "error", name: "NotEnoughBalance", inputs: [] },
  { type: "error", name: "ZeroAmount", inputs: [] },
  { type: "error", name: "AmountTooSmall", inputs: [] },
  { type: "error", name: "WithdrawCanBeFinalized", inputs: [] },

  // ── Core flow ───────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "requestWithdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "withdrawKey", type: "bytes32" },
      {
        name: "encryptedAmount",
        type: "tuple",
        components: ENCRYPTED_INPUT_COMPONENTS
      }
    ],
    outputs: [
      { name: "amountHandle", type: "bytes32" },
      { name: "requestId", type: "bytes32" }
    ]
  },
  {
    type: "function",
    name: "finalizeWithdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "withdrawKey", type: "bytes32" },
      { name: "requestId", type: "bytes32" },
      { name: "amountPlain", type: "uint64" },
      { name: "amountSig", type: "bytes" },
      { name: "okPlain", type: "bool" },
      { name: "okSig", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "cancelPendingWithdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "withdrawKey", type: "bytes32" },
      { name: "requestId", type: "bytes32" },
      { name: "amountPlain", type: "uint64" },
      { name: "amountSig", type: "bytes" },
      { name: "okPlain", type: "bool" },
      { name: "okSig", type: "bytes" }
    ],
    outputs: []
  },

  // ── View helpers ────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "getPendingUser",
    stateMutability: "view",
    inputs: [{ name: "withdrawKey", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "getPendingAmountHandle",
    stateMutability: "view",
    inputs: [{ name: "withdrawKey", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "getPendingOkHandle",
    stateMutability: "view",
    inputs: [{ name: "withdrawKey", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "getPendingRequestId",
    stateMutability: "view",
    inputs: [{ name: "withdrawKey", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "getPendingWithdraw",
    stateMutability: "view",
    inputs: [{ name: "withdrawKey", type: "bytes32" }],
    outputs: [
      { name: "user", type: "address" },
      { name: "amountHandle", type: "bytes32" },
      { name: "okHandle", type: "bytes32" },
      { name: "requestId", type: "bytes32" }
    ]
  },

  // ── Simple constants / config ──────────────────────────────────────────────
  {
    type: "function",
    name: "MIN_WITHDRAW",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }]
  },
  {
    type: "function",
    name: "withdrawNonce",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "cToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "usdc",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  }
] as const;