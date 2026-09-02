# Universal simplicial-complex decomposition of `N_4`

Date: 2026-08-29

Status: **exact universal algebraic reduction plus finite boundary census.**
This note does not yet prove the resulting nested-family inequality.

## Exact reduction

Let `Delta` be any down-closed set system with distinct marked vertices
`u,v`.  Split faces by their exact mark incidence and remove the marks:

```text
P = neither-mark faces,
A = u-only faces,
B = v-only faces,
C = both-mark faces.
```

Then `P,A,B,C` are down-closed and

```text
C subset A intersection B,    A,B subset P.
```

Writing `p_i,a_i,b_i,c_i` for their `i`-face counts, direct substitution in
the four-minor formula gives

```text
N_4 = K(P)+L(P,A)+L(P,B)+R(A,B)+R(P,C),
```

where

```text
K(P) = 2p2^2+3p3^2-5p1p5-2p1p4-2p2p4+2p1p3+2p2p3,

L(P,A) = -a1p3-a3p1-5a1p4-5a4p1
         +2a1p2+2a2p1+2a2p2+3a2p3+3a3p2,

R(A,B) = 2a1b1+8a2b2-5a1b3-5a3b1.
```

`R(P,C)` is obtained from the last line by replacing `(A,B)` with `(P,C)`.
After like terms are combined, the formula has exactly **33 monomials**.
The verifier derives the identity symbolically and asserts

```text
expand(direct_N4-decomposed_N4) = 0.
```

This reduction uses only downward closure; it is not forest- or graph-
specific.

## Exact finite boundary censuses

The same verifier independently evaluates the direct four-row formula and
the decomposed formula in every cell of two complete finite censuses.

1. Every one of the `7,581` labelled down-closed set systems on five
   vertices and every unordered marked pair: `75,810` cells, zero negatives.
   It also replays `848,520` literal nesting implications.
2. Every `1,251` marked-capable graph in the NetworkX atlas (orders two
   through seven) and every unordered marked pair: `24,684` cells, zero
   negatives.

Both minima are zero.  These are boundary results, not an all-order proof.

## Replay and integrity

```text
python verify_iso_n4_simplicial_decomposition_root.py
```

Success marker:

```text
PASS_EXACT_ISO_N4_SIMPLICIAL_DECOMPOSITION_AND_BOUNDARY_CENSUS
```

Integrity:

```text
verify_iso_n4_simplicial_decomposition_root.py
F7D04388FBE4265A0E0D8CD9A245C60982089A3A3403C82FEBB1D3722B69AF1B

iso_n4_simplicial_decomposition_exact_root_20260829.json
93421C088559A6F85413E8E37CE66E7747C30A72739FA4C1C60412F081B0C6D5
```

## Subsequent obstruction and remaining theorem

The later exact counterexample `K_{10,26}`, with two same-side marks, has
`N_4=-36,102`.  Thus the displayed expression is **not** nonnegative for
all nested down-closed families, flag complexes, triangle-free graphs, or
bipartite graphs.  See
`ISO_N4_COMPLETE_BIPARTITE_OBSTRUCTION_ROOT_2026-08-29.md`.

The still-plausible target is the narrower forest restriction model, where
`P=I(W)` and `A,B,C` are induced restrictions obtained by deleting marked
neighborhoods subject to acyclicity.  This note asserts neither all-forest
`N_4`, forest ISO, nor Erdos Problem 993.
