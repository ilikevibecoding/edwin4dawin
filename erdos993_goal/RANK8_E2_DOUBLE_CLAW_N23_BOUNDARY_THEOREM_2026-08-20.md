# Rank eight: `e=2` double-claw boundary at order 23

Date: 2026-08-20

Status: **exact PASS for all four pending residual ranks on every rooted
order-23 tree with degree surplus `e=2`, independently audited.  This is an
order-23 boundary theorem, not an all-order `e=2` theorem.**

For

```text
e(A)=sum_v binom(deg_A(v)-1,2),
```

the equality `e(A)=2` forces exactly two degree-three vertices and no higher
degree.  The tree handshake identity gives four leaves.  Suppressing all
degree-two vertices therefore gives the unique double-claw skeleton: two
degree-three branch vertices joined by a bridge, with two pendant arms at
each branch.

At order 23, the four pendant lengths and bridge length are positive and sum
to 22.  Sort each pendant pair and order the two side pairs
lexicographically; the bridge remains distinguished.  This canonicalization
has exactly 920 length tuples.  An independent enumeration normalized every
positive five-part composition of 22 under both leaf-pair swaps and the side
swap and obtained the identical 920-element set.

The exact scan covers all 23 roots of each canonical core:

```text
canonical cores                  920
rooted cases                  21,160
distinct coefficient profiles 11,395
```

All `21,160` values are strictly positive in each rank.  Exact minima are

```text
Delta0   6570404611911847800
Delta1  21884430029308489796
Delta2  41490192594553419725
Delta3  63006870505707355076.
```

The independent audit uses a separately numbered double-claw construction,
a generic tree independence-polynomial DP, and explicit transcriptions of
all four Delta expressions.  It reconstructs the canonical count, root and
profile totals, sign counts, and all four minima.

```text
scan_rank8_delta013_e2_double_claws_n23.py
3FD0FCB77E1A3B09E30AA3E00DBA904D446B83E6502944EB4DA5B0404FCFEF5C

rank8_delta013_e2_double_claws_n23_exact_20260820.json
A2CA7228A172D5C8E1A1747014691F38A49BC0DE07C59D82400A80ED245A7AC9

audit_rank8_delta013_e2_double_claws_n23_independent.py
B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8

rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json
BF988098870847459BD61B3B58C0ED8010C092130A0DFAC45735000B2FA4C027
```

No all-order `e=2`, connected-`Q8`, forest-lift, rank-eight PGC, or Problem
993 claim is made.  No master file was edited.
