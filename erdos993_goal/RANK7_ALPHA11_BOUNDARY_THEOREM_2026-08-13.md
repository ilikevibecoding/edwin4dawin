# Complete rank-seven `alpha(B)=11` boundary theorem

Date: 2026-08-13

Status: **proved all-order exceptional-boundary theorem, with exact finite
replays**.  The order bound below makes the finite classification exhaustive.
This closes the `V_7(B)` obstruction in the rank-seven pendant identity,
conditional only on the separate all-forest `Q_7(P)` reserve for the ordinary
`V_7(B)>=0` rows.  It does not assert that still-separate `Q_7` theorem or
Erdős Problem 993.

## 1. Statement

Let `G` be a forest, let `l` be a leaf with support `p`, and write

```text
P=I(G),  B=I(G-{l,p}),  P=(1+x)B+xC.
```

Suppose `alpha(B)=11` (equivalently, this pendant step has
`alpha(P)=12`).  Put

```text
Q7(P)=14p7^2-p6p7-16p6p8,
V7(B)=9b5b6+105b5b7-72b6^2.
```

Then:

1. `V7(B)<0` is possible for precisely 15 independence-polynomial rows:
   seven connected trees of order 19 and eight connected trees of order 20.
2. Every literal forest reconstruction of all 15 rows has `Q7(P)>=0` and
   strictly positive `H7(P)-H6(B)`.  There are 246 distinct polynomial
   pairs `(B,C)`.
3. Hence, for every literal `alpha(B)=11` pendant step, `Q7(P)>=0` implies
   `H7(P)-H6(B)>=0`.  The only rows not paid termwise by `V7(B)>=0` are the
   15 classified rows, and all their actual reconstructions are paid
   directly.

This is the complete exceptional boundary needed alongside the separate
all-forest `Q7` reserve and the proved theorem `V7(F)>=0` for
`alpha(F)>=12`.

## 2. Why the finite range is all-order

Every forest is bipartite.  In each component, the larger color class is an
independent set, so summing over components gives

```text
alpha(B) >= sum_components ceil(component_order/2)
         >= ceil(|B|/2).
```

Therefore `alpha(B)=11` forces `|B|<=22`.  There is no order beyond 22 to
control.  An exhaustive census through order 22 is consequently an
all-order theorem for this boundary, not finite evidence extrapolated to
larger forests.

## 3. Exact classification through order 20

`replay_rank7_alpha11_obstructions_wave14.py` independently regenerates
every forest independence-polynomial row through order 19 and streams every
connected and disconnected order-20 forest.  Its covering product pass for
disconnected order 20 is exhaustive because some component has order at
most 10; duplicates are harmless.

The result is exactly:

| order | negative `V7` rows with `alpha=11` | classification |
|---:|---:|---|
| at most 18 | 0 | none |
| 19 | 7 | seven connected tree rows |
| 20 | 8 | eight connected tree rows |

All 15 polynomial rows have exactly one unlabeled-tree realization.

## 4. Exact completion at orders 21 and 22

### Connected forests

`replay_rank7_alpha11_connected_n21_n22.py` compiles and runs the portable
Rust/WASM verifier.  It uses the canonical
Wright--Richmond--Odlyzko--McKay free-tree successor, exact
independence-number recursion, and exact integer recursion for `i0,...,i7`.

| order | all free trees | exact `alpha=11` trees | negative `V7` | minimum `V7` |
|---:|---:|---:|---:|---:|
| 21 | 2,144,505 | 136,882 | 0 | 9,837,828 |
| 22 | 5,623,756 | 54,564 | 0 | 218,312,640 |

The total free-tree counts are the known exact counts and are asserted by
the replay.

### Disconnected forests

`replay_rank7_disconnected_n21_n22_wave14.py` gives polynomial-complete
covering products, with harmless duplicates:

- at order 21, select a component of order at most 10;
- at order 22, select a non-isolate component of order at most 11, then add
  the separately streamed `K1` times connected order-21 case, the
  isolate-plus-disconnected-remainder case, and the edgeless case.

| order | covering products | exact `alpha=11` occurrences | negative `V7` rows | minimum on `alpha>=11` |
|---:|---:|---:|---:|---:|
| 21 | 2,859,935 | 58,744 | 0 | 81,162,081 |
| 22 | 8,207,341 | 17,640 | 0 | 417,515,280 |

The displayed minima lie in the exact `alpha=11` slice because each is
strictly below the separately recorded minimum on `alpha>=12`.

Thus the 15 order-19/20 connected rows are the complete all-order list of
negative `V7` boundary rows.

## 5. Why the literal reconstruction list is complete

For the 15 exceptional rows, `B` is connected.  In a forest the support
`p` can have at most one neighbor in `B`: two neighbors in the same
connected `B` would create a cycle.  Consequently exactly the following
possibilities exist:

```text
C=B       if p has no neighbor in B,
C=I(B-v)  if p is attached to vertex v of B.
```

The exact replay covers all 293 rooted-vertex occurrences of the 15 trees,
deduplicates equal deletion polynomials, and adds the 15 unattached states.
This produces 246 distinct `(B,C)` polynomial checks.  No common untouched
factor is missing: every exceptional `B` is connected; disconnected rows
were exhaustively classified and none has negative `V7`.

## 6. Exact coupled payment

For every literal reconstruction the symbolic identity is

```text
H7(P)-H6(B)
 = 7Q7(P)/(2p6) + 21c6/2 + V7(B)/(2b5),
```

with cleared numerator

```text
7b5 Q7(P) + 21c6 p6 b5 + V7(B)p6.
```

All 246 exceptional checks have `Q7(P)>=0`; all 246 cleared numerators are
strictly positive.  The global minimum exact margin is

```text
740494109067/8823188 = 83925.913067...
```

For every other `alpha(B)=11` row, `V7(B)>=0`; therefore the same identity
is nonnegative as soon as the separate required reserve `Q7(P)>=0` is
available (and `c6>=0` automatically).  This proves the stated complete
boundary implication without claiming the still-separate all-forest `Q7`
theorem.

## 7. Replays

Run:

```powershell
python .\replay_rank7_alpha11_obstructions_wave14.py
python .\replay_rank7_disconnected_n21_n22_wave14.py
python .\replay_rank7_alpha11_connected_n21_n22.py
python .\prove_rank7_alpha11_boundary.py
```

The two new terminal status lines are:

```text
PASS_EXACT_CONNECTED_ALPHA11_V7_ORDERS21_22
PASS_EXACT_ALL_ORDER_RANK7_ALPHA11_BOUNDARY_THEOREM
```

The assembler writes
`rank7_alpha11_boundary_theorem_exact_20260813.json`, which contains the
full 15-row polynomial list, both order-21/22 summaries, the reconstruction
counts, minimum margin, and input hashes.
