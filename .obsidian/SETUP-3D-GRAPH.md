# 3D Graph — schon installiert

Das Plugin `3d-graph` (v1.0.5 von AlexW00) liegt bereits in `.obsidian/plugins/3d-graph/`. Nach dem ersten Vault-Öffnen:

1. In Obsidian: **Settings → Community Plugins → Turn off Restricted Mode** (falls noch nicht)
2. In der gleichen Seite unter "Installed plugins" → **3D Graph** auf **Enable** stellen
3. Command Palette (Cmd+P) → **"3D Graph: Open 3D Graph"**

Plugin startet mit Default-Settings. Jetzt die Werte aus dem Artikel setzen (via Plugin-Settings oder dem Panel in der Graph-View):

## Node Size
- Base node size: **6–8**
- Scale by connections: **ON**

## Links
- Link thickness: **1–2**
- Link opacity: **0.15–0.2**

## Display
- Background: **#000000** (Schwarz)
- Bloom / Glow: **ON**
- Repulsion force: leicht erhöhen für mehr Abstand zwischen Clustern

## Group-Farben (per Community-Cluster)

Wenn das Plugin Groups unterstützt, diese Hex-Codes nutzen:

| Gruppe | Rolle                  | Hex      |
|--------|------------------------|----------|
| 0      | Core / Entry           | #3B82F6  |
| 1      | Logic / Services       | #10B981  |
| 2      | Data / Models          | #F59E0B  |
| 3      | Config / Utils         | #EC4899  |
| 4      | Docs / Tests           | #8B5CF6  |
| 5      | (cycle)                | #06B6D4  |
| 6      | (cycle)                | #EF4444  |
| 7      | (cycle)                | #84CC16  |

## Welche Group = welche Rolle in DIESEM Projekt?

Frag Claude:

> Lies graphify-out/GRAPH_REPORT.md und sag mir pro Community-Nummer kurz was drin ist. Dann schlag mir vor welche meiner 8 Pre-Set-Farben (Core/Logic/Data/Config/Docs/3 Cycles) am besten passt.

Claude liest den Report und mappt Communities → Farben.
