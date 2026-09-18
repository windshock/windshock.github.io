# eGovFrame Security Patch Observatory

Public defensive dashboard for tracking eGovFrame security patch lineage and patch-gap evidence.

## Public URL

`https://windshock.github.io/lab/egov-security-patch-observatory/`

## Data model

- `data/patches.json`: public security patch/advisory timeline.
- `data/components.json`: component-level feature anchors, vulnerable/fixed signatures and runtime verification guidance.

## Update rule

1. Add a security-related upstream commit/advisory with a stable public evidence URL.
2. Map changed files/endpoints to a component entry.
3. Compare the old baseline source against the patched/current source.
4. Mark status as patch-gap candidate, upstream fix present, partial or runtime verification required.
5. Do not mark a deployed system vulnerable/fixed based only on the version string.

No exploit payloads or target-specific operational exposure data are included.