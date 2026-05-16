import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },

    /**
     * Prevent duplicate runtime copies of packages that keep browser/shared state.
     */
    dedupe: [
      "@cofhe/sdk",
      "@cofhe/sdk/web",
      "@cofhe/sdk/chains",
      "@cofhe/sdk/permits",
      "tfhe",
      "iframe-shared-storage",
    ],
  },

  /**
   * Required so Vite treats WASM files as assets and does not incorrectly inline
   * or pre-transform TFHE WASM.
   */
  assetsInclude: ["**/*.wasm"],

  worker: {
    format: "es",
  },

  optimizeDeps: {
    /**
     * Keep iframe-shared-storage available for Vite dependency scanning,
     * but do not prebundle CoFHE/TFHE packages.
     */
    include: ["iframe-shared-storage"],

    /**
     * Critical for CoFHE browser encryption:
     * tfhe must NOT be dependency-prebundled, otherwise TFHE WASM/key loading
     * can break and cause publicKey/CRS deserialization errors.
     */
    exclude: [
      "tfhe",
      "@cofhe/sdk",
      "@cofhe/sdk/web",
      "@cofhe/sdk/chains",
      "@cofhe/sdk/permits",
      "@cofhe/sdk/adapters",
    ],

    esbuildOptions: {
      target: "es2022",
    },
  },

  build: {
    target: "es2022",

    commonjsOptions: {
      transformMixedEsModules: true,
    },

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@cofhe/sdk")) return "cofhe-sdk";
          if (id.includes("node_modules/tfhe")) return "tfhe";
          if (id.includes("node_modules/viem")) return "viem";
          if (id.includes("node_modules")) return "vendor";
          return undefined;
        },
      },
    },
  },

  server: {
    host: "0.0.0.0",
    port: 5173,

    /**
     * Helpful for WASM/shared-storage flows during local dev.
     */
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});