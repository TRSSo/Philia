import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"

tseslint.configs.recommended[2].rules["@typescript-eslint/no-explicit-any"] = "off"

export default [
  {
    files: ["**/*.js"],
    languageOptions: { sourceType: "script" },
  },
  {
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      ...pluginJs.configs.recommended.rules,
      "no-empty": "off",
    },
  },
  ...tseslint.configs.recommended,
]