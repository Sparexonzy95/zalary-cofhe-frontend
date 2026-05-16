import React from "react";
import { useOnboarding } from "../lib/onboarding";
import { useWallet } from "../lib/wallet";

export function WalletConnectButton() {
  const { wallet, connect, disconnect } = useWallet();
  const { logout } = useOnboarding();
  const [connecting, setConnecting] = React.useState(false);

  async function handleConnect() {
    setConnecting(true);

    try {
      await connect();
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    logout();
    disconnect();
  }

  if (!wallet) {
    return (
      <button
        className="btn"
        onClick={() => void handleConnect()}
        disabled={connecting}
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="badge"
      onClick={handleDisconnect}
      title="Connected wallet — click to disconnect"
    >
      {wallet.slice(0, 6)}...{wallet.slice(-4)}
    </button>
  );
}
