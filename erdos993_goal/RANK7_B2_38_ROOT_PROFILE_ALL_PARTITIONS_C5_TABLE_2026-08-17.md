# Rank-seven `B2=38` rooted all-partition exact `c5` table

Date: 2026-08-17

Status: **exact finite structural theorem for the `n=23,B2=38,r=1,x=4`
row; not a proof of the full `B2>=6` band**.

## Complete compatible degree list

The root is a leaf adjacent to an excess-four vertex.  Exactly five
excess-degree partitions of `21=n-2` have `B2=38` and contain a part four:

```text
(8,4,3,2,1,1,1,1),
(8,4,2,2,2,2,1),
(7,5,4,2,1,1,1),
(6,6,4,2,2,1),
(6,5,4,4,2).
```

The replay enumerates every labeled Prüfer core for all five partitions,
filters the exact degree capacities and the root leaf slot, and computes
`E`, `V`, and the exact rank-`(4,5)` motif identity.  In total it examines

```text
262,144 + 16,807 + 16,807 + 1,296 + 125
=297,179
```

Prüfer codes.

For each integer `c4`, it minimizes the resulting exact `c5` over every
compatible partition and every attainable `E` row.  Thus the second
frontier partition is retained whenever it is worse than the first.

## Critical exact rows

| `c4` | exact minimum `c5` | comment |
|---:|---:|---|
| 5384 | 14979 | first partition, `E=104,V=644` |
| 5385 | 14994 | second partition, `E=104,V=643` |
| 5386 | — | impossible for all five partitions |
| 5387 | — | impossible for all five partitions |
| 5388 | 15021 | first partition, `E=100,V=618` |
| 5389 | 15035 | first partition, `E=99,V=615` |
| 5390 | 15050 | first partition, `E=98,V=613` |
| 5391 | 15065 | second partition, `E=98,V=612` |
| 5392 | 15061 | first partition, `E=96,V=590` |
| 5393 | 15076 | second partition, `E=96,V=589` |
| 5394 | 15088 | first partition, `E=94,V=583` |
| 5395 | 15105 | first partition, `E=93,V=583` |

The full JSON retains every attainable `c4` row, a minimizing partition,
Prüfer code, core edge set, degree vector, leaf-slot vector, and connected-
four shape decomposition.

## Replay

```powershell
python .\enumerate_rank7_b2_38_root_profile_all_partitions.py
```

The replay writes
`rank7_b2_38_root_profile_all_partitions_exact_20260817.json`.
