import React from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";
import { env } from "./env";

// ── EIP-6963 types ──────────────────────────────────────────
interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string; // data: URI
  rdns: string;
}

export interface DetectedWallet {
  info: EIP6963ProviderInfo;
  provider: any;
}

// ── Constants ───────────────────────────────────────────────
const CONNECTED_KEY = "zalary_wallet_connected";
const CHAIN_ID_HEX = `0x${env.evmChainId.toString(16)}`;

const BASE_SEPOLIA_PARAMS = {
  chainId: CHAIN_ID_HEX,
  chainName: "Base Sepolia",
  nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia-explorer.base.org"],
};

// Module-level active provider — used by getWalletClients
let _activeProvider: any = null;

// ── Helpers ─────────────────────────────────────────────────
function normalizeAddress(v?: string | null) {
  return (v || "").trim().toLowerCase();
}

export function getActiveProvider(): any {
  const p = _activeProvider ?? (window as any).ethereum;
  if (!p) throw new Error("No wallet connected. Please connect a wallet first.");
  return p;
}

async function ensureBaseSepolia(provider: any): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err: any) {
    if (err.code === 4902 || err.code === -32603) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [BASE_SEPOLIA_PARAMS],
      });
    } else {
      throw err;
    }
  }
}

async function getAccountsSilent(provider: any): Promise<string> {
  try {
    const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
    return normalizeAddress(accounts?.[0]);
  } catch {
    return "";
  }
}

function buildLegacyEntry(eth: any, index = 0): DetectedWallet {
  let name = "Browser Wallet";
  if (eth.isRabby) name = "Rabby";
  else if (eth.isMetaMask) name = "MetaMask";
  else if (eth.isCoinbaseWallet) name = "Coinbase Wallet";
  else if (eth.isBraveWallet) name = "Brave Wallet";
  else if (eth.isTrust) name = "Trust Wallet";

  return {
    info: { uuid: `legacy-${index}`, name, icon: "", rdns: "legacy" },
    provider: eth,
  };
}

// ── Context type ─────────────────────────────────────────────
type WalletContextValue = {
  wallet: string;
  connecting: boolean;
  error: string;
  connect: () => void;
  disconnect: () => void;
  refreshWallet: () => Promise<string>;
  detectedWallets: DetectedWallet[];
  pickerOpen: boolean;
  closePicker: () => void;
  connectWithProvider: (w: DetectedWallet) => Promise<void>;
};

const WalletContext = React.createContext<WalletContextValue>({
  wallet: "",
  connecting: false,
  error: "",
  connect: () => undefined,
  disconnect: () => undefined,
  refreshWallet: async () => "",
  detectedWallets: [],
  pickerOpen: false,
  closePicker: () => undefined,
  connectWithProvider: async () => undefined,
});

// ── WalletProvider ───────────────────────────────────────────
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = React.useState("");
  const [connecting, setConnecting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [detectedWallets, setDetectedWallets] = React.useState<DetectedWallet[]>([]);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const seenUuids = React.useRef(new Set<string>());

  const applyWalletAccount = React.useCallback((provider: any, account: string) => {
    const normalized = normalizeAddress(account);

    if (!normalized) {
      setWallet("");
      setError("");
      _activeProvider = null;
      localStorage.removeItem(CONNECTED_KEY);
      return "";
    }

    _activeProvider = provider;
    setWallet(normalized);
    localStorage.setItem(CONNECTED_KEY, "true");
    return normalized;
  }, []);

  const revalidateWalletSession = React.useCallback(async () => {
    const provider = _activeProvider ?? (window as any).ethereum;

    if (!provider) {
      setWallet("");
      localStorage.removeItem(CONNECTED_KEY);
      return "";
    }

    const account = await getAccountsSilent(provider);
    return applyWalletAccount(provider, account);
  }, [applyWalletAccount]);

  // ── EIP-6963 wallet discovery ──
  React.useEffect(() => {
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent).detail as DetectedWallet;
      if (!seenUuids.current.has(detail.info.uuid)) {
        seenUuids.current.add(detail.info.uuid);
        setDetectedWallets((prev) => [...prev, detail]);
      }
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // Fallback: after 150ms, if no EIP-6963 wallets found, read window.ethereum
    const timer = setTimeout(() => {
      if (seenUuids.current.size > 0) return;
      const eth = (window as any).ethereum;
      if (!eth) return;

      if (Array.isArray(eth.providers) && eth.providers.length > 0) {
        eth.providers.forEach((p: any, i: number) => {
          const entry = buildLegacyEntry(p, i);
          if (!seenUuids.current.has(entry.info.uuid)) {
            seenUuids.current.add(entry.info.uuid);
            setDetectedWallets((prev) => [...prev, entry]);
          }
        });
      } else {
        const entry = buildLegacyEntry(eth);
        if (!seenUuids.current.has(entry.info.uuid)) {
          seenUuids.current.add(entry.info.uuid);
          setDetectedWallets((prev) => [...prev, entry]);
        }
      }
    }, 150);

    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      clearTimeout(timer);
    };
  }, []);

  // ── Auto-reconnect for returning users ──
  React.useEffect(() => {
    if (localStorage.getItem(CONNECTED_KEY) !== "true") return;

    async function tryReconnect() {
      await revalidateWalletSession();
    }
    void tryReconnect();
  }, [revalidateWalletSession]);

  // ── Chain / account change listeners ──
  React.useEffect(() => {
    const provider = _activeProvider ?? (window as any).ethereum;
    if (!provider) return;

    const onAccountsChanged = (accounts: string[]) => {
      const next = normalizeAddress(accounts?.[0]);
      if (!next) {
        applyWalletAccount(provider, "");
      } else {
        applyWalletAccount(provider, next);
      }
    };

    const onChainChanged = () => window.location.reload();

    provider.on?.("accountsChanged", onAccountsChanged);
    provider.on?.("chainChanged", onChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("chainChanged", onChainChanged);
    };
  }, [applyWalletAccount, wallet]);

  React.useEffect(() => {
    const revalidateIfVisible = () => {
      if (document.visibilityState === "hidden") return;
      if (!wallet && localStorage.getItem(CONNECTED_KEY) !== "true") return;
      void revalidateWalletSession();
    };

    window.addEventListener("focus", revalidateIfVisible);
    window.addEventListener("pageshow", revalidateIfVisible);
    document.addEventListener("visibilitychange", revalidateIfVisible);

    return () => {
      window.removeEventListener("focus", revalidateIfVisible);
      window.removeEventListener("pageshow", revalidateIfVisible);
      document.removeEventListener("visibilitychange", revalidateIfVisible);
    };
  }, [revalidateWalletSession, wallet]);

  const refreshWallet = React.useCallback(async () => {
    return revalidateWalletSession();
  }, [revalidateWalletSession]);

  // ── connect: opens the picker ──
  function connect() {
    setError("");
    setPickerOpen(true);
  }

  // ── connectWithProvider: used by the picker ──
  async function connectWithProvider(detected: DetectedWallet) {
    setConnecting(true);
    setError("");
    try {
      const provider = detected.provider;

      // Request account access
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];

      if (!accounts?.[0]) throw new Error("Wallet connection failed.");

      // Auto-switch/add Base Sepolia
      await ensureBaseSepolia(provider);

      // Confirm chain
      const chainId = (await provider.request({ method: "eth_chainId" })) as string;
      if (parseInt(chainId, 16) !== env.evmChainId) {
        throw new Error("Please switch to Base Sepolia manually and try again.");
      }

      applyWalletAccount(provider, accounts[0]);
      setPickerOpen(false);
    } catch (err: any) {
      const msg = err?.message ?? "Could not connect wallet.";
      setError(msg);
    } finally {
      setConnecting(false);
    }
  }

  function closePicker() {
    setPickerOpen(false);
    setError("");
  }

  function disconnect() {
    setWallet("");
    setError("");
    _activeProvider = null;
    localStorage.removeItem(CONNECTED_KEY);
  }

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connecting,
        error,
        connect,
        disconnect,
        refreshWallet,
        detectedWallets,
        pickerOpen,
        closePicker,
        connectWithProvider,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return React.useContext(WalletContext);
}

// ── getWalletClients (used by feature hooks) ─────────────────
export async function getWalletClients(options?: {
  requestAccount?: boolean;
}): Promise<{
  walletClient: any;
  publicClient: any;
  account: `0x${string}`;
}> {
  const provider = getActiveProvider();
  let account: `0x${string}`;

  if (options?.requestAccount ?? true) {
    const accounts = (await provider.request({
      method: "eth_requestAccounts",
    })) as string[];
    if (!accounts?.[0]) throw new Error("Wallet connection failed.");
    account = accounts[0] as `0x${string}`;
    await ensureBaseSepolia(provider);
  } else {
    const connected = await getAccountsSilent(provider);
    if (!connected) throw new Error("Connect your wallet before continuing.");
    account = connected as `0x${string}`;
  }

  const walletClient: any = createWalletClient({
    chain: baseSepolia,
    account,
    transport: custom(provider),
  });

  const publicClient: any = createPublicClient({
    chain: baseSepolia,
    transport: http(env.rpcUrl),
  });

  const chainId = await walletClient.getChainId();
  if (chainId !== env.evmChainId) {
    throw new Error("Please switch wallet network to Base Sepolia.");
  }

  return { walletClient, publicClient, account };
}
