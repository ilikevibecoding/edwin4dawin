# Rank-eight terminal-alpha-six source-thirteen complete theorem

Date: 2026-08-20

Status: **exact no-gap PASS for terminal types 73 through 247, with 32 new
sequential shards, 32 independent bidirectional audits, and the already sealed
type-247 pilot reused without rerunning it.**

## Scoped theorem

For every terminal exceptional alpha-six jet type with sorted index
`73 <= t <= 247`, and every exceptional source product of alpha thirteen using
component types at most `t`, adjoining terminal type `t` gives total alpha 19
and

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

This theorem covers exactly source alpha 13 in the terminal-alpha-six band.

## Exact no-gap coverage

```text
73--83    84--93    94--102   103--110  111--118  119--125
126--132  133--139  140--145  146--151  152--157  158--163
164--168  169--173  174--178  179--183  184--188  189--193
194--197  198--201  202--205  206--209  210--213  214--217
218--221  222--225  226--229  230--233  234--237  238--240
241--243  244--246  247--247

exact union                         73--247
terminal types                          175
overlaps                                  0
gaps                                      0
new recurrence shards                    32
new independent shard audits             32
sealed pilot cells reused                 1
```

The `247--247` cell is the previously sealed pilot.  Its report, SQLite
database, audit, producer and auditor hashes were reused unchanged; none of
those artifacts was recomputed.

## Exact result

```text
raw source multisets                  21,803,250
canonical terminal/source checks      15,156,851
distinct shard-product counts sum     14,940,421
multiset-to-key collisions             6,646,399
key-to-product collisions in shards      216,430
negative Q8                                    0
zero Q8                                        0
minimum Q8                        3,524,647,923
maximum Q8                  282,462,928,635,888
```

The product figure is the sum of sealed shard counts, not cross-shard global
deduplication.  Both collision figures are exact equivalence compression, not
omissions.

The independent exponent audit rederived the source-alpha-thirteen count from
the three possible remaining-alpha classes:

```text
lower-type alpha-13 multisets             63,606
lower-type alpha-7 multisets                 575
lower-type alpha-1 multisets                   2
raw checks at relative terminal index L
  = 63,606 + 575*L + L*(L+1)
```

Summing this formula over terminal types 73 through 247 gives exactly
21,803,250 raw checks.  Every new shard audit independently regenerated the
canonical key and product tables and matched the recurrence database in both
SQLite `EXCEPT` directions.  The assembly audit rehashed all new artifacts and
the sealed pilot, queried all 33 databases for type/count/sign/extrema fields,
and reconstructed exactly `range(73,248)`.

## Resources

```text
workers per fresh process                      1
new fresh recurrence processes                32
new fresh independent audit processes         32
maximum new recurrence peak private MiB       125.265625
maximum new audit peak private MiB             168.14453125
operating abort gate                          448 MiB
hard cap                                      512 MiB
```

No resource checkpoint or sign obstruction was produced.

## Transitive exact hash seal

The complete assembly JSON contains the exact SHA-256 hashes of all 32 new
triples of shard report, SQLite database and audit report, plus the sealed pilot
artifacts.  The independent assembly-audit JSON rehashes the same inputs and
pins the assembly.

```text
probe_rank8_exceptional_first_crossing_alpha6_s13_shard_exact.py
F7C6514711F5895BF048C586F8C573484FFCE9501EBF7FCFFA1352A38A355771

audit_rank8_exceptional_first_crossing_alpha6_s13_shard.py
00B27C3BD9F6070D466990AC7C97B7123A0A58E83BDA0FC3B988D244AEC20920

assemble_rank8_exceptional_first_crossing_alpha6_s13.py
06EBC6A62617B7F8F30FB4083AEC2BB3CED2D7667E926685A169F19023AE7E0F

rank8_exceptional_first_crossing_alpha6_s13_complete_exact_20260820.json
0327AFE9BFFA08B05D5D2B3AE708E097E97D4CF2F18A075F10C72994593559B2

audit_rank8_exceptional_first_crossing_alpha6_s13_assembly.py
FF9E46F2256B4C78CE34938DDD5BAB3A905FFAE04422A36116CE9575A1CBE0EF

rank8_exceptional_first_crossing_alpha6_s13_complete_audit_exact_20260820.json
E9B9023D4905EA81EA45071691696671C3FF070415DC92D309058872A0BED139
```

Sealed type-247 pilot hashes reused unchanged:

```text
producer source  3FE33B1C881F44166B374020621CF03B980B71BFB3981081378F52793BB7D748
auditor source   295A7FA41BC5D9C1F9F8A4D1AFD52E2685ACB38D4FE6973359D08C6034219325
pilot report     FE07EFB377CA8C29916256C69312D1D2ECFE3E166532E9C472CD2CF180C3BB8F
pilot database   977899C986821067940BE2CAD62E443E7293D12C4AD5D3B8D7A94B0307EFD045
pilot audit      7314319877C2E5C6C94F72F9B4F27237E25A71AD72ED8A94A06E226044AC0180
```

## Scope boundary

This closes source alpha 13 and therefore the complete terminal-alpha-six
first-crossing band.  It does not certify terminal alpha 7 through 9, a
full/full cone, connected `Q8`, full forest `Q8`, or PGC.  Computation stopped
before terminal alpha 7.
