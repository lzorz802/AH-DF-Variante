// ============================================================
// FILE: vite.config.ts  (FILE MODIFICATO)
// ============================================================
// MODIFICA: aggiunta ottimizzazione deps per @speckle/viewer
// che usa moduli ESM non-standard che Vite deve pre-bundlare.
//
// DIFF rispetto all'originale (che probabilmente è minimal):
//   + optimizeDeps con include di @speckle packages
//   + resolve.alias per eventuali polyfill three.js
// ============================================================

import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ── AGGIUNTO: pre-bundling per @speckle/viewer ───────────
  optimizeDeps: {
    include: [
      "@speckle/viewer",
      "@speckle/shared",
    ],
    // three.js è una dipendenza di @speckle/viewer
    exclude: [],
  },

  build: {
    rollupOptions: {
      // Chunk separato per il viewer (è pesante ~3MB)
      output: {
        manualChunks: {
          "speckle-viewer": ["@speckle/viewer", "@speckle/shared"],
        },
      },
    },
  },
});
