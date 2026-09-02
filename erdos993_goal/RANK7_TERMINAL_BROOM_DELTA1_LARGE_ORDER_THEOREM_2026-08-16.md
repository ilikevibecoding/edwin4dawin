# Rank-seven terminal-broom Delta-one theorem from order 39

Date: 2026-08-16

Status: **PROVED ALL-ORDER LARGE-ORDER THEOREM.**  This proves the first
Newton coefficient of the terminal-broom residual for every rooted tree core
of order at least 39.  It does not by itself settle the other outstanding
coefficients, core orders 19--38, the connected-tree reserve `Q7`, or Erdos
Problem #993.

## Theorem

Let `A` be a tree of order `n>=39`, rooted at `q`, put `H=A-q`, and form the
terminal-broom residual `R_t` from the exact identity

```text
7 c6 h5 Q7(G_t)
 = R_t + 7 h5 p6(t) Q7(A) + 8 c6 p6(t) Q6(H).
```

Then

```text
Delta^1 R_1 >= 0.
```

## Normalization

Put `J=A-N[q]`, `m=|J|`, and

```text
y  = c4/c5,                 z  = c5/c6,
D5 = 1-c4*c6/c5^2,          q6 = 1-c5*c7/c6^2,
s  = h5/c5,                 d  = h6/c6.
```

Thus `z=y/(1-D5)`.  Dividing the exact coefficient by the positive factor
`c6^4` gives

```text
E1 =
 -96d^2*y*z -96d^2*z +d*s*y*z^2 +197d*s*z^2 +196d*s*z
 -98q6^2*s*y -98q6^2*s +112q6*s^2*z +224q6*s*y*z
 +196q6*s*y +140q6*s*z +112q6*s
 -7s^2*z^3 -119s^2*z^2 -112s^2*z
 -7s*y*z^3 -126s*y*z^2 -224s*y*z -98s*y
 +84s*z^3 +140s*z^2 +35s*z -14s.
```

The exact root-curvature replay proves separate concavity in `h5`, `h6`,
and `c7` on the required half-retention domain.

## Exact domain

Write

```text
t_n = (n-7)(n-8)/(n-3).
```

Ordinary extension counting and the proved sharp rank-(4,5) forest ratio give

```text
5/(n-4) <= y <= 5/t_n.
```

The proved rank-five reserve and exact two-extension ceiling give

```text
(2+y)/12 <= D5 <= 1/6+y/2,
z = y/(1-D5).
```

The proved rank-six reserve and its two-extension ceiling give

```text
(2+z)/14 <= q6 <= 1/7+z/2.
```

Coefficientwise path minimality gives `c5>=C(n-4,5)`.  Hence

```text
s >= 1-C(m,4)/C(n-4,5).
```

In particular the separately replayed order-39 factorization proves
`s>=1/2`; this is the hypothesis needed by the `c7` concavity reduction.
The proved rooted cross theorem `C7(A,q)>0` gives

```text
d >= s-q6/2.
```

When `m>=18`, the sharp forest rank-(4,5) ratio gives

```text
L4(m)=(m-7)(m-8)/(m-3),
d <= 1-z*L4(m)*(1-s)/5.
```

For `m<=17` the proof instead uses

```text
s >= 1-C(17,4)/C(n-4,5),    d <= 1.
```

## Endpoint reduction and exact Bernstein certificate

Concavity in `h6` reduces `d` to the displayed lower and upper endpoints.
On the lower endpoint `d=s-q6/2`, exact differentiation gives

```text
d^2 E1/dq6^2 = -4(49s+12z)(y+1) < 0.
```

On the upper endpoint, `d` is independent of `q6`, so the raw `c7`
concavity applies.  Thus `q6` also reduces to its two endpoints.

The proof splits `m<=17` from `18<=m<=n-2`, substitutes `n=39/T`, and maps
the remaining `m,y,D5,s` intervals rationally to unit boxes.  After exact
denominator clearing, every denominator and numerator tensor has
nonnegative rational Bernstein coefficients.  No floating-point arithmetic
or sampled inference is used.

The complete branch inventory is

| `m` case | `q6` endpoint | `d` endpoint | result |
|---|---:|---:|---:|
| `m<=17` | 0 | 0 | PASS |
| `m<=17` | 0 | 1 | PASS |
| `m<=17` | 1 | 0 | PASS |
| `m<=17` | 1 | 1 | PASS |
| `18<=m<=n-2` | 0 | 0 | PASS |
| `18<=m<=n-2` | 0 | 1 | PASS |
| `18<=m<=n-2` | 1 | 0 | PASS |
| `18<=m<=n-2` | 1 | 1 | PASS |

The manifest records every tensor shape, exact minimum and index, branch
log, and branch-log SHA-256.

## Replay

From `C:\Users\chris\erdos993_goal`, run

```powershell
python .\replay_rank7_terminal_broom_delta1_large.py
```

The expected final marker is

```text
RANK7_TERMINAL_BROOM_DELTA1_LARGE_REPLAY_PASS
```

The replay checks half retention, exact root/D6 concavity, all eight
sharp-capacity branch markers and hashes, and the complete manifest.
