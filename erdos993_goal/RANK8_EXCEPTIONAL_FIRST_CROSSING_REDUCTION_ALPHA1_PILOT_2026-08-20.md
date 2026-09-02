# Rank-eight exceptional first-crossing reduction and alpha-one pilot

Date: 2026-08-20

Status: **exact finite reduction and exact PASS for the single smallest
nontrivial alpha split `source=13`, `terminal=1`, `total=14`.  This is not
the complete exceptional-only first-crossing theorem.**

## Exact state and recurrence

Let the 1,215 exceptional component types be the unique rows of
`rank8_exceptional_tree_jets_exact_20260820.tsv`, in its fixed lexicographic
order.  A partial product below the threshold is keyed by

```text
(alpha, i1, i2, ..., i9),
```

with `i0=1` implicit.  The alpha coordinate is essential because truncation
through rank nine need not retain the degree of a larger product.  Decimal
text columns may be used in SQLite to avoid signed-64-bit overflow; this does
not change the exact key.

For product jets `A=(a0,...,a9)` and `B=(b0,...,b9)`, use the exact truncated
ordinary convolution

```text
c_k = sum_(j=0)^k a_j b_(k-j),  0<=k<=9.
```

No coefficient above rank nine can enter the literal functional

```text
Q8(C) = 16*c8^2 - c7*c8 - 18*c7*c9.
```

Let `S[r,a]` be the set of distinct truncated jets of exceptional multisets
of total alpha `a` using only component types through `r`.  Then

```text
S[r,a] = S[r-1,a]
         union { truncate9(P*J_r) : P in S[r,a-alpha(J_r)] }.
```

The same-`r` term and ascending-alpha evaluation permit arbitrarily many
copies of `J_r`.  Every multiset has a unique largest sorted component type,
so the recurrence removes component-order permutations without omitting a
multiset.  After closing type `r`, first crossings assigned to `r` are

```text
truncate9(P*J_r),
P in S[r,s], 0<=s<=13, s+alpha(J_r)>=14.
```

Deleting one copy of the unique largest type proves the reverse coverage
direction.

## Exact finite envelope

The component classification has alpha range `1..9`.  Immediately before a
first crossing the partial alpha range is `0..13`.  Therefore the complete
finite split set is

```text
terminal alpha a in 1..9,
source alpha s in (14-a)..13,
crossing alpha s+a in 14..(13+a).
```

The union has the exact required crossing envelope `14..22`.  In particular,
overshoot 22 occurs only in the `a=9, s=13` split and must be retained in a
complete replay.

## Single bounded pilot

Only the smallest nonempty split was run:

```text
source alpha       13
terminal alpha      1
crossing alpha     14
component types     2   (1+x and 1+2x)
partial states    105
covering checks    15
distinct crossings 15
negative Q8         0
zero Q8             0
minimum Q8  10,306,296
maximum Q8 1,013,150,121,984
elapsed       0.005848 seconds
peak private 13,914,112 bytes = 13.26953125 MiB
workers             1
```

The 15 products are exactly

```text
(1+x)^(14-m) (1+2x)^m,  0<=m<=14.
```

Their `Q8` values, in increasing `m`, are

```text
10,306,296
27,238,068
70,384,248
177,809,742
439,056,936
1,059,369,516
2,496,919,448
5,747,436,058
12,917,252,352
28,343,540,736
60,722,141,184
127,038,523,392
259,639,345,152
518,636,371,968
1,013,150,121,984
```

An independent audit recomputed each coefficient from the closed binomial
formula for `(1+x)^(14-m)(1+2x)^m` and matched every reported jet and sign.

## Scope and next dependency

This pilot certifies the complete terminal-alpha-one first-crossing band, but
does not certify any terminal-alpha band `2..9`.  It does not run or imply a
full/full cone, does not touch connected `Delta0..3`, and does not complete
forest `Q8` or PGC.  The next smallest bounded subdivision is terminal alpha
two, whose exact source splits are `12+2=14` and `13+2=15`; it should be
measured before advancing farther.

## Exact hashes

```text
verify_rank7_forest_lift.py
90FF77DEA1992259A0F9B3D68F112949A0229918644E6BEA1D693F1D889809B5

rank8_exceptional_tree_jets_exact_20260820.tsv
B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A

rank8_exceptional_tree_jets_exact_20260820.json
BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4

probe_rank8_exceptional_first_crossing_alpha1_exact.py
C83C2B698F0D39DC9FE7C360131B770FD121EC7D9445CA10AEB353881CF231D9

rank8_exceptional_first_crossing_alpha1_pilot_exact_20260820.json
193BE4F3BC1418BAEE4F070D0AC1F215E2EAE035A9A07AFE71539AD1D1011F04

audit_rank8_exceptional_first_crossing_alpha1_pilot.py
8B38D3DDDBC7AAF1101AE655A9D48CBCD056ACCCFBCA3FA65A17951EA6CE3B2F

rank8_exceptional_first_crossing_alpha1_pilot_audit_exact_20260820.json
14DE98471DD87DB704E5F97776F00016FE692494CF039B9F8887B626FDEE9D2E
```
