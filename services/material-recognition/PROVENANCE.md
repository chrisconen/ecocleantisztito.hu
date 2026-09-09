# Material recognition source provenance

Imported 2026-09-09 from the owner's local application. The two named backend source files were copied; the original `index.html` was also read to integrate its behavior into the redesigned frontend. The original `D:/youtube/karpit` application was not modified; its `log` directory was neither read nor copied.

| Original source | Preserved copy | SHA-256 |
|---|---|---|
| `D:/youtube/karpit/server.py` | `provenance/original-server.py` | `fd4b13be438cfeecf103fb5bcf76fad0043fc6d8c7ba3cfd496230156eab3986` |
| `D:/youtube/karpit/prompt.txt` | `provenance/original-prompt.txt` | `9adf3aa5ba1329454084ea23053d6b882ba2c0acbd62c337b34bd01c1e316cfa` |

`server.py` is the maintained adaptation: renamed API routes, owner-selected Gemini/OpenAI provider, bounded/validated uploads and outputs, concurrency-safe quotas, explicit proxy/origin trust and restricted optional public demo serving. At the owner's subsequent request, explicit per-photo opt-in enables private photo collection outside the website tree; human-approved active references can be passed to either provider. No keys, IP addresses or customer notes are archived. `prompt.txt` retains the original Hungarian material-analysis intent and result field names while removing fictional professional credentials and unsupported certainty, restricting cleaning-code inference to the target photo's readable label and removing photo-only cleaning recipes. Customer-facing copy contains no model selection or model branding.

The preserved originals are reference inputs, not executable deployment files or public runtime assets. The local server explicitly denies all `provenance` paths.
