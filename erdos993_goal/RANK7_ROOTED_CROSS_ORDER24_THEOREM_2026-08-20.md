# Rank-seven rooted-cross theorem at order 24

Date: 2026-08-20

Status: **PROVED EXACTLY FOR EVERY TREE AND EVERY ROOT AT ORDER 24.** Together
with the previous finite censuses, rooted `C7` is now unconditional through
order 24. This does not close orders 25--38 or the separate connected-tree
`Q7` theorem.

## Theorem

For every tree `T` on 24 vertices and every root `p`, put

```text
d=i5(T), e=i6(T), f=i7(T),
h=i5(T-p), k=i6(T-p).
```

Then

```text
C7(T,p)=d(e^2-df)-2e(eh-dk)>0.
```

## Exhaustive exact census

The streaming WROM generator asserts the classical free-tree count. Directed
edge messages compute `I(T)` and every `I(T-p)` through rank seven while only
one tree is retained in memory. Every sign decision uses signed 128-bit
integer arithmetic.

```text
free trees       39,299,897
rooted checks   943,197,528
negative values           0
minimum C7    1,931,637,600,058
```

The exact minimum occurs at a leaf root of a `B2=3` tree. Its rows are

```text
I(T), i0..i7   = 1,24,253,1543,6041,15947,29068,36934
I(T-p), i0..i7 = 1,23,231,1331,4863,11764,19124,20813.
```

A fresh compilation repeats the entire census and reproduces the output
exactly. The independent Python witness replay reconstructs the tree from
its WROM layout, recomputes both coefficient rows, root degree, `B2`, and the
minimum `C7` value.

## Consequence

The unconditional finite band now reaches order 24, so the middle gap is

```text
25<=n<=38.
```

Combining this with the separate `B2=5` subdivision theorem removes `B2=5`
from the order-25 and order-26 residuals as well. The exact combined live cut
is assembled by
`assemble_rank7_rooted_c7_middle_residual_20260820.py`.

## Replay

```powershell
rustup run stable-x86_64-pc-windows-gnu rustc -O `
  .\verify_rank7_rooted_cross_order24.rs `
  -o .\verify_rank7_rooted_cross_order24.exe
.\verify_rank7_rooted_cross_order24.exe
python .\verify_rank7_rooted_cross_order24_replay.py
```

Expected markers:

```text
PASS_EXACT_RANK7_ROOTED_CROSS_ALL_ROOTS_ORDER_24
PASS_FRESH_REPLAY_EXACT_RANK7_ROOTED_C7_ALL_ROOTS_ORDER_24
```

SHA-256:

```text
verify_rank7_rooted_cross_order24.rs
2EED519730AA14E52E10A57F4C5B242CB2F924E9A0A650FFB28B30DECB5ED95A

verify_rank7_rooted_cross_order24_replay.py
028C3D823D0915768DE8801DE3DC5DA6610EAA0E91DB9031577EB6A3A30C3154

rank7_rooted_cross_order24_exact_20260820.log
248DD83E90D2F5A38D0F690951818B8A78ED987447945D4F59026684E14BC6AC

rank7_rooted_cross_order24_fresh_replay_20260820.log
248DD83E90D2F5A38D0F690951818B8A78ED987447945D4F59026684E14BC6AC

rank7_rooted_cross_order24_exact_20260820.json
62A049001E2328FC9559FD297020DCD86759DE28DCAB22536664681E1C8A61DB
```
