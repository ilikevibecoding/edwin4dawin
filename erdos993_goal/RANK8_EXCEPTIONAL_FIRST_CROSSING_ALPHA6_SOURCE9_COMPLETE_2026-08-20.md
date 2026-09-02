# Rank-eight terminal-alpha-six source-nine complete theorem

Date: 2026-08-20

Status: **exact two-shard no-gap PASS with independent bidirectional audits.**

## Scoped theorem

Fix any terminal exceptional alpha-six jet type with global sorted index
`73 <= t <= 247`.  For every exceptional source product of alpha nine using
component types at most `t`, adjoining one copy of terminal type `t` gives
total alpha 15 and

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

This theorem covers exactly source alpha 9, terminal alpha 6, terminal types
73 through 247, and total alpha 15.  It does not cover source alpha 10.

## Exact no-gap coverage

The prescribed fresh-process shards were

```text
shard 1       terminal types 73--246
shard 2       terminal type  247
exact union                  73--247
overlaps                           0
gaps                               0
terminal types                   175
```

The independent assembly reconstructed the per-type lists from both recurrence
reports and both audits and obtained exactly `range(73,248)`.

## Exact results

```text
raw source multisets                 753,550
canonical terminal/source checks     625,033
distinct shard-product counts sum    516,570
multiset-to-key collisions           128,517
key-to-product collisions in shards  108,463
negative Q8                                0
zero Q8                                    0
minimum Q8                        37,487,421
maximum Q8                 2,584,714,768,416
```

The distinct-product figure is deliberately the sum of the two sealed shard
counts, not a claim that products were globally deduplicated across shard
boundaries.  All collision counts are equivalence compression, not omissions.

For a relative alpha-six terminal index `L`, a source of alpha nine contains
either no alpha-six source component or exactly one.  The independent audit
therefore used the disjoint exponent classes

```text
lower-type alpha-9 multisets       3,162
lower-type alpha-3 multisets          13
raw checks for terminal L    3,162 + 13*L
```

This gives 748,113 raw checks for `L=1,...,174` and 5,437 for `L=175`,
totaling 753,550 without a gap.

Both audits regenerated the canonical key and product tables independently.
Each audit table matched its recurrence table in both SQLite `EXCEPT`
directions, and every database hash remained unchanged.  The final assembly
audit also re-queried every SQLite table for key/product counts, exact terminal
type coverage, extrema, and absence of nonpositive values.

## Per-shard resources

```text
types 73--246 recurrence elapsed       9.36803560005501 seconds
types 73--246 recurrence peak          131,256,320 bytes = 125.17578125 MiB
types 73--246 audit elapsed            12.1061953000026 seconds
types 73--246 audit peak               152,375,296 bytes = 145.31640625 MiB

type 247 recurrence elapsed            1.66249309992418 seconds
type 247 recurrence peak               112,910,336 bytes = 107.6796875 MiB
type 247 audit elapsed                 0.173782600089908 seconds
type 247 audit peak                    20,602,880 bytes = 19.6484375 MiB

workers per process                    1
operating abort gate                   448 MiB
hard cap                               512 MiB
```

No resource checkpoint or sign obstruction was produced.

## Exact hashes

```text
probe_rank8_exceptional_first_crossing_alpha6_s9_shard_exact.py
7B64131262F240E0E9701E7958B2CF6FDFE8CA85F05D050DA54D760A1FDEF776

audit_rank8_exceptional_first_crossing_alpha6_s9_shard.py
8083399FEEFF087A04E0FBE5856942F2576259BAC5485A86A2862E4134129FA6

rank8_exceptional_first_crossing_alpha6_s9_types73_246_exact_20260820.json
0B679DF66A391B301C0D0179E4C23F58CB30998E687A668A0DD7185E7A8DA47A

rank8_exceptional_first_crossing_alpha6_s9_types73_246_keys_exact_20260820.sqlite3
D310534896E79D4E0C5AB6CDBEC406D4793926BB2315B573595D1FB49518A080

rank8_exceptional_first_crossing_alpha6_s9_types73_246_audit_exact_20260820.json
CF9DBB8D75C9C13BCEC16D4EF1FE9C0CC65CEEA52EA527B2CE9AF04861CBE55D

rank8_exceptional_first_crossing_alpha6_s9_type247_exact_20260820.json
1D33B1515EFCA4F3D3792E9C4EE2DDE4FC2EC009677B5FF4BFBBD69965457A3A

rank8_exceptional_first_crossing_alpha6_s9_type247_keys_exact_20260820.sqlite3
CDAB5408DED175CF42114331024ED57351B43C5406970C104C4CE6A08DF9C661

rank8_exceptional_first_crossing_alpha6_s9_type247_audit_exact_20260820.json
07D8F5B93CC415CAAB16AB1456668DB0F8ED39E3E2F019619EC2340E0D407DFB

assemble_rank8_exceptional_first_crossing_alpha6_s9.py
1AA6E38EC1C19E0B71244E2D2D1F5721C1E141F4768D57D2E3986315BF2CA481

rank8_exceptional_first_crossing_alpha6_s9_complete_exact_20260820.json
3FA63B5C268993BDA02B63D73BC82F7823CE171EE42F0D368B63A55B45B6F91A

audit_rank8_exceptional_first_crossing_alpha6_s9_assembly.py
15586DBFB4AAB4F2B35E483B06BA693F6EEBFAE5BCD6EEFB8ADBEBE70B2BF683

rank8_exceptional_first_crossing_alpha6_s9_complete_audit_exact_20260820.json
D8B33E850B03D7725609504401AE80494E7A20807E655321E36E5D79FC236651
```

## Scope boundary

This is a complete source-alpha-nine theorem for terminal alpha six, not a
complete terminal-alpha-six theorem.  It does not certify source alpha 10
through 13 except for the separately sealed source-13/type-247 pilot.  It does
not certify terminal alpha 7 through 9, a full/full cone, connected `Q8`, full
forest `Q8`, or PGC.  Computation stops before source alpha 10.
