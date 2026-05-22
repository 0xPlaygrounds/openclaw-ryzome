---
"@ryzome-ai/ryzome-core": patch
---

Canonicalize and surface canvas/document URLs:

- `buildCanvasAppUrl` now emits `/workspace?document=<id>` instead of `/workspace?canvas=<id>`. The canvas app still resolves `?canvas=` via a backward-compat shim, but canvases are documents now (same IDs), so the document form is the right one to ship.
- `create_ryzome_canvas`, `create_ryzome_plan`, `create_ryzome_research`, and `create_ryzome_document` tool outputs now lead with the `View: <url>` line, and their tool descriptions explicitly ask the calling agent to include that URL verbatim in its reply. Reduces the chance the URL gets dropped during model summarization.
