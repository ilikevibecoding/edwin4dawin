# Rank-seven terminal-broom finite theorem for `B2=2,3`

Date: 2026-08-16

Status: **PROVED EXACT FINITE STRUCTURAL THEOREM.** This closes the `B2=2`
and `B2=3` portions of core orders 23--38. It is not the unrestricted
middle-band theorem.

## Theorem

For every root of every tree `A` of order `23<=n<=38` with

```text
B2(A)=sum_v binom(deg(v)-1,2) in {2,3},
```

all fourteen Newton coefficients of the terminal-broom residual satisfy

```text
Delta^j R_1(A,q)>=0  (0<=j<=13).
```

Consequently `R_t(A,q)>=0` for every integer `t>=1`.

## Complete suppressed-skeleton census

Suppressing degree-two vertices leaves exactly one skeleton for `B2=2`
(two degree-three vertices joined, with two leaf arms each) and exactly two
skeletons for `B2=3` (a degree-four star, or three degree-three vertices in
a chain). Positive edge-length compositions recover every tree. Canonical
edge orderings quotient by every skeleton automorphism.

Across orders 23--38 the exact census contains:

| class | subdivisions | rooted checks | negative Newton vectors |
|---|---:|---:|---:|
| `B2=2` | 59,652 | 1,982,486 | 0 |
| `B2=3` | 1,548,391 | 53,139,744 | 0 |
| total | 1,608,043 | 55,122,230 | 0 |

All fourteen classwise minima are retained at every order and are strictly
positive. Arithmetic is exact `i128`; the result is a finite theorem rather
than sampled evidence.

## Replay

Run:

```powershell
python .\replay_rank7_terminal_broom_b2_2_3.py
```

Expected marker:

```text
PASS_EXACT_RANK7_TERMINAL_BROOM_B2_2_3_ORDERS_23_THROUGH_38
```

Artifacts and SHA-256:

```text
verify_rank7_terminal_broom_b2_2_3.rs
92BD9E6C9F7ADDF5ECC914CACABB89A941FC1011F5527FA590181CEC8E69A3FD

verify_rank7_terminal_broom_b2_2_3_replay.exe
44BC77EE54A22E7BD5085E105B552124F0B26330DC8861516B87D154603604CC

replay_rank7_terminal_broom_b2_2_3.py
B8A4FF6ECC214986550212A13259DFE06303F62EFF4E9CC480BC3598BC27882C

rank7_terminal_broom_b2_2_3_exact_20260816.json
979E17B31546721922E7D590531B982718BBE5072A667CC6B33FBA6CE6068A95
```

Together with the separate `B2<=1` theorem, this closes every `B2<=3`
tree in orders 23--38. The remaining structural band is `B2>=4`.
