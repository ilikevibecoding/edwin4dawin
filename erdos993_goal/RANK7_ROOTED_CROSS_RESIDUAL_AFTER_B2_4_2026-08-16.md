# Exact rooted-`C7` residual after the `B2<=4` closure

## Result

The current rooted-`C7` coverage is:

- every rooted tree of orders 19--22, by exact free-tree census;
- every rooted tree of order at least 39, analytically;
- every rooted tree with `B2<=4` in orders 23--38, by suppressed-skeleton
  enumeration;
- the degree-staircase and curvature-closed cells in orders 23--38.

After combining those results with sharp root-degree feasibility bounds and
the exact piecewise extension transfer, the remaining outer parameter cut has

```text
83 (order,root-degree) cells
18,517 integer (order,root-degree,B2) levels
orders 23 through 38
B2 >= 5 in every cell.
```

This supersedes the preliminary 85-cell count in the standalone `B2=4` note.
It is still not a universal rooted-`C7` theorem.

## Two exact refinements

For root degree `r`, the root itself contributes `C(r-1,2)` to `B2`.  Since
the total degree excess is `n-2`, convexity gives the sharp double-star bounds

```text
C(r-1,2) <= B2 <= C(r-1,2)+C(n-r-1,2).
```

The smooth transfer used in the first large-order proof is also replaced by
the stronger certified envelope

```text
mu5 >= 2 Phi(mu4)/mu4,
```

where `Phi` linearly interpolates the integer values
`Phi(q)=C(q-1,2)`.  The replay checks the curvature scalar at every integer
`B2` in each structurally feasible interval.

## Remaining cells by order

| order | root-degree cells | integer `B2` levels |
|---:|---:|---:|
| 23 | 7 | 1,063 |
| 24 | 7 | 1,164 |
| 25 | 7 | 1,267 |
| 26 | 7 | 1,372 |
| 27 | 7 | 1,450 |
| 28 | 7 | 1,504 |
| 29 | 6 | 1,566 |
| 30 | 6 | 1,579 |
| 31 | 6 | 1,549 |
| 32 | 5 | 1,507 |
| 33 | 5 | 1,370 |
| 34 | 4 | 1,185 |
| 35 | 3 | 902 |
| 36 | 3 | 601 |
| 37 | 2 | 322 |
| 38 | 1 | 116 |
| **total** | **83** | **18,517** |

The JSON report lists the exact root degree and inclusive `B2` interval for
all 83 cells.  It calls this an uncovered parameter cut, not an assertion that
every integer level is realized by a tree.

## Replay and hashes

```powershell
python prove_rank7_rooted_cross_residual_after_b2_4.py
```

SHA-256:

```text
prove_rank7_rooted_cross_residual_after_b2_4.py
AE419372C407D451EB47F45F6981416C423A9D3CD2DCDC006D27F4DF2CA914C7

rank7_rooted_cross_residual_after_b2_4_exact_20260816.json
EBF9369561D528A94FA08846E6BF465DB7485D3DF271E462C63DF48E5473587D
```
