import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code private worktrees + Obsidian vault plugins — not
    // project source, and the bundled plugin JS is multi-MB of
    // minified output that deoptimises Babel's styling.
    ".claude/**",
    ".obsidian/**",
    // Prisma-generated client
    "app/generated/**",
  ]),
]);

export default eslintConfig;
