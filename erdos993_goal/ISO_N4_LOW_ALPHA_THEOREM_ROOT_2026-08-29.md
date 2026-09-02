# Direct rank-four four-minor theorem through `alpha(W)=5`

Date: 2026-08-29

Status: **complete finite-layer theorem.**  This is an exact direct theorem
for `N_4`; it is not merely an FML-gap census.  It does not prove the
unbounded `alpha(W)>=6` range.

## Theorem

Let `(B;u,v)` be a marked forest and put

```text
W=B-{u,v}.
```

If

```text
2 <= alpha(W) <= 5,
```

then

```text
N_4(B;u,v) >= 0.
```

The exact minima are all strict:

| `alpha(W)` | marked pairs | minimum `N_4` |
|---:|---:|---:|
| 2 | 129 | 4 |
| 3 | 722 | 45 |
| 4 | 3,888 | 225 |
| 5 | 21,158 | 701 |

## Why the classification is complete

Every forest is bipartite, so

```text
|W| <= 2 alpha(W).
```

Consequently `alpha(W)<=5` gives `|B|=|W|+2<=12`.  The verifier generates
every unlabeled forest through order twelve as a multiset of nonisomorphic
tree components, checks every unordered marked pair, and retains exactly the
four target alpha layers.  There are

```text
2,947 forest types,
25,897 marked-pair cells.
```

Every minor polynomial is computed by an exact memoized independent-set leaf
recurrence.  In every cell the closed formula from
`four_minor_vector(B,u,v)[4]` is independently cross-checked against the
bivariate operator normalization

```text
nested2(rows,4,4) = 2 N_4(B;u,v).
```

## Replay

```text
python prove_iso_n4_low_alpha_root.py
```

Success marker:

```text
PASS_EXACT_ALL_FOREST_ISO_N4_ALPHA_W_2_TO_5
```

Integrity:

```text
prove_iso_n4_low_alpha_root.py
56DADFF96A94A2ED04B2064BC59F6FE10EFD7901837060C97EB97D44BCDF2BF5

iso_n4_low_alpha_exact_root_20260829.json
2ABC4173AC1B27790935B81EDFDA48232E7779457E699F2B9D854771F70D7C96
```

## Exact remaining obstruction

The induction-closed auxiliary domain also contains every
`alpha(W)>=6`.  Those layers have no order bound, so the theorem above is
only the finite base of a possible all-order induction.  A direct complete
Bencs switching-orbit or exact-union split cannot supply that induction:
negative local charges already occur on five- and six-vertex supports.  The
unbounded step must therefore transport reserve between supports (or use a
global marked-forest invariant/coupled truncation).

This note does not assert rank-four FML for `alpha(W)>=3`, all-order `N_4`,
forest ISO, or Erdos Problem 993.
