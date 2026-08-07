import js from "@eslint/js";
import tseslint from "typescript-eslint";
export default tseslint.config(
  // Leading **/ matters: "dist/**" only ever matched a dist folder at the repo
  // root, so a nested build output (packages/*/dist, ticker/dist) was linted as
  // if it were source and buried the real findings under hundreds of errors
  // about generated code.
  { ignores: ["**/dist/**", "**/build/**", "**/node_modules/**", "**/*.cjs"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // eslint.config.js and vitest.config.ts are build plumbing that sits
        // outside tsconfig.json's `include` on purpose; without this they have
        // no project and the parser refuses them outright, which reads as a
        // lint failure but is really a missing project mapping. Real source got
        // real projects instead: api/**/* was added to tsconfig.json's
        // `include`, and web/ has its own DOM-flavoured tsconfig.json.
        projectService: {
          allowDefaultProject: ["*.js", "*.mjs", "*.cjs", "*.ts", "*.config.js", "*.config.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // The browser bundle is JavaScript, so ESLint's core no-undef rule (which
    // typescript-eslint switches off for .ts files) still applies and needs to
    // be told which host globals exist. Declaring them is not a rule waiver:
    // every other rule, type-aware ones included, still runs over this file.
    files: ["web/**/*.js"],
    languageOptions: {
      globals: { document: "readonly", window: "readonly", fetch: "readonly", console: "readonly" },
    },
  },
);
