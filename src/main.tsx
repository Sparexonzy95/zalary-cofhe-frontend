import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "./app/router";
import { queryClient } from "./app/queryClient";
import { WalletProvider } from "./lib/wallet";
import { WalletPicker } from "./components/WalletPicker";
import { DecryptHoverText } from "./components/DecryptHoverText";
import { OnboardingProvider } from "./lib/onboarding";
import { ToastProvider } from "./components/ui";
import "@fontsource-variable/mona-sans";
import "@fontsource/fira-mono/400.css";
import "@fontsource/fira-mono/700.css";
import "./styles/index.css";
import "./styles/tailwind.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <WalletPicker />
        <DecryptHoverText />
        <OnboardingProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </OnboardingProvider>
      </WalletProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
