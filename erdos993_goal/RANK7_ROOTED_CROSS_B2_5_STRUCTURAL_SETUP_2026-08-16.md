# Rooted rank-seven `B2=5` structural setup

## Status

The suppressed skeletons and exact subdivision workload are classified.  No
`B2=5` rooted-`C7` census has been launched, and this note proves no new `C7`
case.

## Exhaustive classification

At a branch vertex of degree `d`, the contribution to

```text
B2=sum_v C(deg(v)-1,2)
```

is 1 for degree three, 3 for degree four, and at least 6 for degree five.
Thus the only contribution partitions of 5 are

```text
3+1+1
1+1+1+1+1.
```

After suppressing degree-two vertices, this gives exactly four skeletons:

| skeleton | vertices | edges | edge-automorphism group |
|---|---:|---:|---:|
| degree four in the middle of two degree-three branches | 9 | 8 | 16 |
| degree four at the end of a three-branch path | 9 | 8 | 12 |
| five degree-three branches with branch tree `P5` | 12 | 11 | 8 |
| five degree-three branches with branch tree `T` | 12 | 11 | 16 |

The other unlabeled five-vertex branch tree is the four-leaf star, whose
central branch degree would be four; it is incompatible with every original
branch having degree three.

## Exact Burnside workload

The replay enumerates each skeleton automorphism, computes its induced edge
cycle type, and applies Burnside's lemma to positive integer edge lengths with
sum `n-1`.  Across orders 23--38 the exact subdivision-orbit counts are:

```text
degree4-middle mixed skeleton      3,355,132
degree4-end mixed skeleton         4,956,829
five-degree3 path skeleton       146,526,016
five-degree3 T skeleton           86,115,331
total                            240,953,308
```

Checking every vertex would require at most `8,607,092,601` rooted
evaluations, about 10.2 times the completed `B2=4` census.  Therefore the
heavy census was not started while the independent cone scan was active.

The two mixed skeletons form a much smaller natural first phase: 8,311,961
trees.  They are also the entire `B2=5` class containing a degree-four vertex;
the two large remaining families are purely cubic.

## Potential coverage

A complete `B2=5` closure would affect 57 of the current 83 residual cells,
removing 57 integer parameter levels.  The outer residual would remain

```text
83 cells
18,460 integer levels
B2>=6.
```

This is only a workload projection, not a theorem.

## Replay and hashes

```powershell
python classify_rank7_rooted_cross_b2_5_skeletons.py
```

SHA-256:

```text
classify_rank7_rooted_cross_b2_5_skeletons.py
CE7FE1876964D48AC6966E071DBE1B2A1246B1AB0F29448B02580395A5DBCB13

rank7_rooted_cross_b2_5_skeleton_classification_20260816.json
0B93322165E353AD027426DE9054E0330D6C28BE4E86ABF93C06F3B9A9C85F4B
```
