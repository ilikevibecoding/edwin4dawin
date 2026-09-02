# Rank-seven rooted-cross theorem at order 23

Date: 2026-08-20

Status: **PROVED EXACTLY FOR EVERY TREE AND EVERY ROOT AT ORDER 23.** This
closes the first order of the old 23--38 middle band. It does not close orders
24--38 or prove the separate connected-tree `Q7` theorem.

## Theorem

For every tree `T` on 23 vertices and every root `p`, write

```text
d=i5(T), e=i6(T), f=i7(T),
h=i5(T-p), k=i6(T-p).
```

Then

```text
C7(T,p)=d(e^2-df)-2e(eh-dk)>0.
```

## Exhaustive exact census

The streaming WROM generator asserts the classical free-tree count and keeps
only one tree plus its directed-edge coefficient messages in memory. Every
root deletion is evaluated in signed 128-bit integer arithmetic.

```text
free trees       14,828,074
rooted checks   341,045,702
negative values           0
minimum C7      679,432,265,658
```

The minimum occurs at a leaf root of a `B2=3` tree. Its exact rows are

```text
I(T), i0..i7   = 1,23,231,1333,4898,12021,20154,23270
I(T-p), i0..i7 = 1,22,210,1141,3893,8688,12831,12441.
```

A fresh compilation and full second census reproduce the complete output
exactly. A separate Python replay reconstructs the witness graph from its
WROM layout, independently recomputes both coefficient rows, its root degree,
`B2`, and the displayed `C7` value.

## Consequence

Combined with the previous all-root theorem through order 22, rooted `C7` is
now unconditional through order 23. The finite middle band is reduced to

```text
24<=n<=38.
```

The independent degree-partition reduction in
`RANK7_ROOTED_C7_DEGREE_PARTITION_REDUCTION_2026-08-20.md` starts exactly at
order 24 and therefore does not overlap this census.

## Replay

```powershell
rustup run stable-x86_64-pc-windows-gnu rustc -O `
  .\verify_rank7_rooted_cross_order23.rs `
  -o .\verify_rank7_rooted_cross_order23.exe
.\verify_rank7_rooted_cross_order23.exe
python .\verify_rank7_rooted_cross_order23_replay.py
```

Expected markers:

```text
PASS_EXACT_RANK7_ROOTED_CROSS_ALL_ROOTS_ORDER_23
PASS_FRESH_REPLAY_EXACT_RANK7_ROOTED_C7_ALL_ROOTS_ORDER_23
```
