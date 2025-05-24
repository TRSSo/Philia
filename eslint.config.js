import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import prettier from "eslint-config-prettier/flat"

tseslint.configs.recommended[2].rules = {
  ...tseslint.configs.recommended[2].rules,
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-empty-object-type": "warn",
  "@typescript-eslint/no-unsafe-declaration-merging": "warn",
  "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
}

export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.node } },
  { rules: {
    ...pluginJs.configs.recommended.rules,
    "no-empty": "warn",
    "no-constant-condition": ["error", { "checkLoops": false }],
  }},
  ...tseslint.configs.recommended,
  prettier,
]
