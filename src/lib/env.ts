function required(name: string, value?: string) {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function optionalHexPrivateKey(name: string, value?: string) {
  const v = (value ?? "").trim();
  if (!v) return "";
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(v)) {
    throw new Error(`${name} must be a 32-byte hex string`);
  }
  return v.startsWith("0x") ? v : `0x${v}`;
}

export const env = {
  apiBaseUrl: required("VITE_API_BASE_URL", import.meta.env.VITE_API_BASE_URL as string | undefined),
  apiKey: required("VITE_API_KEY", import.meta.env.VITE_API_KEY as string | undefined),
  chainDbId: Number(import.meta.env.VITE_CHAIN_DB_ID ?? "1"),
  evmChainId: Number(import.meta.env.VITE_EVM_CHAIN_ID ?? "84532"),
  rpcUrl: required("VITE_RPC_URL", import.meta.env.VITE_RPC_URL as string | undefined),
  usdcAddress: required("VITE_USDC_ADDRESS", import.meta.env.VITE_USDC_ADDRESS as string | undefined) as `0x${string}`,
  confidentialTokenAddress: required("VITE_CONFIDENTIALTOKEN_ADDRESS", import.meta.env.VITE_CONFIDENTIALTOKEN_ADDRESS as string | undefined) as `0x${string}`,
  payrollVaultAddress: required("VITE_PAYROLLVAULT_ADDRESS", import.meta.env.VITE_PAYROLLVAULT_ADDRESS as string | undefined) as `0x${string}`,
  swapRouterAddress: required("VITE_SWAPROUTER_ADDRESS", import.meta.env.VITE_SWAPROUTER_ADDRESS as string | undefined) as `0x${string}`,

  // local dev only
  backendSignerPrivateKey: optionalHexPrivateKey(
    "VITE_BACKEND_SIGNER_PRIVATE_KEY",
    import.meta.env.VITE_BACKEND_SIGNER_PRIVATE_KEY as string | undefined
  ),
};