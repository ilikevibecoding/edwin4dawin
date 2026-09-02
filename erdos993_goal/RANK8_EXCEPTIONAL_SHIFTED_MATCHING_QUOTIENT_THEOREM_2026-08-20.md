# Rank-eight exceptional shifted-core matching-quotient theorem

Date: 2026-08-20

Status: **exact ten-cell literal-family theorem, plus an exact two-cell
dependency on the rank-seven `Q7` theorem.  No broad WROM scan and no master
edit were used.**

## Theorem

Let `A` be a tree rooted at `q`, put `H=A-q`, and define

```text
I(G_t;x)=(1+x)^t I(A;x)+xI(H;x).
```

For each of the ten core cells

```text
(21,11), (22,11),
(21,12), (22,12), (23,12), (24,12),
(23,13), (24,13), (25,13), (26,13),
```

where a pair is `(|A|,alpha(A))`, every rooted core obeys

```text
Q8(G_t)>0  for every integer t>=14-alpha(A).
```

Equivalently, all sixteen shifted Newton coefficients `C0,...,C15` of the
literal `Q8(G_t)` polynomial about

```text
t0=14-alpha(A)
```

are strictly positive.

The remaining two exceptional cells `(21,13)` and `(22,13)` are already
closed by the existing terminal identity conditional on the rank-seven
target theorem `Q7(F)>=0` for `alpha(F)>=12`.  Thus, once that named
rank-seven dependency is discharged, all twelve exceptional core cells at
orders 21 through 26 are closed.

## Why the alpha-14 boundary alone is insufficient

The existing alpha-14 matching-quotient certificate proves exactly the
threshold term

```text
C0=Q8(G_t0)>=0.
```

It does not store the same-family full/reduced jets needed to determine
later forward differences.  If

```text
p'_j=p_j+d_j,  d_j=p_(j-1)-h_(j-2),
```

then exact expansion gives

```text
C1 = 16(2p8d8+d8^2)
     -(p7d8+p8d7+d7d8)
     -18(p7d9+p9d7+d7d9).
```

The relaxed algebraic tuple

```text
(p7,p8,p9,d7,d8,d9)=(1,1,0,1,0,1)
```

has `Q8=15` but `C1=-37`.  This is not a graph or forest counterexample.
It is an exact failure of the proposed implication, so the failed shortcut
is retained only as an enclosure failure and not as evidence against `Q8`.

## Smallest remaining finite classification

For a tree, `alpha(A)=|A|-nu(A)` and `alpha(A)>=ceil(|A|/2)`.  Therefore the
condition `21<=|A|<=26` and `alpha(A)<=13` gives exactly twelve cells:

```text
n=21: alpha=11,12,13
n=22: alpha=11,12,13
n=23: alpha=12,13
n=24: alpha=12,13
n=25: alpha=13
n=26: alpha=13.
```

Relative to the existing exact packages and the rank-seven target, the two
cells `(21,13),(22,13)` need no new literal-family enumeration:

1. `Q8(A)>=0` follows from the exact alpha-13 matching boundary.
2. `alpha(A-q)>=12`, so `Q7(A-q)>=0` is exactly the named rank-seven input.
3. The exact all-root order-21/22 census pays residual `Delta0` through
   `Delta4`.
4. The all-order packages pay residual `Delta5` through `Delta15`.

Consequently the smallest new classification has the ten cells in the
theorem, not all twelve and not the full WROM orders 21 through 26.

## Exact quotient cover

Fix a maximum matching `M` of a core `A`.  Contract its edges.  The result is
a quotient tree on `alpha(A)` vertices.  Exactly `2alpha(A)-|A|` quotient
vertices are unmatched singleton blocks, and they form an independent set;
the other `|A|-alpha(A)` blocks are doubled matching edges.

The verifier reverses this construction exhaustively:

1. enumerate all unlabelled quotient trees on 11, 12, or 13 vertices;
2. choose every independent singleton set of the required size;
3. enumerate every external endpoint attachment modulo flipping a doubled
   block;
4. reject exactly the assignments admitting an augmenting path between two
   unmatched singleton blocks;
5. recompute connectivity, edge count, and `alpha` for every accepted
   expansion; and
6. test every possible root.

The quotient-tree counts are respectively `235`, `551`, and `1301`.  This
covers every relevant core.  Automorphically equivalent expansions may occur
more than once, so the following are coverage counts with multiplicity, not
claims about distinct unlabelled cores:

```text
endpoint assignments examined                 361,742,723
matching-valid expanded cores                 230,924,297
rooted checks                               5,392,604,197
```

The large `(23,13)` and `(24,13)` cells were divided by quotient-tree index
into four disjoint shards.  Independent reassembly verifies that each set of
indices totals all `1301` quotient trees and that additive counts and
coordinatewise minima reproduce the canonical cell certificate.

## Complete shifted polynomial check

For each accepted rooted core the verifier computes the exact independence
polynomials of `A` and every `A-q`.  It evaluates literal `Q8(G_t)` at the 17
consecutive values `t0,...,t0+16` and takes complete forward differences.

Although the quadratic expression appears to have degree 16, its leading
coefficient cancels exactly:

```text
16/(8!)^2 = 18/(7!9!).
```

Thus `deg_t Q8(G_t)<=15`; the verified zero sixteenth difference makes
`C0,...,C15` a complete reconstruction.  Across all ten cells every negative
count is zero, and the coordinatewise global minima are

```text
[2441788992, 5403864203, 10558277852, 16937770356,
 21360051651, 21057546787, 16449656126, 10071666558,
 4851340810, 1833087879, 555852696, 131500413,
 23186295, 2824107, 206349, 6435].
```

All sixteen entries are strictly positive.  A fresh replay of the smallest
cell `(22,11)` with the final executable is byte-identical to its canonical
certificate.

## Scope and remaining dependencies

This theorem removes the exceptional shifted-core band from the rank-eight
connected proof, except for the explicit two-cell dependency on rank-seven
`Q7`.  It does not itself prove the large-core analytic `Delta0` through
`Delta4` bounds, connected `Q8`, the forest convolution lift, or rank-eight
PGC.  Those downstream obligations must not be inferred from this finite
classification.

## Replay and hashes

Run the independent audit with

```powershell
python .\audit_rank8_exceptional_shifted_matching_quotient.py
```

Expected marker:

```text
PASS_INDEPENDENT_AUDIT_RANK8_EXCEPTIONAL_SHIFTED_MATCHING_QUOTIENT
```

Exact SHA-256 values:

```text
verify_rank8_exceptional_shifted_matching_quotient.rs
B0DF30B4310EA23E013DC9391EF1F0F6326E5BEDFC6846E3B5BFFEA6D99A3174

verify_rank8_exceptional_shifted_matching_quotient.exe
E25947C5E9EDD23AE0D8F85A66D05A0199AC4775EE6769911D6A8D377FFBA0D4

run_rank8_exceptional_shifted_matching_quotient.py
F9F2A623EA1734CEDABB2005DB0AF3AEDC63BC3C885EC39DCA65DD8A5BEAA77F

rank8_exceptional_shifted_matching_quotient_exact_20260820.json
275FC6496850418042244524987238FCE05FA381440ECF40BAC90CB2EB66E724

audit_rank8_exceptional_shifted_matching_quotient.py
D3EBAA5EC5749E52BE32587D47B3A2BD6BB2BCC0750B8ED33E2552F711FC0BD5

rank8_exceptional_shifted_matching_quotient_independent_audit_exact_20260820.json
DE7D906401C3547C42900899CBB52B4E85A345340278BE72F226D7760F4C2DAC

audit_rank8_alpha14_matching_shift_implication.py
0AFFE54DB59B442E973F571AB4782C193CC97D346205E196066FEE9B118DDD7C

rank8_alpha14_matching_shift_implication_audit_exact_20260820.json
B82EF77469BAB7E6BF5842C4C16DEC469285C8B50485A6C8B1BEB701BDE199A7

assemble_rank8_exceptional_shifted_shards.py
C00CB7EBA1EF421BD3DBBF72A4F40B1E33A389B8279C5CBD1EF9479F186E42E0

rank8_exceptional_shifted_matching_q_n22_a11_exact_20260820.log
4FE73E59409FDD484D363F8A872FFBE73DAA9713F9D27BAE3AE92F235FD790B0
```
