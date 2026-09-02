# Rank-eight terminal-alpha-seven source-eleven complete theorem

Date: 2026-08-20

Status: **exact 67-shard no-gap PASS with 67 fresh independent bidirectional
audits.**

## Scoped theorem

For every terminal exceptional alpha-seven jet type with sorted index
`248 <= t <= 947`, and every exceptional source product of alpha eleven using
component types at most `t`, adjoining terminal type `t` gives total alpha 18
and

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

This theorem covers exactly source alpha 11 in the terminal-alpha-seven band.

## Exact recurrence and no-gap coverage

The independent lower-type coefficient audit gives `c11=36079` and `c4=39`.
For relative terminal index `L=1..700`, the exact raw count is

```text
36079 + 39*L.
```

The 67 sealed consecutive ranges are:

```text
248..262  263..276  277..290  291..304  305..318  319..332
333..345  346..358  359..371  372..384  385..397  398..410
411..422  423..434  435..446  447..458  459..470  471..482
483..494  495..505  506..516  517..527  528..538  539..549
550..560  561..571  572..582  583..593  594..604  605..614
615..624  625..634  635..644  645..654  655..664  665..674
675..684  685..694  695..704  705..714  715..724  725..734
735..743  744..752  753..761  762..770  771..779  780..788
789..797  798..806  807..815  816..824  825..833  834..842
843..851  852..860  861..869  870..878  879..887  888..895
896..903  904..911  912..919  920..927  928..935  936..943
944..947

exact union                  248..947
terminal types                    700
gaps                                0
overlaps                            0
```

Every producer used set-valued exact lower recurrence plus prefix convolution.
Every independent audit used a list-valued exponent DP for all 36,079 lower
alpha-eleven multisets and 39 alpha-four bases, regenerated multiplicities,
and matched key and product tables in both SQLite `EXCEPT` directions. The
assembly audit independently rehashed and queried all 67 database triples and
reconstructed the raw formula and exact union.

## Exact aggregate

```text
independently enumerated raw multisets       34,823,950
canonical check keys                        27,151,746
distinct shard-product counts sum           26,828,969
raw-to-canonical equivalence compression     7,672,204
key-to-product compression within shards       322,777
negative Q8                                         0
zero Q8                                             0
minimum Q8                              1,258,476,120
maximum Q8                         95,565,156,849,954
```

Product counts are summed over shards, not globally deduplicated. Compression
counts are exact equivalence compression, not omissions.

## Resources

```text
fresh producer processes                       67
fresh independent audit processes              67
workers per process                              1
producer elapsed seconds sum            426.895221
audit elapsed seconds sum               563.345926
maximum producer peak private MiB         65.894531
maximum audit peak private MiB            144.417969
operating abort gate                            448 MiB
hard cap                                        512 MiB
```

No resource checkpoint, nonpositive sign, or database mismatch occurred.

## Immutable transitive hash seal

The complete assembly JSON pins the SHA-256 hashes of every one of the 67
report/database/audit triples. The independent assembly audit rehashes all 201
artifacts, queries every database, pins the assembly, and contains its own
complete transitive hash table.

```text
probe_rank8_exceptional_first_crossing_alpha7_s11_shard_exact.py
0B60F5A973C2389E7FD0E4B78B33C6A24B66410B890302855CBAB2912E397EC5

audit_rank8_exceptional_first_crossing_alpha7_s11_shard.py
5CDF783473146E4879D15C890C85F87F2E762B32081698E4BCEEF4D1EA8AE4DF

assemble_rank8_exceptional_first_crossing_alpha7_s11.py
4D7A48145E94EA8BEB80B717B9B56E287F34A183306D25A93D24690F75E3DB48

rank8_exceptional_first_crossing_alpha7_s11_complete_exact_20260820.json
6814360C7FE17ABA30E5C22AD56189BF6999C6DC85DCB32A29579A79D43AC9A1

audit_rank8_exceptional_first_crossing_alpha7_s11_assembly.py
EE06118C1FBDF63A1E7875ACCD0123A6A7B0DB9ADBB388F4BE5159B37D199EE5

rank8_exceptional_first_crossing_alpha7_s11_complete_audit_exact_20260820.json
CD2FDF2AEC62F398B0440464F29996D5BC054660138DD7684BAA504633972DD8
```

## Scope boundary

This closes only source alpha 11 of terminal alpha 7. Sources alpha 12 and 13
remain. Terminal alpha 8 and 9, full/full cones, connected `Delta0..3`,
connected `Q8`, full forest `Q8`, and PGC remain. No source-12, order-26, e2,
or master work was launched or modified.
