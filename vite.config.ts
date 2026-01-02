import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";

const isNetlifyBuild = process.env.NETLIFY === "true";

const config = defineConfig({
  server: {
    port: 3001,
  },
  plugins: [
    devtools({ eventBusConfig: { port: 42070 } }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    // Netlify plugin only during Netlify builds (NETLIFY=true is auto-set by Netlify)
    isNetlifyBuild && netlify(),
    viteReact(),
  ].filter(Boolean),
  // Externalize pg for Netlify (uses Neon HTTP driver instead)
  ssr: isNetlifyBuild
    ? {
        external: ["pg", "pg-pool", "pg-native"],
        noExternal: ["@neondatabase/serverless"],
      }
    : undefined,
});

export default config;
