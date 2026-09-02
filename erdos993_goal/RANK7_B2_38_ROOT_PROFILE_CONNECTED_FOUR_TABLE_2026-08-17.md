# Rank-seven `B2=38` rooted positive-core connected-four table

Date: 2026-08-17

Status: **exact finite structural theorem for one degree/root-profile row;
not a proof of the full `B2>=6` band**.

## Scope

The row is

```text
n=23,
excess-degree partition (8,4,3,2,1,1,1,1),
B2=38, B3=61,
r=1, with the root leaf adjacent to the unique x=4 vertex.
```

Delete all degree-one vertices.  The remaining positive-excess core has
eight labeled vertices.  Its Prüfer code has length six, so there are
exactly

```text
8^6=262,144
```

labeled core trees before filtering.

The replay enumerates every code, requires each core degree to be at most
`x_i+1`, and requires the `x=4` vertex to retain at least one leaf slot for
the distinguished root.  It retains

```text
104,413 degree-feasible codes,
103,738 root-feasible codes.
```

For each retained core it computes exactly

```text
E=sum_(uv) x_u x_v
```

and the full-tree connected-four count `V` from its star, broom, and
length-four-path shapes.  The report records the exact minimum `V` at each
of the 80 attainable `E` levels.

## Critical stability rows

The exact `c4` identity specializes to

```text
c4=5488-E.
```

The endpoint cone needed `c4=5384,...,5394`, i.e. `E=104,...,94`.  The
exact table gives

| `E` | `c4` | minimum `V` |
|---:|---:|---:|
| 104 | 5384 | 644 |
| 103 | 5385 | impossible |
| 102 | 5386 | impossible |
| 101 | 5387 | impossible |
| 100 | 5388 | 618 |
| 99 | 5389 | 615 |
| 98 | 5390 | 613 |
| 97 | 5391 | 612 |
| 96 | 5392 | 590 |
| 95 | 5393 | 590 |
| 94 | 5394 | 583 |

Thus the equality-face lift persists throughout every attainable critical
integer `c4` value, while three apparent intermediate values are excluded
completely.

## Replay

```powershell
python .\enumerate_rank7_b2_38_root_profile_core.py
```

The replay writes `rank7_b2_38_root_profile_core_exact_20260817.json`,
including a minimizing Prüfer code, core edge set, core degrees, leaf-slot
vector, and shape decomposition for every attainable `E`.
