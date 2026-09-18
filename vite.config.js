import { defineConfig } from "vite";

const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base =
  process.env.CLENCHING_BASE ||
  (process.env.GITHUB_ACTIONS && repo ? `/${repo}/` : "./");

export default defineConfig({
  base,
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
