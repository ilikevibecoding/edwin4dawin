# Rank-eight terminal-alpha-seven source-twelve complete theorem

Date: 2026-08-20

Status: **exact 194-shard no-gap PASS with 194 fresh independent
bidirectional audits.**

## Scoped theorem

For every terminal exceptional alpha-seven jet type with sorted index
`248 <= t <= 947`, and every exceptional source product of alpha twelve using
component types at most `t`, adjoining terminal type `t` gives total alpha 19
and

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

This theorem covers exactly source alpha 12 in the terminal-alpha-seven band.

## Exact recurrence and no-gap coverage

The independent lower-type coefficient audit gives `c12=90460` and `c5=123`.
For relative terminal index `L=1..700`, the exact raw count is

```text
90460 + 123*L.
```

The audited design's 194 consecutive shard ranges were used without change.
The assembly JSON pins every endpoint; its exact union is:

```text
terminal type indices          248..947
terminal types                       700
shards                               194
gaps                                   0
overlaps                               0
```

Every producer used set-valued exact lower recurrence plus prefix convolution.
Every independent audit used a list-valued exponent DP for all 90,460 lower
alpha-twelve multisets and 123 alpha-five bases, regenerated multiplicities,
and matched key and product tables in both SQLite `EXCEPT` directions. The
assembly audit independently rehashed and queried all 194 database triples and
reconstructed the recurrence formula and exact union.

## Exact aggregate

```text
independently enumerated raw multisets       93,500,050
canonical check keys                        70,283,913
distinct shard-product counts sum           69,784,624
raw-to-canonical equivalence compression    23,216,137
key-to-product compression within shards       499,289
negative Q8                                         0
zero Q8                                             0
minimum Q8                              3,444,529,617
maximum Q8                        270,971,484,934,248
```

Product counts are summed over shards, not globally deduplicated. Compression
counts are exact equivalence compression, not omissions.

## Resources

```text
fresh producer processes                      194
fresh independent audit processes             194
workers per process                              1
producer elapsed seconds sum           1,715.728710
audit elapsed seconds sum              1,853.607356
maximum producer peak private MiB        110.988281
maximum audit peak private MiB           176.253906
operating abort gate                            448 MiB
hard cap                                        512 MiB
```

No resource checkpoint, nonpositive sign, or database mismatch occurred.

## Immutable transitive hash seal

The complete assembly JSON pins the SHA-256 hashes of every one of the 194
report/database/audit triples. The independent assembly audit rehashes all 582
artifacts, queries every database, pins the assembly, and contains its own
complete transitive hash table.

```text
probe_rank8_exceptional_first_crossing_alpha7_s12_shard_exact.py
BF288CAF5E9BA52D7CBD0BFE4DD1E3E842EAA31B996EA6D025EC99AA30675853

audit_rank8_exceptional_first_crossing_alpha7_s12_shard.py
33F516ABFABCF4347EF0D20029E5756A19D03847344C1C3653F00D9E32E81AAC

assemble_rank8_exceptional_first_crossing_alpha7_s12.py
CCC24A44A76902AB7B6274E54BE588966823A8E8B15968AC5F88C9F91EC9305D

rank8_exceptional_first_crossing_alpha7_s12_complete_exact_20260820.json
41C2499212AECB4099065630D475C73650A504F2329EE0B181A9CC87067CA4A3

audit_rank8_exceptional_first_crossing_alpha7_s12_assembly.py
805236E004438831AAAC60A6FFCF85D68D380C51971E5E6AA46E08D539E4D646

rank8_exceptional_first_crossing_alpha7_s12_complete_audit_exact_20260820.json
FBA34DEC449B1D603CCF0B911D75872A3E9F05B2CB9044FDFAF25EEDC3904193
```

## Scope boundary

This closes only source alpha 12 of terminal alpha 7. Source alpha 13 remains.
Terminal alpha 8 and 9, full/full cones, connected `Delta0..3`, connected `Q8`,
full forest `Q8`, and PGC remain. No source-13, order-26, e2, or master work
was launched or modified.
