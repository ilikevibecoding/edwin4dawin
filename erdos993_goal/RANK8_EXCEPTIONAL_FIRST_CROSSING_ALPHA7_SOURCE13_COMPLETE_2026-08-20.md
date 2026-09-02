# Rank-8 exceptional first crossing: terminal alpha 7, source alpha 13

## Exact scoped theorem

Every exceptional-only first crossing whose source has alpha 13 and whose terminal exceptional component has alpha 7 has literal terminal `Q8 > 0`.

The finite scope is exactly source alpha 13, terminal alpha 7, total alpha 20, and terminal exceptional type indices 248 through 947. The 607 audited shard ranges form one consecutive union with zero gaps and zero overlaps. This note makes no claim about terminal alpha 8 or 9, full/full cones, or connected `Delta0..3`.

## Exact result

- Terminal types: 700
- Shards: 607, each produced in a fresh single-worker process and independently audited in a fresh process
- Raw multisets: 242,267,550
- Canonical check keys: 173,731,610
- Distinct product jets summed within shards: 173,636,728
- Raw-to-canonical compression: 68,535,940
- Canonical-key-to-product compression within shards: 94,882
- Negative `Q8`: 0
- Zero `Q8`: 0
- Minimum `Q8`: 8,821,655,163
- Maximum `Q8`: 717,136,581,831,566

The independent assembly audit re-derived the lower-core coefficients `c13 = 195031` and `c6 = 431` from the first 247 exceptional jets, used the per-terminal raw formula `195031 + 431 L`, rehashed and queried all 607 report/database/audit triples, and reconstructed the exact type union 248..947.

## Resources

- Producer elapsed-seconds sum: 5,276.740562099963
- Independent-audit elapsed-seconds sum: 5,172.8720950994175
- Maximum producer private memory: 235,016,192 bytes (224.12890625 MiB)
- Maximum independent-audit private memory: 254,820,352 bytes (243.015625 MiB)
- Abort gate: 469,762,048 bytes (448 MiB)
- Hard cap: 536,870,912 bytes (512 MiB)

No sign failure, equality mismatch, checkpoint failure, abort-gate event, or hard-cap event occurred.

## Immutable evidence

- `assemble_rank8_exceptional_first_crossing_alpha7_s13.py`: `E1D9BD0C00C826414F1A3B72571B774DEF5D86050851F8DD6C544C93017AFF6E`
- `audit_rank8_exceptional_first_crossing_alpha7_s13_assembly.py`: `BB8EFD3DC3D329A40863A3BCBF79C5B12D97B8D4CB0E4C1714B53142A16090ED`
- `rank8_exceptional_first_crossing_alpha7_s13_complete_exact_20260820.json`: `8EF674DEA482683CD0BED7DC9429DAEE0BF97CE02FFB9A440A49EE90D78CECE7`
- `rank8_exceptional_first_crossing_alpha7_s13_complete_audit_exact_20260820.json`: `109751F7052117FE1B42F0B9C1F2FAD756F5FBAE4100604AA09616AE00DDEA0A`

The complete JSON pins every underlying shard report, SQLite certificate, and independent shard audit by SHA-256.
