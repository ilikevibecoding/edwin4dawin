# Rank-eight terminal-alpha-six source-ten complete theorem

Date: 2026-08-20

Status: **exact three-shard no-gap PASS with independent bidirectional audits.**

## Scoped theorem

Fix any terminal exceptional alpha-six jet type with global sorted index
`73 <= t <= 247`.  For every exceptional source product of alpha ten using
component types at most `t`, adjoining one copy of terminal type `t` gives
total alpha 16 and

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

This theorem covers exactly source alpha 10, terminal alpha 6, terminal types
73 through 247, and total alpha 16.  It does not cover source alpha 11.

## Exact no-gap coverage

```text
shard 1       terminal types  73--156
shard 2       terminal types 157--219
shard 3       terminal types 220--247
exact union                  73--247
overlaps                           0
gaps                               0
terminal types                   175
```

The independent assembly reconstructed the per-type lists from all recurrence
reports and audits and obtained exactly `range(73,248)`.

## Exact results

```text
raw source multisets                   1,864,450
canonical terminal/source checks       1,496,190
distinct shard-product counts sum      1,368,629
multiset-to-key collisions               368,260
key-to-product collisions in shards      127,561
negative Q8                                    0
zero Q8                                        0
minimum Q8                          133,044,600
maximum Q8                    9,698,003,143,200
```

The distinct-product figure is the sum of the three sealed shard counts, not
a claim of global product deduplication across shard boundaries.  Collision
counts record exact equivalence compression, never omitted cases.

A source of alpha ten contains either zero or one alpha-six source component.
The independent exponent audit used

```text
lower-type alpha-10 multisets       7,222
lower-type alpha-4 multisets           39
raw checks for terminal L     7,222 + 39*L
```

This gives exact raw shard counts 745,878, 739,998, and 378,574, totaling
1,864,450 without overlap or gap.

Every audit independently regenerated the canonical key and product tables
and matched its recurrence tables in both SQLite `EXCEPT` directions.  The
assembly audit rehashed every artifact, re-queried the databases for exact
counts, terminal-type coverage, extrema and nonpositive rows, and rebuilt the
complete union.

## Per-shard resources

```text
types 73--156 recurrence elapsed       8.76198379998095 seconds
types 73--156 recurrence peak          98,983,936 bytes = 94.3984375 MiB
types 73--156 audit elapsed            12.2391364000505 seconds
types 73--156 audit peak               156,446,720 bytes = 149.19921875 MiB

types 157--219 recurrence elapsed      9.22836859989911 seconds
types 157--219 recurrence peak         121,630,720 bytes = 115.99609375 MiB
types 157--219 audit elapsed           12.9287419000175 seconds
types 157--219 audit peak              158,240,768 bytes = 150.91015625 MiB

types 220--247 recurrence elapsed      5.04099170002155 seconds
types 220--247 recurrence peak         131,166,208 bytes = 125.08984375 MiB
types 220--247 audit elapsed           6.60658460005652 seconds
types 220--247 audit peak              103,813,120 bytes = 99.00390625 MiB

workers per process                    1
operating abort gate                   448 MiB
hard cap                               512 MiB
```

No resource checkpoint or sign obstruction was produced.

## Exact hashes

```text
probe_rank8_exceptional_first_crossing_alpha6_s10_shard_exact.py
0132D1E2994357949BDA1DF95F65FFE34A98A48FB465B42C2DE254F9BC185513

audit_rank8_exceptional_first_crossing_alpha6_s10_shard.py
B40DEEDF92DEA09D27BF359464BA88ED3739FB3B213D8A1425D04612F3BEDC77

rank8_exceptional_first_crossing_alpha6_s10_types73_156_exact_20260820.json
9174B946CEC093F4FD89B3FF78F97B197157F9B6FC381BE36DB8CA5CC0D37A2B

rank8_exceptional_first_crossing_alpha6_s10_types73_156_keys_exact_20260820.sqlite3
63EBAACD703CF7AD13A1ADF8964ABB156B080664410193A00B73F3F9B662094A

rank8_exceptional_first_crossing_alpha6_s10_types73_156_audit_exact_20260820.json
B5017F21ED7916CE51CD2C3A5608C5D4BD6835BA35058C9444B5692E5D5BCE14

rank8_exceptional_first_crossing_alpha6_s10_types157_219_exact_20260820.json
D93A19A77105F692EE94D1707AB8EF3510D4E7DF1E4E72B540970F745BE2B87B

rank8_exceptional_first_crossing_alpha6_s10_types157_219_keys_exact_20260820.sqlite3
72363CF5EF6E14F414FAA483FDABE838BB205B11CDF6921F062FC3CF7DB696A9

rank8_exceptional_first_crossing_alpha6_s10_types157_219_audit_exact_20260820.json
B6FB08FEABEAD92268B39E41E254F9D967147C12F8FEBC78DD78DDE91B4F80EB

rank8_exceptional_first_crossing_alpha6_s10_types220_247_exact_20260820.json
53A2DD01A6250CFA5524979634B9F31B10F43A1DCC55A50BA2114855A8A7113A

rank8_exceptional_first_crossing_alpha6_s10_types220_247_keys_exact_20260820.sqlite3
35E193ABFFD7D5D80A38C0A67E871D848DA71A65582636699C3088681FA155E2

rank8_exceptional_first_crossing_alpha6_s10_types220_247_audit_exact_20260820.json
2ADA128BC98F1FFA546E90FCACF09C7F6BB9E0A0936935183E2F4D518443A1BA

assemble_rank8_exceptional_first_crossing_alpha6_s10.py
862F047D6639FC1A8C0B00A7C42FF18B978B2D82A6DD3B0D74D55D395DC309B8

rank8_exceptional_first_crossing_alpha6_s10_complete_exact_20260820.json
3F8CB1ECCCACAB493B58BF558D21529CF2449A1FBCCECF941053462F9941698B

audit_rank8_exceptional_first_crossing_alpha6_s10_assembly.py
3CEFE46E75039F24515D28D9FC92D40C27614CAAF022C73419B9986BA84A4CB9

rank8_exceptional_first_crossing_alpha6_s10_complete_audit_exact_20260820.json
DB6AEFC73EF103E8CF119471D085BA65F2542830CCCB32052988B1FBBDC04AD1
```

## Scope boundary

This is a complete source-alpha-ten theorem for terminal alpha six, not a
complete terminal-alpha-six theorem.  It does not certify source alpha 11
through 13 except for the separately sealed source-13/type-247 pilot.  It does
not certify terminal alpha 7 through 9, a full/full cone, connected `Q8`, full
forest `Q8`, or PGC.  Computation stops before source alpha 11.
