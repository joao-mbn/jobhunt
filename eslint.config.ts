import js from "@eslint/js";
import json from "@eslint/json";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended", "prettier"],
    languageOptions: { globals: globals.browser },
  },
  { ...tseslint.configs.recommended, extends: ["prettier"] },
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended", "prettier"] },
  { files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended", "prettier"] },
  { files: ["**/*.json5"], plugins: { json }, language: "json/json5", extends: ["json/recommended", "prettier"] },
]);
