import React from "react";
import { useWallet } from "../lib/wallet";

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

function WalletIcon({ icon, name }: { icon: string; name: string }) {
  if (icon) {
    return <img src={icon} alt={name} className="wpicker-icon-img" />;
  }
  return (
    <div className="wpicker-icon-fallback">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function WalletPicker() {
  const { detectedWallets, pickerOpen, closePicker, connectWithProvider, connecting, error } =
    useWallet();

  if (!pickerOpen) return null;

  return (
    <div className="wpicker-overlay" onClick={closePicker}>
      <div className="wpicker-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wpicker-header">
          <span className="wpicker-title">Connect Wallet</span>
          <button type="button" className="wpicker-close-btn" onClick={closePicker}>
            <IconClose />
          </button>
        </div>

        <p className="wpicker-sub">
          Base Sepolia network is added automatically on connect.
        </p>

        {/* Wallet list */}
        {detectedWallets.length > 0 ? (
          <div className="wpicker-list">
            {detectedWallets.map((w) => (
              <button
                key={w.info.uuid}
                type="button"
                className="wpicker-item"
                onClick={() => void connectWithProvider(w)}
                disabled={connecting}
              >
                <div className="wpicker-item-icon">
                  <WalletIcon icon={w.info.icon} name={w.info.name} />
                </div>
                <span className="wpicker-item-name">{w.info.name}</span>
                <span className="wpicker-item-arrow">
                  {connecting ? "…" : "→"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="wpicker-empty">
            <p>No wallet extension detected in your browser.</p>
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="wpicker-install-link"
            >
              Install MetaMask <IconExternal />
            </a>
          </div>
        )}

        {/* Error */}
        {error && <p className="wpicker-error">{error}</p>}

        {/* Footer note */}
        <p className="wpicker-footer">
          Only Base Sepolia is supported · Non-custodial
        </p>
      </div>
    </div>
  );
}
