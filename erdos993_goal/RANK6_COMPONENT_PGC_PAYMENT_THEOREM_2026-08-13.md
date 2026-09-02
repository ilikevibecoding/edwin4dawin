# Rank-six component PGC payment theorem

Date: 2026-08-13

Status: **PROVED ALL-ORDER THEOREM.**  This closes rank six of the prefix
pendant cascade for every forest.  It does not prove the full Alavi--Malde--
Schwenk--Erdős conjecture; rank seven is the next open cascade rank.

## 1. Statement

Let `G` be a forest with pendant edge `lp`, put

```text
P=I(G;x),              B=I(G-{l,p};x),
```

and define

```text
H_k(R)=k^2(r_k^2-r_(k-1)r_(k+1))/r_(k-1)
       +k(r_k-r_(k+1)).
```

If `alpha(G)>=10`, then

```text
H_6(P)>=H_5(B).                                      (1)
```

This is exactly rank-six PGC throughout its required prefix range.

## 2. Exact decomposition

The component-separated pendant identity is

```text
P=(1+x)B+xC,
```

where `C=I(G-N[p];x)` is a forest independence polynomial.  Thus

```text
p_5=b_4+b_5+c_4,
p_6=b_5+b_6+c_5,
p_7=b_6+b_7+c_6.
```

Put

```text
Q_6(P)=12p_6^2-p_5p_6-14p_5p_7,
V_6(B)=4b_4b_5+39b_4b_6-25b_5^2.
```

Direct algebra gives

```text
H_6(P)-H_5(B)
 =3Q_6(P)/p_5+9c_5+V_6(B)/b_4.                      (2)
```

Equivalently, its cleared numerator is

```text
3b_4 Q_6(P)+9c_5p_5b_4+V_6(B)p_5.                  (3)
```

## 3. Reduction to the finite exceptional boundary

A maximum independent set can always be chosen to contain the pendant leaf
`l`: if it contains `p`, replace `p` by `l`.  Its remaining vertices lie in
`B`, while adjoining `l` to a maximum independent set of `B` is always
possible.  Therefore

```text
alpha(B)=alpha(G)-1>=9.                              (4)
```

The all-forest rank-six three-halves theorem gives `Q_6(P)>=0` whenever
`|G|>=13`.  The only required smaller orders, `10<=|G|<=12`, are an
exhaustive 94-row forest-polynomial boundary; the exact minimum is

```text
Q_6(P)=43624.
```

The all-forest `V_6` theorem gives `V_6(B)>=0` whenever `alpha(B)>=10`.
Hence all terms of (2) are nonnegative except possibly when
`alpha(B)=9` and `V_6(B)<0`.

Because every forest is bipartite,

```text
|B|<=2 alpha(B)=18.                                  (5)
```

The exact replay reconstructs every distinct forest independence polynomial
through order 18.  There are exactly twelve rows with `alpha(B)=9` and
`V_6(B)<0`: eleven of order 16 and one of order 17.

These rows are automatically connected.  Indeed, for a forest of order `n`,

```text
number of components = n-binomial(n,2)+b_2.          (6)
```

Substitution in every exceptional row gives one.  Thus every realizing
forest `B` is a tree.

Now restore the support vertex `p`.  Since `G` is a forest and `B` is
connected, `p` has at most one neighbor in `B`; two neighbors would create a
cycle.  Consequently every actual deletion polynomial is exactly one of

```text
C=B                         (p has no neighbor in B),
C=I(B-v;x)                  (p is joined to v in B).  (7)
```

This is the crucial structural classification; no arbitrary coefficient box
is being used.

## 4. Complete exceptional calculation

The replay enumerates all unlabeled trees through order 18 and all vertices
of every tree realizing an exceptional row.  The twelve polynomial rows are
realized by exactly twelve unlabeled trees.  Their 193 rooted-vertex
occurrences, together with the unattached cases in (7), collapse to 157
distinct `(B,C)` coefficient pairs.

Every pair has nonnegative `Q_6(P)` and a strictly positive value in (3).
The exact global minimum of (2) is

```text
2306335815/123623 = 18656.2032550577...               (8)
```

It occurs at

```text
B=(1,16,105,365,724,822,509,156,21,1),
C=(1,15,91,287,503,485,240,54,5),
P=(1,18,136,561,1376,2049,1816,905,231,27,1),
Q_6(P)=9892458,
V_6(B)=-139464,
cleared numerator=27676029780.
```

The calculation is a finite part of the proof, not bounded evidence: (5)
proves that no other order can occur, the forest-polynomial census proves
that no other negative row can occur, (6) proves every negative row is a
tree, and (7) classifies every possible pendant reconstruction.

Combining this exhaustive boundary with the two all-order input theorems
proves (1).

## 5. Exact replay

Run

```powershell
python .\replay_rank6_component_pgc_boundary.py
```

The replay regenerates all source rows; the JSON is output, not trusted
input.  It prints

```text
PASS_EXACT_ALL_FOREST_RANK6_PGC_BOUNDARY
negative_rows=12 matching_trees=12 root_occurrences=193
distinct_B_C_checks=157
minimum_margin=2306335815/123623
```

The machine-readable report is

```text
rank6_component_pgc_boundary_exact_20260813.json.
```

The all-order inputs are replayed separately by

```text
verify_rank6_three_halves_convolution_cones.py
verify_rank6_three_halves_forest_certificate.py
prove_forest_v6_alpha10.py
```

## 6. Consequence and remaining cut

Ranks two through six of PGC are now proved all-order.  Repeated pendant
deletion would prove the desired prefix at every rank once the analogous
theorem is established for each `k>=7`.  Thus this theorem advances the
proof program but makes no claim that every forest independence polynomial
is already proved unimodal.
