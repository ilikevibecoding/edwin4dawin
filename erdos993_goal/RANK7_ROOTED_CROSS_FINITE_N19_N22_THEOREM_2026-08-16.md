# Rank-seven rooted-cross finite theorem: orders 19--22

## Theorem

Let `T` be a tree of order `19 <= n <= 22`, let `p` be any vertex, and write

```text
d=i5(T), e=i6(T), f=i7(T), h=i5(T-p), k=i6(T-p).
```

Then

```text
C7(T,p)=d(e^2-df)-2e(eh-dk) > 0.
```

This is a finite exact theorem.  It makes no claim about order 23 or above
and does not by itself prove the forest inequality `Q7`.

## Exact census

The replay streams the canonical WROM free-tree generator, asserts the
classical free-tree count at every order, and evaluates every possible root.
All independence-polynomial arithmetic is signed 128-bit integer arithmetic.

| order | free trees | rooted checks | negative | minimum `C7` |
|---:|---:|---:|---:|---:|
| 19 | 317,955 | 6,041,145 | 0 | 4,621,517,762 |
| 20 | 823,065 | 16,461,300 | 0 | 18,599,084,346 |
| 21 | 2,144,505 | 45,034,605 | 0 | 67,393,744,400 |
| 22 | 5,623,756 | 123,722,632 | 0 | 222,749,322,452 |
| **total** | **8,909,281** | **191,259,682** | **0** | -- |

The JSON certificate records a WROM layout, root, independence coefficients,
and root-deleted coefficients attaining each orderwise minimum.

## Replay

From `C:\Users\chris\erdos993_goal`, run:

```powershell
python replay_rank7_rooted_cross_finite.py
```

The wrapper compiles the Rust checker with the installed GNU Rust toolchain,
runs orders 19 through 22, parses every output row, independently asserts the
counts, root totals, zero-negative result, and minima, and writes
`rank7_rooted_cross_finite_n19_n22_exact_20260816.json`.

## Artifact hashes (SHA-256)

```text
verify_rank7_rooted_cross_finite.rs
CBFF56B7FE86C45D28DD5B31122C9A1EB223E091E074C8CCF7B63425FCD9E08E

replay_rank7_rooted_cross_finite.py
F1435412A7D694FB03BC56C871CBBBA8F762A7092AC0ADF83A62789F0E634574

rank7_rooted_cross_finite_n19_n22_exact_20260816.json
57F28E80F94580493754F2AD9BA678D4D40BB62998763143E3DEDD39ECD924BB
```
