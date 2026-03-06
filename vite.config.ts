import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ["@speckle/viewer", "@speckle/shared"],
    esbuildOptions: {
      // FIX CHIAVE: preserva i nomi delle classi JS
      // @speckle/viewer usa constructor.name per trovare le estensioni
      // Senza questo, esbuild rinomina le classi ($h, $l, Oa, ecc.)
      keepNames: true,
    },
  },
  build: {
    rollupOptions: {
      output: {
        generatedCodeFor: undefined,
      },
    },
  },
  esbuild: {
    // Preserva i nomi anche durante il transform in dev mode
    keepNames: true,
  },
});
