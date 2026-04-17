@AGENTS.md

<!-- obsidian-skill -->
## Context Navigation

This project has a knowledge graph + wiki maintained by the `/obsidian` skill. Use it **before** reading raw source files.

1. **First query the knowledge graph:**
   ```
   graphify query "<your question>" --graph graphify-out/graph.json
   ```
   (Or via the skill: `/obsidian query "<your question>"`.) Cheaper and gives you relationships, not just keyword hits.

2. **If a topic likely has a dedicated wiki page, read `wiki/<topic>.md` instead of raw source files.** `wiki/index.md` is the catalog.

3. **Only read raw files directly when:**
   - The user explicitly says "read the file" / "look at the raw source".
   - You need exact code (signatures, imports, types) that wiki notes don't capture.
   - You're editing the file.

4. **Session-end duty:** at the end of a session, append one line to `log.md`:
   ```
   ## [YYYY-MM-DD HH:MM] session | <3–8 word title>
   Touched: <pages or "none">
   ```
   If durable knowledge was produced (decisions, learnings, non-obvious root causes), also update or create wiki pages.

5. **Never edit files in `raw/`.** Sources are immutable.
<!-- /obsidian-skill -->
