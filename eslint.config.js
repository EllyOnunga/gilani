import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi", ".vercel", ".tanstack", ".wrangler", "public"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-useless-escape": "off",
      "react-hooks/rules-of-hooks": "warn",
      "no-empty": "off",
      "no-control-regex": "off",
      "prefer-const": "warn",
      "no-irregular-whitespace": "off",
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  {
    files: ["src/routes/**/*.{ts,tsx}"],
    ignores: ["src/routes/api/**/*"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@/integrations/supabase/client.server",
              importNames: ["supabaseAdmin"],
              message:
                "supabaseAdmin bypasses RLS. In route files it must only be used inside createServerFn handlers. Consider moving to a dedicated *.server-fns.ts file.",
            },
          ],
          patterns: [
            {
              group: ["**/client.server*"],
              importNamePattern: "supabaseAdmin",
              message:
                "supabaseAdmin bypasses RLS. Only import it in *.server.ts or *.server-fns.ts files.",
            },
          ],
        },
      ],
    },
  },
  eslintPluginPrettier,
);
