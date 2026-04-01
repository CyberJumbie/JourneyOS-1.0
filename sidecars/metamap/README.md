# MetaMap Sidecar

MetaMap is a Java-based NLP tool from the NLM that maps biomedical text to UMLS CUIs.
It requires a UMLS license and ~4GB RAM.

## Recommended alternative for development: QuickUMLS

QuickUMLS is a Python-based UMLS entity linker that is much lighter than MetaMap.
It requires the UMLS 2024AB release downloaded from uts.nlm.nih.gov.

### QuickUMLS setup

```bash
# 1. Download UMLS 2024AB from https://www.nlm.nih.gov/research/umls/licensedcontent/umlsknowledgesources.html
# 2. Install QuickUMLS
pip install quickumls

# 3. Index the UMLS data (one-time, ~20 min)
python -m quickumls.install /path/to/umls/2024AB/META /path/to/quickumls-index

# 4. Update .env.local:
# METAMAP_URL=http://localhost:8080  →  leave as is
# QUICKUMLS_ENABLED=true
# QUICKUMLS_INDEX_PATH=/path/to/quickumls-index
```

## Production MetaMap Docker

For production, use the official MetaMap container or the NLM's docker distribution.
The `jrns-metamap` service in docker-compose.yml is a placeholder.

Replace the command with your actual MetaMap server startup:
```yaml
command: ["java", "-cp", "/metamap/lib/*", "gov.nih.nlm.nls.metamap.server.MedServer"]
```
