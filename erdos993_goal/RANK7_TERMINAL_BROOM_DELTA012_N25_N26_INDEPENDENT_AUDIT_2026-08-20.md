# Independent audit of the rank-seven `Delta0..Delta2` census at orders 25 and 26

Date: 2026-08-20

Status: **PASS.** The primary and replay artifacts certify nonnegative
`Delta0`, `Delta1`, and `Delta2` at every root of every free-tree core of
orders 25 and 26. Both order replays are byte-identical to their primaries.
This audit launches no new census and makes no claim at another order.

## Exact scope and outcome

| core order | free trees | all roots | eligible roots | minimum `Delta0` | minimum `Delta1` | minimum `Delta2` |
|---:|---:|---:|---:|---:|---:|---:|
| 25 | 104,636,890 | 2,615,922,250 | 2,615,922,250 | 40,079,227,531,443,480,576 | 95,833,838,568,014,483,328 | 100,028,493,760,894,175,232 |
| 26 | 279,793,450 | 7,274,629,700 | 7,274,629,700 | 141,840,573,592,847,576,832 | 326,582,303,022,127,914,048 | 317,724,778,374,779,054,160 |
| **total** | **384,430,340** | **9,890,551,950** | **9,890,551,950** |  |  |  |

Every displayed minimum is strictly positive.

## Coverage and no-gap audit

The verifier uses the canonical Wright--Richmond--Odlyzko--McKay free-tree
successor and then loops over every vertex of each accepted free tree. It
asserts both the accepted free-tree count and `n` times that count for roots.

The audit independently regenerates the free-tree count sequence without the
WROM stream. It first computes the rooted-tree series

```text
T(x) = x exp(sum_(k>=1) T(x^k)/k)
```

and then applies Otter dissymmetry

```text
U(x) = T(x) - (T(x)^2-T(x^2))/2.
```

The resulting coefficients are exactly

```text
u_25 = 104636890,
u_26 = 279793450.
```

As a separate implementation check, a Python port of the audited WROM
successor was compared with every free tree in the NetworkX graph atlas at
orders 2 through 7. Every atlas class occurred exactly once, with zero
duplicates and zero omissions.

There is no eligibility gap. A tree is bipartite, so at these orders
`alpha(T)>=ceil(n/2)>6`, while `T-p` is a bipartite forest with
`alpha(T-p)>=ceil((n-1)/2)>5`. Hence the verifier's conditions `c6>0` and
`h5>0` hold at every root, as the equality of all-root and eligible-root
counts also records.

## Coefficient construction

For each tree `T` and root `p`, exact excluded/included tree DP computes the
independence coefficients through degree eight:

```text
c_k = i_k(T),
h_k = i_k(T-p).
```

The deleted polynomial is exactly the excluded state after rooting the DP at
`p`. For `t=1,2,3`, the residual uses

```text
p6(t)  = sum_(l=0)^t binom(t,l)c_(6-l) + h5,
p7(t)  = sum_(l=0)^t binom(t,l)c_(7-l) + h6,
p8o(t) = sum_(l=1)^t binom(t,l)c_(8-l).
```

It evaluates the literal residual `R_t` at those three consecutive points and
forms

```text
Delta0 = R_1,
Delta1 = R_2-R_1,
Delta2 = R_3-2R_2+R_1.
```

Only `c3..c7` and `h5,h6` occur in this range, so the degree-eight DP is more
than sufficient. A triangle-inequality bound on every intermediate is
`2,957,071,351,414,600,837,401,600` at order 25 and
`8,399,649,441,905,939,096,880,000` at order 26, both far below the signed
128-bit limit.

## Independent witness reconstruction

All six minima are attained by a path rooted at an endpoint.

For `P25`, the independently reconstructed coefficient rows are

```text
c[0..8] = [1,25,276,1771,7315,20349,38760,50388,43758]
h[0..8] = [1,24,253,1540,5985,15504,27132,31824,24310]
R[1..3] = [40079227531443480576,
           135913066099457963904,
           331775398428366622464].
```

Their first three Newton coefficients reproduce the order-25 minima exactly.

For `P26`, they are

```text
c[0..8] = [1,26,300,2024,8855,26334,54264,77520,75582]
h[0..8] = [1,25,276,1771,7315,20349,38760,50388,43758]
R[1..3] = [141840573592847576832,
           468422876614975490880,
           1112729958011882459088].
```

These reproduce the order-26 minima exactly. The audit reconstructs the
reported WROM layouts as paths and confirms that each reported root is an
endpoint.

## Replay

The existing replay driver repeated every root check with the frozen
executable. For each order, the two-line primary and replay logs have the same
SHA-256 hash and are byte-identical:

```text
n=25  FAAFBDE111122DDAFBB4F708C5E4221FCCB3DD793FA74969858C8F5D432D6A49
n=26  B4A0F22DEC07FFD0E78D7B12AAE20CA4DB67DAC686AAF81BA20867CBEB86DCE1
```

Run the read-only audit with

```powershell
python .\audit_rank7_terminal_broom_delta012_n25_n26.py
```

Expected marker:

```text
PASS_INDEPENDENT_EXACT_RANK7_TERMINAL_BROOM_DELTA012_N25_N26_AUDIT
```

## SHA-256

```text
654E2259D8041DDD38C694647F3564ED88886572654F3F5FED55493309CB6432  verify_rank7_terminal_broom_delta012_order.rs
2B8CA5A3A70728F3A70DA6D9997A74225176E48AF4DD4B60217D9A40187D95D7  verify_rank7_terminal_broom_finite.rs
D8A38C9FEB4AD824C2D5FAC09B9459A07D8ABA66E850228F42C2437FCFAA00AE  verify_rank7_terminal_broom_delta012_order.exe
1C4D35E2AEF773F40A9FE0BC95EBEA863630F13592BE603791B8B007F3350141  replay_rank7_terminal_broom_delta012_n25_n26.py
FAAFBDE111122DDAFBB4F708C5E4221FCCB3DD793FA74969858C8F5D432D6A49  rank7_terminal_broom_delta012_n25_exact_20260820.log
FAAFBDE111122DDAFBB4F708C5E4221FCCB3DD793FA74969858C8F5D432D6A49  rank7_terminal_broom_delta012_n25_fresh_replay_20260820.log
B4A0F22DEC07FFD0E78D7B12AAE20CA4DB67DAC686AAF81BA20867CBEB86DCE1  rank7_terminal_broom_delta012_n26_exact_20260820.log
B4A0F22DEC07FFD0E78D7B12AAE20CA4DB67DAC686AAF81BA20867CBEB86DCE1  rank7_terminal_broom_delta012_n26_fresh_replay_20260820.log
688EBD5B8C0CD5B2BC58FE452C2C89AB5AF8D5232B2A83DA7B18BE9CF037019F  rank7_terminal_broom_delta012_n25_n26_replay_exact_20260820.json
9C2497F10CDF5FDE23E095C8E09A9845F65B57DEB2D84BF9EF2109F9CE0A3CCB  audit_rank7_terminal_broom_delta012_n25_n26.py
37D1A5B08C1BE91FC007392467308EBD80DD57C441E72F95A94E70782F7B8536  rank7_terminal_broom_delta012_n25_n26_independent_audit_exact_20260820.json
```
