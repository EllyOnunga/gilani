// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// When NITRO_PRESET=vercel is set (e.g. in Vercel's build environment),
// enable the Nitro Vercel adapter so output goes to .vercel/output/.
// Locally this is undefined, so the default Cloudflare/dev behaviour is used.
const nitroPreset = process.env.NITRO_PRESET as string | undefined;

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: nitroPreset
    ? {
        preset: nitroPreset,
        output:
          nitroPreset === "vercel"
            ? {
                dir: ".vercel/output",
                serverDir: ".vercel/output/functions/__server.func",
                publicDir: ".vercel/output/static",
              }
            : undefined,
      }
    : undefined,
});

