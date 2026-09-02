# Rank-8 exceptional first crossing: terminal alpha 7 complete

## Exact cumulative theorem

Every exceptional-only first crossing with terminal alpha 7 and source alpha 7 through 13 has literal terminal `Q8 > 0`.

Equivalently, this covers total alpha 14 through 20 for terminal alpha 7. For each of the seven source-alpha values, the terminal exceptional type set is exactly indices 248 through 947. The cumulative union has 4,900 source/type cells, 909 shards, zero gaps, and zero overlaps.

## Exact cumulative result

- Source alpha values: 7..13
- Terminal alpha: 7
- Total alpha values: 14..20
- Terminal types per source: 700
- Source/type cells: 4,900
- Independently audited shards: 909
- Raw multisets: 391,576,500
- Canonical check keys: 288,242,676
- Distinct source-shard product jets summed: 286,869,468
- Raw-to-canonical compression: 103,333,824
- Canonical-key-to-product compression within shards: 1,373,208
- Negative `Q8`: 0
- Zero `Q8`: 0
- Minimum `Q8`: 9,630,126
- Maximum `Q8`: 717,136,581,831,566

The independent cumulative audit re-derived the full coefficient vector

`[1, 2, 5, 13, 39, 123, 431, 925, 2209, 5437, 14047, 36079, 90460, 195031]`

from the 247 lower exceptional jets. It independently verified each source formula `c_s + c_(s-7) L`, every source-package and source-audit hash, all seven exact 248..947 unions, and the aggregate identities.

## Resources

- Producer elapsed-seconds sum across all sources: 7,675.753727998934
- Independent shard-audit elapsed-seconds sum: 7,918.59962759912
- Maximum producer private memory: 235,016,192 bytes (224.12890625 MiB)
- Maximum independent-audit private memory: 254,820,352 bytes (243.015625 MiB)
- Abort gate: 469,762,048 bytes (448 MiB)
- Hard cap: 536,870,912 bytes (512 MiB)

No sign failure, equality mismatch, checkpoint failure, abort-gate event, or hard-cap event occurred.

## Immutable cumulative evidence

- `assemble_rank8_exceptional_first_crossing_alpha7_sources7_13.py`: `8191F13385D2EBC4B4902AC166D22CE8BE4A2616042D55995FD9045FD879BCDB`
- `audit_rank8_exceptional_first_crossing_alpha7_sources7_13_assembly.py`: `FC3D738211E49E8C6F699CE5D25A1EAF220EDFA4377CB0B2E0F32EEBB806C54E`
- `rank8_exceptional_first_crossing_alpha7_sources7_13_complete_exact_20260820.json`: `7CF5B21D18CD0D9B208F1D36ABC2E8FEF4947F942CBC291872705B99AB1E5768`
- `rank8_exceptional_first_crossing_alpha7_sources7_13_complete_audit_exact_20260820.json`: `9B9CA836AB13AE52D969F681C6DFF8E0CD9FB01B74E85E32E7165076E80F2E0E`

The cumulative JSON pins all seven complete source packages and their independent no-gap audits; those packages in turn pin every underlying shard report, SQLite certificate, and independent shard audit.

## Exact remaining first-crossing scope

Within the exceptional-only first-crossing band for total alpha at most 22, the exact remaining cells are:

- terminal alpha 8: source alpha 6..13, terminal type indices 948..1200, totals 14..21; 8 x 253 = 2,024 source/type cells;
- terminal alpha 9: source alpha 5..13, terminal type indices 1201..1215, totals 14..22; 9 x 15 = 135 source/type cells.

Thus 2,159 exceptional-only first-crossing source/type cells remain. Terminal alpha 7 is complete for every possible source alpha 7..13. No terminal-alpha8 work was launched here. Full/full cones and connected `Delta0..3` remain outside this theorem and untouched.
