# Rank-eight finite pendant-PGC census through order 18

Date: 2026-08-17

Status: **EXACT POLYNOMIAL-COMPLETE FINITE AUDIT; NOT AN ALL-ORDER RANK-EIGHT
THEOREM AND NOT A PROOF OF ERDOS PROBLEM 993.**

## Exact target

For a forest `G` with pendant edge `lp`, write

```text
P=I(G),  B=I(G-{l,p}),  P=(1+x)B+xC.
```

At rank eight the exact component-separated identity is

```text
H8(P)-H7(B)=4Q8(P)/p7+12c7+V8(B)/(2b6),
Q8(P)=16p8^2-p7p8-18p7p9,
V8(B)=10b6b7+136b6b8-98b7^2.
```

After clearing the positive denominator `2p7b6`, the literal target is

```text
8b6 Q8(P)+24c7 p7 b6+V8(B)p7>=0.                 (1)
```

Rank eight enters the Problem-993 prefix at `alpha(P)=13`.  The two values
`alpha(P)=13,14` are especially important because the standalone all-forest
`V8(B)` theorem applies directly only from `alpha(P)>=15`.  The census below
therefore checks (1) itself and does not infer those boundary rows from the
separated pieces.

## Polynomial-complete finite coverage

Every pendant edge in a forest belongs to one tree component.  Consequently
its polynomial pair is a distinct tree-component pendant pair multiplied by
the independence polynomial of the remaining forest.  The generator
enumerates exactly those pairs, deduplicating only equal polynomial data.

Through total order 18 it reconstructs the standard counts

```text
123,867 unlabeled trees at order 18,
98,008 distinct tree polynomials at order 18,
594,685 distinct tree pendant pairs at order 18,
224,562 distinct forest polynomials at order 18.
```

It checks 2,276,138 pendant/common-factor products in total.  Exactly 215,323
have `alpha(P)>=13`, split as

```text
alpha(P)=13: 175,255
alpha(P)=14:  35,230
alpha(P)=15:   4,460
alpha(P)=16:     361
alpha(P)=17:      17.
```

There are zero negative `Q8(P)` rows, zero negative `V8(B)` rows, and zero
negative coupled margins among these required instances.  The exact global
minimum of `H8(P)-H7(B)` is

```text
15,765,688/1,725 > 0,
```

attained in the `alpha(P)=13`, order-16 boundary.

The separate forest-functional census also reproduces the prior minima

```text
min Q8 = 8,726,265  on alpha>=14 through order 18,
min V8 = 175,207,032 on alpha>=14 through order 18.
```

## Replay and limitation

The complete enumeration was run twice from scratch.  The primary and fresh
replay JSON files are byte-identical, and the verifier asserts every count,
boundary split, zero-failure statement, and exact minimum.

Files:

```text
replay_rank8_pgc_census_wave23.py
verify_rank8_pgc_census_wave23.py
rank8_pgc_census_wave23_exact_20260817.json
rank8_pgc_census_wave23_fresh_replay_20260817.json
```

This does **not** close the finite boundary in full: bipartiteness allows
orders through 26 when `alpha(P)=13` and through 28 when `alpha(P)=14`.
Nor does it prove the connected-tree `Q8` theorem or the rank-eight forest
convolution lift.  It is a rigorous finite checkpoint and a direct audit of
the coupled boundary formula, not a substitute for those remaining theorems.
