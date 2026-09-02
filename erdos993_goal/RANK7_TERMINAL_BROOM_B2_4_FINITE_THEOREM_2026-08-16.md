# Rank-seven terminal-broom finite theorem for `B2=4`

Date: 2026-08-16

Status: **PROVED EXACT FINITE STRUCTURAL THEOREM.** This closes the `B2=4`
portion of core orders 23--38. It does not claim the remaining `B2>=5`
middle band.

## Theorem

For every root of every tree `A` of order `23<=n<=38` with

```text
B2(A)=sum_v binom(deg(v)-1,2)=4,
```

all fourteen Newton coefficients of the exact terminal-broom residual are
strictly positive:

```text
Delta^j R_1(A,q)>0  (0<=j<=13).
```

Consequently `R_t(A,q)>=0` for every integer `t>=1`.

## Complete suppressed-skeleton census

After suppressing degree-two vertices, `B2=4` has exactly three skeleton
families:

1. one degree-four and one degree-three branch vertex;
2. four degree-three branch vertices whose branch tree is a path;
3. four degree-three branch vertices whose branch tree is a star.

Positive edge-length compositions recover every tree in the class. The
canonical edge orderings in the independently replayed rooted-`C7` generator
quotient by the full automorphism group of each skeleton.

Across orders 23--38 the exact census contains:

```text
trees          24,074,951
rooted checks 845,798,479
negative Newton vectors 0
```

The global minima of `Delta^0` through `Delta^13`, respectively, are:

```text
2988360217325619472
7323074614025556141
8866677989329638621
8646891228369950305
6934640981629215624
4428496468102464660
2216112438184722222
862474757834628540
258327740943733860
58352268974378400
9575570666137770
1068374748110670
71435086402680
2101031953020
```

Every minimum is strictly positive. Arithmetic is exact `i128`. For each
root, the verifier computes the core and root-deleted independence
polynomials, evaluates the exact terminal-broom residual at `t=1,...,15`,
and takes fourteen successive forward differences. Fixed-array differencing
and per-tree binomial smoothing are arithmetic-preserving optimizations.

## Fresh replay

The first no-gap pass and a separately compiled fresh no-gap replay agree
exactly on every orderwise count and all 224 retained Newton minima. Run:

```powershell
python .\replay_rank7_terminal_broom_b2_4.py
```

Expected final marker:

```text
PASS_FRESH_REPLAY_EXACT_RANK7_TERMINAL_BROOM_B2_4
```

Artifacts and SHA-256:

```text
verify_rank7_terminal_broom_b2_4.rs
C3C03C3E35F4A0AFC98EC50C7A65FBD7B41B2AF752938DDF3C248938FBA58E19

verify_rank7_rooted_cross_b2_4.rs
53587DF347B71F7E378EF6DDE52F1C1E89E95BED714856FA3A0A16CBC0BC0D6D

replay_rank7_terminal_broom_b2_4.py
93C56364AAD9DB4FA9049CB42FDA2FD4A4710AFCF8F1703B597A410D6D111284

rank7_terminal_broom_b2_4_exact_20260816.json
D14ACE6BFD16C11C1D2937A187D684D63DDBE6A8343D6D2616A7E155219DA697

rank7_terminal_broom_b2_4_replay_20260816.json
60751B0A9C49D61A08682F8635855EFB8FB7C28D6305B3D3F9BF4C28FFBB640C

rank7_terminal_broom_b2_4_exact_run_v2.log
41BDF36FCB2356627D36DE3D419AADD7409605D37FD5CEE4755F3E708F82BD92

rank7_terminal_broom_b2_4_fresh_replay.log
F7F13D223AAE2D7B538A9524BC3666396B7FE30F65F6FE8366A80D379653E739
```

Together with the separate `B2<=3` theorem, this closes every `B2<=4` tree
in orders 23--38. The remaining structural middle band is exactly `B2>=5`.
