# Rank-seven terminal-broom connected-four count on the sharp edge face

Date: 2026-08-17

Status: **proved exact structural reduction; not yet a positivity theorem
for the remaining `B2>=6` band**.

## Equality structure

Let `x_v=deg(v)-1`, let `M=max_v x_v`, and suppose `M` occurs at a
unique vertex.  Root the tree there.  The standard degree-correlation
bound is

```text
E=sum_(uv) x_u x_v <= M(n-2-M).
```

It is obtained by summing

```text
x_parent x_v <= M x_v
```

over all non-root vertices.  If equality holds, every term with `x_v>0`
must have `x_parent=M`.  Uniqueness of the maximum therefore forces every
other positive-excess vertex to be adjacent to the `M`-vertex.  The
positive-excess core is a star.

## Exact connected-four count

Write the remaining positive excesses as `y_1,...,y_k`.  Leaf degrees are
then forced.  The number `V` of connected four-edge subtrees is

```text
V = C(M+1,4) + sum_i C(y_i+1,4)
    + C(M,2) sum_i y_i + M sum_i C(y_i,2)
    + sum_(i<j) y_i y_j.                         (1)
```

The five terms count the star, broom, and length-four-path shapes.

## Diagnostic cell

For the excess partition

```text
(8,4,3,2,1,1,1,1)
```

at `n=23`, formula (1) gives

```text
B2=38, B3=61, E=104, V=644.
```

The previously used stronger general connected-four lower bound gives
only

```text
V >= (n-4)+B2+B3+E-(n-3)=202.
```

Thus the sharp equality face supplies an additional exact `c5` lift of

```text
644-202=442.
```

The replay constructs the forced tree, checks the degree statistics and
all three connected-four shapes independently, and verifies the formula.

## Remaining obligation

Use the exact equality-face value, and a stability version away from the
face if necessary, in the root-conditioned `B2>=6` endpoint cone.  No
final positivity claim is made here.

## Replay

```powershell
python .\verify_rank7_terminal_broom_edge_equality_connected_four.py
```

The replay writes
`rank7_terminal_broom_edge_equality_connected_four_exact_20260817.json`.
