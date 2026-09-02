# Rank-eight alpha-six streaming design and terminal-type-247 pilot

Date: 2026-08-20

Status: **exact count/resource design with zero broad alpha-six product
enumeration, plus an exact independently audited PASS for the single cell
`source=13`, `terminal type=247`.  No other alpha-six shard is certified.**

## Why the current audit cannot be reused unsharded

There are 175 exceptional alpha-six component types, indices `73..247`.
The exact raw first-crossing multiset counts are

```text
source  total  raw multisets
   8     14       310,450
   9     15       753,550
  10     16     1,864,450
  11     17     4,441,150
  12     18    10,146,500
  13     19    21,803,250
total          39,319,350
```

Scaling the measured alpha-five source-13 audit peak per canonical key,
pessimistically treating every raw alpha-six multiset as a distinct key,
multiplying by 1.25, and adding 32 MiB gives an unsharded source-13 projection
of

```text
10,704,914,348 bytes = 9.9697283916 GiB.
```

This is a resource obstruction to source-cell-only auditing.  It is not a
negative sign, forest counterexample, or alpha-six theorem.

## Exact bounded streaming design

The raw partial-state upper bound through alpha 13 after all 247 types is

```text
alpha   0 1 2  3  4   5   6   7    8    9    10    11    12     13
raw     1 2 5 13 39 123 431 925 2209 5437 14047 36079 90460 195031
```

Its total is 344,802.

For source alpha `s` and relative alpha-six terminal type `L`, deleting the
canonical terminal copy leaves exactly

```text
sum_(k=0)^floor(s/6) C(k+L-1,k) c_(s-6k)
```

raw source multisets, where `c_j` is the exact lower alpha-one-through-five
multiset count.  Greedily grouping consecutive largest types below a 750,000
raw-multiset ceiling gives

```text
source    shards
   8         1
   9         2
  10         3
  11         7
  12        15
  13        33
total       61
```

The largest shard has 748,113 raw multisets.  Its projected private peak is
399,710,078 bytes (381.1932354 MiB), below the proposed 448 MiB operating
abort gate and 512 MiB hard cap.  The recurrence state plus bounded database
cache projects to 386,163,927 bytes (368.2746191 MiB).

The design uses one worker.  The recurrence builds the sorted-type state
closure once and streams 2,500-row batches into consecutive largest-type
shards.  Each independent audit runs one `(source, type block)` in a fresh
process, compares its key and product tables in both directions, and deletes
the temporary database before the next shard.

Conservative alpha-five scaling projects about 913.7 seconds of recurrence
work, 2,671.9 seconds of audit work before per-shard startup overhead, and a
9,589,956,652-byte sealed recurrence-database upper bound.

The independent design audit rebuilt all lower coefficients by type-by-type
unbounded knapsack, incrementally added all 175 alpha-six types, and recovered
every source/largest-type shard count.  It enumerated zero alpha-six products.

## Exact requested pilot

Only the final source-13 block was run:

```text
source alpha                  13
terminal alpha                 6
crossing total                19
terminal type index          247
relative alpha-six type      175
terminal jet     (1,12,55,130,170,117,33,0,0,0)
```

The complete 247-type recurrence closure had exact distinct-state counts

```text
alpha   0 1 2  3  4   5   6   7    8    9    10    11    12     13
states  1 2 5 13 38 117 397 775 1853 4463 11174 27688 66184 130341
```

for a total of 243,051 partial states.

Pilot signs:

```text
canonical checks             130,341
distinct products            130,341
key-to-product collisions          0
negative Q8                        0
zero Q8                            0
minimum Q8           168,568,018,762
maximum Q8       282,462,928,635,888
```

The independent audit enumerated all 195,031 raw source multisets.  They
compressed to 130,341 canonical keys, with 64,690 multiset-to-key collisions,
and matched the recurrence key and product tables in both directions.

Pilot resources:

```text
workers                         1
elapsed                          3.4311282000271603 seconds
peak private bytes             129,654,784
peak private MiB               123.6484375
maximum projected bytes        316,035,435
maximum projected MiB          301.39487743377686
abort gate                     448 MiB
hard cap                       512 MiB
```

Audit resources:

```text
workers                         1
elapsed                         15.38683809991926 seconds
peak private bytes             69,763,072
peak private MiB               66.53125
abort gate                     448 MiB
hard cap                       512 MiB
```

No resource checkpoint or sign obstruction was produced.

## Exact hashes

```text
design_rank8_exceptional_first_crossing_alpha6_streaming.py
A7AF9F397AECFC209500E4737E1A16FF9E59A2049308EE6747E6A6D095A82B38

rank8_exceptional_first_crossing_alpha6_streaming_design_exact_20260820.json
4986E672D8CC853957C11E45D339DEE54D835E2AB1CD25A916A3695AD71BA06D

audit_rank8_exceptional_first_crossing_alpha6_streaming_design.py
A11217D46406070BB3DD63FBFE66858FE81F7DD8B9929E02D71E0DB11783FFBD

rank8_exceptional_first_crossing_alpha6_streaming_design_audit_exact_20260820.json
E97994C367F88272652BE3BF507C9A758E2E4C6FCAB4E05D5BD357CAFC146DCC

probe_rank8_exceptional_first_crossing_alpha6_s13_type247_exact.py
3FE33B1C881F44166B374020621CF03B980B71BFB3981081378F52793BB7D748

rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_exact_20260820.json
FE07EFB377CA8C29916256C69312D1D2ECFE3E166532E9C472CD2CF180C3BB8F

rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_keys_exact_20260820.sqlite3
977899C986821067940BE2CAD62E443E7293D12C4AD5D3B8D7A94B0307EFD045

audit_rank8_exceptional_first_crossing_alpha6_s13_type247.py
295A7FA41BC5D9C1F9F8A4D1AFD52E2685ACB38D4FE6973359D08C6034219325

rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_audit_exact_20260820.json
7314319877C2E5C6C94F72F9B4F27237E25A71AD72ED8A94A06E226044AC0180
```

## Scope boundary

This pilot proves only source 13 with terminal type 247.  It does not certify
any other alpha-six terminal type or source cell, does not complete terminal
alpha six, and does not start alpha seven.  No full/full cone or connected
`Delta0..3` computation was run.
