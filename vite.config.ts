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
  // Fix per @speckle/viewer: impedisce la minificazione dei nomi di classe
  // che causa "Could not get Extension of type $h/$l"
  optimizeDeps: {
    exclude: ["@speckle/viewer", "@speckle/shared"],
    esbuildOptions: {
      // Disabilita il mangling dei nomi anche durante il pre-bundling esbuild
      minifyIdentifiers: false,
    },
  },
  build: {
    rollupOptions: {
      output: {
        mangleExports: false,
      },
    },
  },
  esbuild: {
    // Disabilita il mangling degli identificatori anche in dev mode
    minifyIdentifiers: false,
  },
});
