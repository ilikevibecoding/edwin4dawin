# Rank-seven terminal-broom finite theorem for mixed `B2=5` trees

Date: 2026-08-16

Status: **PROVED EXACT FINITE STRUCTURAL THEOREM.** This closes every
`B2=5` tree containing a degree-four vertex at core orders 23--38. It does
not cover the two pure-cubic `B2=5` skeleton families.

## Theorem

For every root of every tree `A` of order `23<=n<=38` with

```text
B2(A)=sum_v binom(deg(v)-1,2)=5
```

and with at least one vertex of degree four, all fourteen Newton coefficients
of the exact terminal-broom residual are strictly positive. Therefore
`R_t(A,q)>=0` for every integer `t>=1`.

## Exhaustive structural class

The contribution partition is necessarily `3+1+1`, so suppressing all
degree-two vertices leaves exactly two skeletons:

1. the degree-four branch in the middle of two degree-three branches;
2. the degree-four branch at the end of the three-branch path.

Canonical positive edge-length compositions quotient by automorphism groups
of orders 16 and 12. The orderwise counts match the independent Burnside
classification exactly.

Across orders 23--38 the exact census contains:

```text
trees           8,311,961
rooted checks 288,474,692
negative Newton vectors 0
```

The global minima of `Delta^0` through `Delta^13`, respectively, are:

```text
3098930019900089872
7564713351070281364
9122047832559181556
8874306757292980884
7099544916102866192
4523333475113589096
2260407306349407600
879146434954480140
263307174300485280
59503626793210320
9772694744233680
1091508283875240
73048173438240
2148475689360
```

Every minimum is strictly positive. The verifier uses exact `i128`
independence-polynomial arithmetic and computes fourteen forward differences
of the exact terminal-broom residual at each root.

## Fresh replay

The first no-gap pass and a separately compiled full replay agree exactly on
every orderwise skeleton count and every retained Newton minimum. Run:

```powershell
python .\replay_rank7_terminal_broom_b2_5_mixed.py
```

Expected final marker:

```text
PASS_FRESH_REPLAY_EXACT_RANK7_TERMINAL_BROOM_B2_5_MIXED
```

Artifacts and SHA-256:

```text
verify_rank7_terminal_broom_b2_5_mixed.rs
CD86846737AB8141F91F67E787DE36EF066CD056B3791F6E09A1F44DBF490257

verify_rank7_rooted_cross_b2_4.rs
53587DF347B71F7E378EF6DDE52F1C1E89E95BED714856FA3A0A16CBC0BC0D6D

rank7_rooted_cross_b2_5_skeleton_classification_20260816.json
0B93322165E353AD027426DE9054E0330D6C28BE4E86ABF93C06F3B9A9C85F4B

replay_rank7_terminal_broom_b2_5_mixed.py
425DAC8A8F3D88A5C400ABD2095B6D8315D67CD0366CC9D617159B465CD6793F

rank7_terminal_broom_b2_5_mixed_exact_20260816.json
C3E647F7D27596EBD0CA61CE273E3681716FEDA2DF48148526A178AD7722C3C0

rank7_terminal_broom_b2_5_mixed_replay_20260816.json
C9A5858271AD7749E5DAD11C761AA475E181C6188246AB6DCB445FD16377614B

rank7_terminal_broom_b2_5_mixed_exact_run.log
CAFE8FC876B67D1899B516DE6FE22A140327B597FB768E299A338F1F3AA7C7DD

rank7_terminal_broom_b2_5_mixed_fresh_replay.log
936AC75A34923D5822C203DE8B9EDCA67907C6696543C4303FE346832CC82661
```

The remaining `B2=5` band consists exactly of the two pure-cubic skeletons
with five degree-three branch vertices. No pure-cubic census was launched.
