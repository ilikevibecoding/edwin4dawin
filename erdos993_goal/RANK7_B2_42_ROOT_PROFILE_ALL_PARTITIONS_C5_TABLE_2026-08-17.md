# Rank-seven `B2=42` rooted all-partition exact `c5` table

Date: 2026-08-17

Status: **exact finite structural theorem for the `n=23,B2=42,r=1,x=4`
row; not a proof of the full `B2>=6` band**.

## Scope and method

The root is a leaf adjacent to an excess-four vertex.  Exactly four
partitions of `21=n-2` have `B2=42` and contain a part four:

```text
(9,4,1,1,1,1,1,1,1,1),
(8,4,4,2,2,1),
(7,6,4,1,1,1,1),
(6,6,4,4,1).
```

The largest positive core has ten vertices, for which a labeled Prüfer
census would have `10^8` codes.  Instead, the replay crosses every
nonisomorphic tree shape with every distinct assignment of the excess
multiset to its vertices:

| partition size | shapes | assignments/shape | pairs |
|---:|---:|---:|---:|
| 10 | 106 | 90 | 9,540 |
| 6 | 6 | 180 | 1,080 |
| 7 | 11 | 210 | 2,310 |
| 5 | 3 | 30 | 90 |

This is an exact over-labeled coverage of every weighted core isomorphism
type, totaling only 13,020 pairs.  The replay applies the degree-capacity
and root-leaf-slot filters, computes exact `E` and `V`, and minimizes the
exact rank-`(4,5)` motif value `c5` at each attainable integer `c4`.

## Critical rows

| `c4` | exact minimum `c5` | status |
|---:|---:|---|
| 5425 | 15136 | `E=108,V=761` |
| 5426–5429 | — | impossible |
| 5430 | 15189 | `E=103,V=729` |
| 5431–5432 | — | impossible |
| 5433 | 15234 | `E=100,V=723` |
| 5434 | — | impossible |
| 5435 | 15244 | `E=98,V=699` |
| 5436–5437 | — | impossible |
| 5438 | 15283 | `E=95,V=687` |
| 5439 | — | impossible |
| 5440 | 15301 | `E=93,V=671` |

The full report retains every attainable `c4`, its minimizing partition,
weighted core witness, leaf-slot vector, and connected-four shape terms.

## Replay

```powershell
python .\enumerate_rank7_b2_42_root_profile_all_partitions.py
```

The replay writes
`rank7_b2_42_root_profile_all_partitions_exact_20260817.json`.
