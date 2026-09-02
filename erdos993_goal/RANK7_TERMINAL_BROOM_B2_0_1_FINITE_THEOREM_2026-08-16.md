# Rank-seven terminal-broom finite theorem for `B2<=1`

Date: 2026-08-16

Status: **PROVED EXACT FINITE STRUCTURAL THEOREM.** This is a proper subset
of the open core-order 19--38 bridge and is not a universal rank-seven
terminal-broom theorem.

## Theorem

Let `A` be a rooted tree of order `23<=n<=38`, let

```text
B2(A)=sum_v binom(deg(v)-1,2),
```

and let `R_t` be the exact rank-seven terminal-broom residual. If `B2(A)` is
zero or one, then every Newton coefficient satisfies

```text
Delta^j R_1 >= 0  (0<=j<=13).
```

Consequently `R_t>=0` for every integer `t>=1`.

## Complete classification and replay

Suppressing degree-two vertices proves that `B2=0` is exactly a path and
`B2=1` is exactly a positive-length subdivision of the three-arm claw.
The verifier checks every path root and every root of every unordered
positive arm-length triple. Across orders 23--38 this is 16 paths, 1,187
claw subdivisions, and 37,877 rooted claw checks. All arithmetic is integer
arithmetic and all fourteen minima are retained per order and class.

Run:

```powershell
python .\verify_rank7_terminal_broom_b2_0_1.py
```

Expected final marker:

```text
PASS_EXACT_RANK7_TERMINAL_BROOM_B2_0_1_ORDERS_23_THROUGH_38
```

Artifacts and SHA-256:

```text
verify_rank7_terminal_broom_b2_0_1.py
522D3E6E94AEF4BCD79B369A46778BC6A0E74E12904DE3A3A418968AD5F38296

rank7_terminal_broom_b2_0_1_exact_20260816.json
04FA61794056E50B9C0FD3A6F81A28B55B36257115B3981CA7B0EC591F53A8F5
```

The result is a finite theorem, not sampled evidence. It does not cover
`B2>=2` or the still-open unrestricted part of orders 23--38.
