import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  server: {
    allowedHosts: true,
  },
  plugins: [tsconfigPaths(), tailwindcss(), tanstackStart({
    server: { entry: "server" },
  }), react()],
});