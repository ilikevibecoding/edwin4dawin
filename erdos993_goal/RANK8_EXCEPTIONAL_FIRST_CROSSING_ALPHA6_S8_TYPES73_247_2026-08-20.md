# Rank-eight alpha-six source-eight terminal-types 73--247 shard

Date: 2026-08-20

Status: **exact independently audited PASS for one source-alpha shard only.**

## Scoped theorem

Fix a terminal exceptional jet type `t` with global sorted index
`73 <= t <= 247` (equivalently, relative alpha-six type `1 <= t-72 <= 175`).
For every exceptional source product of alpha eight using component types at
most `t`, adjoining one copy of terminal type `t` gives total alpha 14 and

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

This statement covers exactly

```text
source alpha                         8
terminal alpha                       6
terminal global type indices    73--247
relative alpha-six types          1--175
terminal type count                 175
crossing total                        14
```

It covers no source-alpha-nine or higher cell.

## Exact recurrence result

The sorted-type recurrence processed each terminal prefix separately while
retaining canonical product jets through alpha 13.  Its final closure after
type 247 contained 243,051 partial states.

```text
canonical terminal/source checks       264,124
distinct product jets                  220,234
key-to-product collisions               43,890
negative Q8                                  0
zero Q8                                      0
minimum Q8                          9,399,272
maximum Q8                    603,568,797,696
```

The 43,890 key-to-product collisions are exact equivalence compression:
different canonical terminal/source keys can yield the same product jet.
They are not omitted cases.

## Independent no-gap audit

Because a source of alpha eight can contain at most one alpha-six source
component, the independent audit enumerated the shard by the disjoint
exponent classes

```text
no alpha-six source component:     1,334 lower-type multisets of alpha 8
one alpha-six source component:        5 lower-type multisets of alpha 2
```

For relative terminal index `L`, this gives exactly `1,334 + 5*L` raw source
multisets.  Summing without gaps for `L=1,...,175` gives 310,450 checks.

```text
raw multisets                         310,450
canonical keys                        264,124
distinct products                     220,234
multiset-to-key collisions             46,326
key-to-product collisions              43,890
maximum multisets per canonical key         4
maximum canonical keys per product          9
maximum multisets per product               24
negative Q8                                  0
zero Q8                                      0
```

The independently generated and recurrence key tables, and their product
tables, matched in both relational directions using SQLite `EXCEPT`.  The
recurrence database hash was unchanged by the audit.

## Resources

```text
recurrence workers                              1
recurrence elapsed                              4.73713270004373 seconds
recurrence peak private bytes                  129,732,608
recurrence peak private MiB                    123.72265625
recurrence maximum projected bytes             351,094,570
recurrence maximum projected MiB               334.829874038696

audit workers                                   1
audit elapsed                                   4.98012119997293 seconds
audit peak private bytes                       85,340,160
audit peak private MiB                         81.38671875

operating abort gate                          448 MiB
hard cap                                      512 MiB
```

No resource checkpoint or sign obstruction was produced.

## Exact hashes

```text
probe_rank8_exceptional_first_crossing_alpha6_s8_types73_247_exact.py
EE7107652BEBC52C6B1D7237E76F579D28D12894E510AB50ECA32AA0804560F6

rank8_exceptional_first_crossing_alpha6_s8_types73_247_exact_20260820.json
7EB4EB1FCAA4C12A86F25FE48EC210F27569FB1187A458FFB38188DD222413EA

rank8_exceptional_first_crossing_alpha6_s8_types73_247_keys_exact_20260820.sqlite3
B8FC7A8A77BCBBA1D243DBF09991B905523CAC8E492C1C63E69E624F3252070D

audit_rank8_exceptional_first_crossing_alpha6_s8_types73_247.py
C19C6453700AFFC23780A22BB6E972085C01F916816D187208FB819E3D5F25D5

rank8_exceptional_first_crossing_alpha6_s8_types73_247_audit_exact_20260820.json
98E94B82733EE2F04A978141E56F6225E8FC6DF0930DF865C0837743DFA198CB
```

## Scope boundary

This is one complete source-alpha-eight shard, not a complete terminal-alpha-
six theorem.  It does not certify source alpha 9 through 13 except for the
separately sealed source-13/type-247 pilot.  It does not certify any terminal-
alpha-seven-through-nine cell, a full/full cone, connected `Q8`, full forest
`Q8`, or PGC.  Computation stops before source alpha nine.
