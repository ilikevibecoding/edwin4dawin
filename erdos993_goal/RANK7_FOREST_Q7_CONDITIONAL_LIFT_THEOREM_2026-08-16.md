# Rank-seven Q7 conditional lift from trees to forests

Date: 2026-08-16

Status: **PROVED CONDITIONAL LIFT.** This is not yet an all-order proof of
`Q7` and it does not resolve Erdős Problem 993. It removes the
small-component/first-crossing obligation from the rank-seven reserve.
The only unproved inputs still needed for the all-forest `Q7` theorem are
listed in Section 6.

## 1. Conditional theorem

For a forest `F`, write `i_j=i_j(F)` and

```text
Q7(F)=14 i_7^2-i_6 i_7-16 i_6 i_8.
```

Using the already-proved forest gap inequalities through rank six, assume:

1. `Q7(T)>=0` for every connected tree `T` with `alpha(T)>=12`;
2. the full rank-seven high/high, low/high, and low/low factorial-ratio
   convolution cones are nonnegative.

Then

```text
Q7(F)>=0 for every forest F with alpha(F)>=12.        (1)
```

Thus a connected-tree proof plus the three convolution cones really does
lift to arbitrary forests; no further all-order small-component argument is
needed.

## 2. Full and exceptional tree factors

Put `q_j=2^j j! i_j` and `rho_j=q_(j+1)/q_j`. For a factor with
`alpha>=7`, the rank-seven reserve is equivalent to

```text
rho_6-rho_7 >= 1.
```

Together with the proved lower-rank forest gaps, such a factor lies in
exactly one of the exhaustive high/low cones whenever `Q7>=0`. Call it
**full**. A tree factor is **exceptional** precisely when

```text
alpha<=6, or Q7<0.                                   (2)
```

Every tree is bipartite, hence `alpha(T)>=ceil(|T|/2)`. Therefore a tree
with `alpha<=11` has order at most 22, making the exceptional classification
finite.

The WROM free-tree generator streamed every one of the 9,114,285 free trees
of orders 1 through 22. It retained only `(alpha,i_0,...,i_8)` jets satisfying
(2), so memory grows with the certificate rather than with the tree census.
Among 650,217 tree occurrences with `alpha<=11`, there were 341 exceptional
occurrences and only 307 distinct exceptional jets:

```text
alpha       1   2   3   4   5    6   7   8
jet count   2   2   5  15  48  175  56   4
```

The first 247 are the low-support cases `alpha<=6`; the remaining 60 have
negative `Q7` (56 at alpha 7 and 4 at alpha 8). There is no exceptional
tree beyond order 14 and none at alpha 9, 10, or 11.

Only the jet through rank eight is stored. This is exact for the lift:
`Q7` of a product depends only on the factors' coefficients through rank
eight, and independence numbers are stored separately and add under
products.

## 3. Exceptional/full preservation

For each of the 307 exceptional jets, the replay forms its exact factorial
convolution with an abstract full factor in each cone. The fixed factor is
homogenized as

```text
q_j(T) h^j = 2^j j! i_j(T) h^j.
```

It then expands

```text
q_7(TA)^2-q_6(TA)q_8(TA)-h q_6(TA)q_7(TA)
```

as an integer polynomial in the cone variables. Every coefficient is
nonnegative:

```text
full cone   cases   aggregate terms   negative   minimum coefficient
high          307        46,347,483          0                     1
low           307        65,369,203          0                     1
```

Consequently adjoining any exceptional tree component to any full forest
factor preserves `Q7>=0`. Adjoining a full component is covered by the
assumed full/full convolution theorem.

## 4. Exact first-crossing certificate

It remains to start a full factor when every component is exceptional. The
replay processes the 307 component types in a fixed sorted order and keeps
all distinct product jets of total alpha at most 11. It uses a disk-backed
SQLite exact set with a 128 MiB cache; coefficients are unbounded decimal
integers and multiplication is truncated exactly after rank eight.

For each component type, ascending-alpha dynamic programming first takes
the unbounded closure under repetitions of that type. It then multiplies
every reachable partial state of alpha at most 11 by one more copy and
checks every product whose alpha is at least 12. This covers every multiset:
take its largest component type and delete one copy of that type.

The exact partial-state counts are

```text
alpha        0  1  2   3   4    5    6    7     8     9     10     11
states       1  2  5  13  38  117  397  831  1954  4720  11798  29313
```

The replay checked 9,535,795 covering products, representing 6,946,690
distinct crossing jets. There were no negative values. The exact minimum was

```text
Q7=634676
```

at total alpha 12, with product jet

```text
(1,14,81,264,566,862,966,806,497).
```

The theoretical first-crossing envelope is alpha 12 through 22 because a
general small component could have alpha 11. The classification strengthens
this: every exceptional component has alpha at most 8, so actual crossings
occur only from 12 through 19. Hence the absence of rows at 20, 21, and 22
is proved, not omitted.

## 5. Assembly proof

Let `F` be a forest with `alpha(F)>=12`.

* A component with alpha at least 12 is full by conditional input 1.
* A component with alpha at most 11 is either full or one of the 307 exact
  exceptional jets by Section 2.
* If `F` has a full component, start with it. Adjoin every full component by
  conditional input 2 and every exceptional component by Section 3.
* Otherwise every component is exceptional. Sort them by the fixed jet order
  and take the shortest prefix whose total alpha is at least 12. The preceding
  prefix has alpha at most 11, so Section 4 proves that the crossing prefix is
  full. Adjoin all remaining exceptional components by Section 3.

In every case the full product has nonnegative `Q7`, proving (1).

## 6. Genuinely missing inputs

This lift is complete. The all-forest rank-seven reserve still needs exactly:

1. an all-order proof of `Q7(T)>=0` for connected trees with `alpha(T)>=12`;
2. the full low/high off-hard-face cone proof;
3. the full low/low off-hard-face cone proof.

The high/high cone is already proved. Both low hard faces are already paid by
exact AM-GM certificates; only their off-face coefficient claims remain.

## 7. Exact replay

Run, in order:

```powershell
python .\replay_rank7_exceptional_small_tree_jets.py
python .\verify_rank7_forest_lift.py --case fixed-high
python .\verify_rank7_forest_lift.py --case fixed-low
python .\verify_rank7_forest_lift.py --case crossing --rebuild
python .\verify_rank7_forest_lift.py --case assemble
```

The classification report is
`rank7_exceptional_small_tree_jets_exact_20260816.json`. The final lift report
is `rank7_forest_lift_conditional_exact_20260816.json` and has status

```text
PASS_EXACT_CONDITIONAL_ALL_FOREST_RANK7_Q7_LIFT.
```

Current SHA-256 values:

```text
rank7_exceptional_small_tree_jets_exact_20260816.json
26D221A833298109CAE33485D4FCB3011351ACB826710DFCC38ADB95A54CE17C

rank7_exceptional_small_tree_jets_exact_20260816.tsv
C1D4DD380B74FDFB066A9986D7469D7EBF56BAFC540DF5A069CB6522C83641D0

rank7_forest_lift_conditional_exact_20260816.json
5DD81CC8BF4A334ED9D6D7B88DBE271DB0A0F9FEA4FEB9F9126DCC06875E563E

rank7_first_crossing_states_exact_20260816.sqlite3
ADB313396FF2EB7953D43586605BDC1BF96C9A7E3D2103F85205F17ED3F84A8E
```
