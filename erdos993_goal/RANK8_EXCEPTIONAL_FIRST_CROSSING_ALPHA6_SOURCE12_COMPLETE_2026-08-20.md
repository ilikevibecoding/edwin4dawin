# Rank-eight terminal-alpha-six source-twelve complete theorem

Date: 2026-08-20

Status: **exact fifteen-shard no-gap PASS with independent bidirectional audits.**

## Scoped theorem

For every terminal exceptional alpha-six jet type with sorted index
`73 <= t <= 247`, and every exceptional source product of alpha twelve using
component types at most `t`, adjoining terminal type `t` gives total alpha 18
and

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

This theorem covers exactly source alpha 12.  It does not extend the separately
sealed source-alpha-13/type-247 pilot to any other source-alpha-13 cell.

## Exact no-gap coverage

```text
73--94    95--113   114--129  130--144  145--157
158--169  170--181  182--192  193--202  203--212
213--221  222--230  231--238  239--246  247--247

exact union                         73--247
terminal types                          175
overlaps                                  0
gaps                                      0
```

## Exact result

```text
raw source multisets                  10,146,500
canonical terminal/source checks       7,443,922
distinct shard-product counts sum      7,280,065
multiset-to-key collisions             2,702,578
key-to-product collisions in shards      163,857
negative Q8                                    0
zero Q8                                        0
minimum Q8                        1,242,957,726
maximum Q8                   99,854,115,550,464
```

The product figure is the sum of sealed shard counts, not cross-shard global
deduplication.  Collision counts are exact equivalence compression.

At source alpha twelve, the source can contain zero, one, or two alpha-six
components.  The independent exponent audit found exactly

```text
lower-type alpha-12 multisets        30,260
lower-type alpha-6 multisets            256
lower-type alpha-0 multisets              1
raw checks at relative terminal L
  = 30,260 + 256*L + L*(L+1)/2
```

Summing this formula over the fifteen consecutive shards gives 10,146,500
raw checks with no omission or overlap.

Every shard audit independently regenerated its canonical key and product
tables and matched the recurrence tables in both SQLite `EXCEPT` directions.
The assembly audit rehashed all 45 shard artifacts, rederived the quadratic
raw-count formula, queried all fifteen databases for exact key/product/type,
sign and extrema fields, and reconstructed exactly `range(73,248)`.

## Resources

```text
fresh recurrence processes                 15
fresh independent audit processes          15
workers per process                         1
maximum recurrence peak private MiB         125.15234375
maximum audit peak private MiB              161.5859375
operating abort gate                        448 MiB
hard cap                                    512 MiB
```

No resource checkpoint or sign obstruction was produced.

## Transitive exact hash seal

The complete assembly JSON contains the exact SHA-256 hashes of every shard
report, SQLite database and independent audit report.  The independent
assembly-audit JSON rehashes those same artifacts and pins the assembly.

```text
probe_rank8_exceptional_first_crossing_alpha6_s12_shard_exact.py
66100DD95748CEB4E80FC4FD5836EC35C057F956B2CA3153421582078DB4D75C

audit_rank8_exceptional_first_crossing_alpha6_s12_shard.py
92658EB80040BDAE8439D0FC660258BB51BC0BADC56FA2524D018F2FB214A286

assemble_rank8_exceptional_first_crossing_alpha6_s12.py
5EC9AE12A0A83B8E9464B19EDF54384F2ADCAA09A17748E6637CEB1289FF7166

rank8_exceptional_first_crossing_alpha6_s12_complete_exact_20260820.json
EF1CDF5CCEC98B8707B737ADB7767C8511F9B45E685CFF7AC01C439F860CCB60

audit_rank8_exceptional_first_crossing_alpha6_s12_assembly.py
4EF495824EEFEFCDDDC3B9729EA04DAD865B89EAF831C049324166ED240A6FF2

rank8_exceptional_first_crossing_alpha6_s12_complete_audit_exact_20260820.json
B17E099ED2B879D7BA4FA556EFC7E7CC82F03DCFD2AB7245920BDE0484A1228B
```

## Scope boundary

This closes source alpha 12 for terminal alpha six only.  It does not certify
the remaining source-alpha-13 terminal types 73--246, terminal alpha 7--9, a
full/full cone, connected `Q8`, full forest `Q8`, or PGC.  Computation stops
before any new source-alpha-13 shard.
