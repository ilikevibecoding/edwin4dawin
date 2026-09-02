# Rank-eight terminal `Delta^5`: two-sided capacity frontier

Date: 2026-08-17

Status: **EXACT REDUCTION AND FINITE THEOREM THROUGH ORDER 20; ALL-ORDER NOT
YET PROVED.**  No rooted-tree counterexample was found.  Several exact
negative jets were preserved because they disprove tempting relaxed cones.

## Proved finite theorem

For every rooted tree core `A` of order `1<=n<=20`,

```text
Delta^5 R_1 >= 0.
```

The exact WROM census covers

```text
free trees:       1,346,024
rooted cores:    26,056,124
active roots:    26,053,352
negative values:          0
```

Every active value is strictly positive.  The global active minimum is
`5,799,448` at order eight.

## First root-capacity reduction

The coefficient is concave in `h7`.  The one-sided capacity

```text
7h7 <= (n-7)h6
```

reduces to two capacity endpoints, after which `c8` decreases to its extension
ceiling and `c7` is concave.  The rank-six defect interval leaves `k in {1,7}`.
The full root-retention coordinate `S=h6/c6` and full interior `D5` interval
were retained.

Both `k=7` branches pass on this larger one-sided cone.  Each has an unsplit
six-dimensional Bernstein tensor of degrees `(48,22,10,8,5,2)` and 2,008,314
nonnegative coefficients.

The `k=1` branches do not.  They have exact negative values, first at integer
orders 30 and 46 in the tested endpoint families.  These are not tree
counterexamples: the one-sided cone omitted the complementary capacity

```text
6(c7-h7) <= (n-7)(c6-h6).
```

For example, `h6=c6,h7=0,c7>0` is impossible because `h6=c6` forces
`c7=h7`.

## Exact two-sided capacity polygon

Put

```text
q=6c7/((n-7)c6),    S=h6/c6,    H=h7/c6.
```

Both complementary capacities imply `0<=q<=1`.  At a rank-six defect
endpoint,

```text
c6/c5=(7(n-7)q+3k)/36,       k in {1,7}.
```

Concavity in `h7` sends each fixed `S` to a lower or upper polygon boundary.
The boundary is covered exactly by seven families.

For `0<=q<=6/7`:

```text
lower zero:       0<=S<=1-q,          H=0,
lower cross:      1-q<=S<=1,          H=(n-7)(S+q-1)/6,
upper capacity:   0<=S<=7q/6,         H=(n-7)S/7,
upper c7:         7q/6<=S<=1,         H=(n-7)q/6.
```

For `6/7<=q<=1`:

```text
lower zero:       0<=S<=1-q,          H=0,
lower cross:      1-q<=S<=7(1-q),     H=(n-7)(S+q-1)/6,
upper capacity:   0<=S<=7(1-q),       H=(n-7)S/7.
```

The exact replay verifies all meeting points and the full coverage argument.

## Second necessary no-go

Treating `q` as independent of `D5` is also too weak.  At order 44, on the
lower-zero piece with `q=6/7`, `k=1`, upper sharp tree ratios and midpoint
`D4`, the enlarged cone gives an exact negative value

```text
-182906438864805695089369530613219744301872461903
 /646400379817590015228043961335808000.
```

But this jet implies

```text
D5=-190052/3653073,
```

whereas the proved `D5` interval is positive.  It is therefore another exact
counterexample to a relaxation, not a feasible tree or coefficient-cone
counterexample.

## Remaining analytic problem

An all-order theorem now requires enforcing the `q` boundary regime and the
`D5` defect interval simultaneously.  Dropping either constraint produces an
exact negative jet.  Subdivision alone cannot repair either enlarged cone.

Thus the exact residual range is:

```text
proved:       every rooted tree core with n<=20,
open:         n>=21,
counterexample: none known.
```

## Replay

Run

```powershell
python .\replay_rank8_q8_terminal_delta5_frontier.py
```

Expected marker:

```text
RANK8_Q8_TERMINAL_DELTA5_FRONTIER_REPLAY_PASS
```

The manifest is `rank8_q8_terminal_delta5_frontier_manifest_20260817.json`.
This package does not assert an all-order `Delta^5` theorem or the `Q8`
theorem.
