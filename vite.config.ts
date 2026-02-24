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
  build: {
    rollupOptions: {
      output: {
        // Impedisce a Rollup di rinominare le classi interne di @speckle/viewer
        // che causano il bug "Could not get Extension of type $h"
        mangleExports: false,
      },
    },
  },
  optimizeDeps: {
    // Esclude @speckle/viewer dal pre-bundling di Vite
    // per evitare la minificazione dei nomi di classe
    exclude: ["@speckle/viewer", "@speckle/shared"],
  },
});
