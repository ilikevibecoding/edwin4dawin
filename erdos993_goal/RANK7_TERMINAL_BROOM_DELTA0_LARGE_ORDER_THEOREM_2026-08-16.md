# Rank-seven terminal-broom Delta-zero theorem from order 39

Date: 2026-08-16

Status: **PROVED ALL-ORDER LARGE-ORDER THEOREM.**  This proves the zeroth
Newton coefficient of the terminal-broom residual for every rooted tree core
of order at least 39.  It does not by itself settle the remaining Newton
coefficients, the core orders 19--38, the connected-tree reserve `Q7`, or
Erdos Problem #993.

## Theorem

Let `A` be a tree of order `n>=39`, rooted at `q`, put `H=A-q`, and form the
terminal-broom residual `R_t` from the exact identity

```text
7 c6 h5 Q7(G_t)
 = R_t + 7 h5 p6(t) Q7(A) + 8 c6 p6(t) Q6(H).
```

Then

```text
Delta^0 R_1 >= 0.
```

## Normalization

Put `J=A-N[q]`, `m=|J|`, and

```text
z = c5/c6,
q6 = 1-c5*c7/c6^2,
s = h5/c5,
d = h6/c6.
```

After division by the positive factor `c6^4`, exact symbolic reduction gives

```text
E0 =
 2d^2 s z -96d^2 z -96d^2 -196d q6 s
 +d s^2 z^2 +d s z^2 +197d s z +196d s
 -98q6^2 s^2 -98q6^2 s
 +112q6 s^2 z +196q6 s^2 +112q6 s z +112q6 s
 -7s^2 z^2 -112s^2 z -98s^2
 -7s z^2 -21s z -14s.
```

The exact root-curvature replay proves that `E0` is separately concave in
`h5`, `h6`, and `c7`.  The `c7` coordinate is affine in `q6`.

## Exact domain

The proof uses the following already-proved bounds only.

Coefficientwise path minimality and ordinary extension counting give

```text
c5 >= C(n-4,5),             z >= 6/(n-5).
```

The sharp rank-(4,5) tree ratio followed by the proved V7 transfer gives

```text
t_n = (n-7)(n-8)/(n-3),
mu_n = (t_n-3+2/t_n)/6,
z <= 1/mu_n.
```

The proved rank-six reserve and two-extension bound give

```text
(2+z)/14 <= q6 <= 1/7+z/2.
```

Since `i4(J)<=C(m,4)`,

```text
s >= 1-C(m,4)/C(n-4,5).
```

The proved rooted cross theorem `C7(A,q)>0` gives

```text
d >= s-q6/2.
```

When `m>=18`, the proved sharp forest rank-(4,5) ratio gives

```text
L4(m)=(m-7)(m-8)/(m-3),
d <= 1-z*L4(m)*(1-s)/5.
```

For `m<=17`, the proof uses the weaker bounds

```text
s >= 1-C(17,4)/C(n-4,5),    d <= 1.
```

## Endpoint reduction

For fixed `s,q6`, concavity in `h6` reduces `d` to its two displayed
endpoints.  On the lower cross endpoint `d=s-q6/2`, direct differentiation
gives

```text
d^2 E0/dq6^2 = -196s^2+s z-48z-48 < 0
```

because `0<s<=1` and `z>0`.  On the upper `d` endpoint, `d` is independent
of `q6`, so the raw `c7` concavity applies.  Hence `q6` also reduces to its
two endpoints.  The remaining `n,m,z,s` domains are mapped rationally to
unit boxes; no sampling or floating-point arithmetic is used.

The exact Bernstein inventory is therefore eight branches:

| `m` case | lower/upper `q6` | lower/upper `d` | result |
|---|---:|---:|---:|
| `m<=17` | 0 | 0 | PASS |
| `m<=17` | 0 | 1 | PASS |
| `m<=17` | 1 | 0 | PASS |
| `m<=17` | 1 | 1 | PASS |
| `18<=m<=n-2` | 0 | 0 | PASS |
| `18<=m<=n-2` | 0 | 1 | PASS |
| `18<=m<=n-2` | 1 | 0 | PASS |
| `18<=m<=n-2` | 1 | 1 | PASS |

Every cleared denominator and every numerator tensor has nonnegative exact
rational Bernstein coefficients.  The manifest records every tensor shape,
minimum, minimizing index, branch log, and branch-log SHA-256.

## Replay

From `C:\Users\chris\erdos993_goal`, run

```powershell
python .\replay_rank7_terminal_broom_delta0_large.py
```

The expected final marker is

```text
RANK7_TERMINAL_BROOM_DELTA0_LARGE_REPLAY_PASS
```

The replay verifies the exact root/D6 concavity, replays or validates all
eight Bernstein branches, checks the sharp-capacity version marker in every
log, checks every branch hash, and writes
`rank7_terminal_broom_delta0_large_replay_20260816.json`.

## Quarantined weak enclosure

An earlier deliberately weaker box used `c5>=C(n-5,5)`.  Its large-root,
lower-`q6`, upper-`d` branch had a negative Bernstein coefficient.  That
failure is preserved as
`rank7_terminal_broom_delta0_v1_weak_capacity_enclosure_failure.log`.  It is
an exact failure of the weak enclosure only, not a tree counterexample, and
none of its branch passes is used in this theorem.
