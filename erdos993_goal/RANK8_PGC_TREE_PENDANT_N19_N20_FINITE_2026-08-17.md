# Rank-eight tree-pendant census at orders 19 and 20

Date: 2026-08-17

Status: **EXACT FINITE CONNECTED-TREE AUDIT; NOT AN ALL-FOREST OR ALL-ORDER
RANK-EIGHT THEOREM.**

The literal cleared rank-eight pendant margin is

```text
8b6 Q8(P)+24c7 p7 b6+V8(B)p7,
P=I(T),  B=I(T-{l,p}).
```

An exact WROM generator checks one polynomial pair for every distinct
pendant support in every free tree of orders 19 and 20.  Multiple leaves at
the same support give the same pair and are safely collapsed.

The census covers

```text
1,141,020 free trees,
6,945,357 pendant-support pairs,
2,308,381 required pairs with alpha(T)>=13.
```

The required alpha split is

```text
13: 1,665,318
14:   533,405
15:    97,869
16:    10,974
17:       779
18:        35
19:         1.
```

There are zero negative `Q8(P)` rows, zero negative `V8(B)` rows, and zero
negative coupled margins.  The minimum occurs at order 19 and `alpha=13`:

```text
202,611,114,764 / 13,426,838 > 0.
```

The replay recompiles the exact Rust source, runs the complete census twice,
requires byte-identical standard output, then independently reconstructs the
minimum tree in NetworkX and recomputes `P`, `B`, `Q8`, `V8`, the cleared
margin, and `H8(P)-H7(B)`.

Files and SHA-256 hashes:

```text
verify_rank8_pgc_tree_pendant_n19_n20.rs
  8EB182E4DFCC7BF1227FF8AB3F62052092B1D736A48766A39E1BE31CA434A2B7
verify_rank8_pgc_tree_pendant_n19_n20.exe
  94945D426B95B00FE7E0EFDA13EA8E9D4D44F49D482C0AD99B8676B2D9570DDE
replay_rank8_pgc_tree_pendant_n19_n20.py
  1B8743A7BC463BC96D96AC6BD02E23269DA293326E6627BA5A5BCB8F89F6DA21
rank8_pgc_tree_pendant_n19_n20_exact_20260817.json
  57B3B9832F25CF2BA89819E6E9B85F8374058AD35DC61C0A75F502582752307A
```

This extends the polynomial-complete all-forest audit through order 18 only
for connected trees.  Disconnected forest pairs at orders 19 and 20, the
remaining `alpha=13,14` boundary through orders 26 and 28, the connected
`Q8` theorem, and the forest convolution lift remain open.
