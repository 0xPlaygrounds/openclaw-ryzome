---
"@ryzome-ai/ryzome-core": minor
"@ryzome-ai/ryzome-mcp": minor
"@ryzome-ai/openclaw-ryzome": minor
"@ryzome-ai/hermes-ryzome": minor
---

Fix document and canvas listing for the current API metadata response envelope, including BSON timestamps. Send tags and pinned filters, preserve favorite summaries, and report invalid responses with their HTTP status instead of retrying them as network failures.

Add tools to create, inspect, and update bundles of documents, and allow filtering document lists by Bundle content type. Keep adapter manifests synchronized with the shared tools.
