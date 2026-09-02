# Rank-eight terminal-alpha-seven source-ten complete theorem

Date: 2026-08-20

Status: **exact 25-shard no-gap PASS with 25 fresh independent bidirectional
audits.**

## Scoped theorem

For every terminal exceptional alpha-seven jet type with sorted index
`248 <= t <= 947`, and every exceptional source product of alpha ten using
component types at most `t`, adjoining terminal type `t` gives total alpha 17
and

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

This theorem covers exactly source alpha 10 in the terminal-alpha-seven band.

## Exact recurrence and no-gap coverage

The independent lower-type coefficient audit gives `c10=14047` and `c3=13`.
For relative terminal index `L=1..700`, the exact raw count is

```text
14047 + 13*L.
```

The 25 sealed consecutive ranges are:

```text
248..285  286..322  323..358  359..392  393..426
427..459  460..491  492..522  523..552  553..582
583..611  612..639  640..667  668..694  695..721
722..747  748..773  774..799  800..824  825..849
850..873  874..897  898..921  922..944  945..947

exact union                  248..947
terminal types                    700
gaps                                0
overlaps                            0
```

Every producer used set-valued exact lower recurrence plus prefix convolution.
Every independent audit used a list-valued exponent DP for all 14,047 lower
alpha-ten multisets and 13 alpha-three bases, regenerated multiplicities, and
matched key and product tables in both SQLite `EXCEPT` directions.  The
assembly audit independently rehashed and queried all 25 database triples and
reconstructed the raw formula and exact union.

## Exact aggregate

```text
independently enumerated raw multisets       13,022,450
canonical check keys                        10,466,184
distinct shard-product counts sum           10,294,042
raw-to-canonical equivalence compression     2,556,266
key-to-product compression within shards       172,142
negative Q8                                         0
zero Q8                                             0
minimum Q8                                429,455,000
maximum Q8                         31,127,566,208,700
```

Product counts are summed over shards, not globally deduplicated.  Compression
counts are exact equivalence compression, not omissions.

## Resources

```text
fresh producer processes                       25
fresh independent audit processes              25
workers per process                              1
producer elapsed seconds sum            150.018542
audit elapsed seconds sum               206.094704
maximum producer peak private MiB         45.234375
maximum audit peak private MiB            131.105469
operating abort gate                            448 MiB
hard cap                                        512 MiB
```

No resource checkpoint, nonpositive sign, or database mismatch occurred.

## Immutable transitive hash seal

The complete assembly JSON pins the SHA-256 hashes of every one of the 25
report/database/audit triples.  The independent assembly audit rehashes all 75
artifacts, queries every database, pins the assembly, and contains its own
complete transitive hash table.

```text
probe_rank8_exceptional_first_crossing_alpha7_s10_shard_exact.py
EF05DCD0515CD4E7CC8453B383646BAB2164C2EEE192E9B316AB50EE414FD97C

audit_rank8_exceptional_first_crossing_alpha7_s10_shard.py
09452F80916E9F78E9DB8700271F58CEA64287C1694215D9E66582CE7F187899

assemble_rank8_exceptional_first_crossing_alpha7_s10.py
2E2F50D07744EF4E1300160746DA8879310A47081D77C1FE569FEEB6777D5456

rank8_exceptional_first_crossing_alpha7_s10_complete_exact_20260820.json
20AE9E9D9C68AA33B3FB890BDDDF0897B0EBA89ACB4A33950C7AFC09EB17D444

audit_rank8_exceptional_first_crossing_alpha7_s10_assembly.py
4BBC86759A79FE7141002D0E0FECD0C7A1D29603BE2C239E1F98F6E7722C5F49

rank8_exceptional_first_crossing_alpha7_s10_complete_audit_exact_20260820.json
AC6B079B1BF0F26909A1822FC1E172675A6112AB421E3F599D93D6034483968A
```

## Scope boundary

This closes only source alpha 10 of terminal alpha 7.  Sources alpha 11 through
13 remain.  Terminal alpha 8 and 9, full/full cones, connected `Delta0..3`,
connected `Q8`, full forest `Q8`, and PGC remain.  No source-11, order-26, e2,
or master work was launched or modified.
