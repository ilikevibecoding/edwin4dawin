# Rank-seven terminal-broom Delta-two theorem from order 39

Date: 2026-08-16

Status: **PROVED ALL-ORDER LARGE-ORDER THEOREM.**  This proves the second
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
Delta^2 R_1 >= 0.
```

## Normalization

Put `J=A-N[q]`, `m=|J|`, and

```text
x  = c3/c4,                 y  = c4/c5,
z  = c5/c6,                 D4 = 1-c3*c5/c4^2,
D5 = 1-c4*c6/c5^2,          q6 = 1-c5*c7/c6^2,
s  = h5/c5,                 d  = h6/c6.
```

Thus `y=x/(1-D4)` and `z=y/(1-D5)`.  Dividing the exact coefficient
by the positive factor `c6^4` gives

```text
E2 =
 -96d^2*x*y*z -96d^2*y*z +d*s*x*y*z^2 +197d*s*y*z^2
 +196d*s*z^2 -98q6^2*s*x*y -98q6^2*s*y
 +336q6*s*x*y*z +196q6*s*x*y +364q6*s*y*z +196q6*s*y
 +28q6*s*z -7s^2*y*z^3 -119s^2*z^3 -112s^2*z^2
 -7s*x*y^2*z^3 -133s*x*y*z^3 -357s*x*y*z^2
 -336s*x*y*z -98s*x*y +77s*y^2*z^3 +182s*y*z^3
 -238s*y*z^2 -364s*y*z -98s*y +315s*z^3 +287s*z^2
 +56s*z.
```

The exact root-curvature replay proves separate concavity in `h5`, `h6`,
and `c7` on the required half-retention domain.

## Exact domain

Ordinary extension counting and the proved sharp rank-(3,4) tree ratio give

```text
4/(n-3) <= x <= 4(n-2)/((n-5)(n-6)).
```

The proved rank-four reserve and rank-(3,4,5) defect ceiling give

```text
(2+x)/10 <= D4 <= 1559/3575,
y = x/(1-D4).
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
d^2 E2/dq6^2 = -4y(49s+12z)(x+1) < 0.
```

On the upper endpoint, `d` is independent of `q6`, so the raw `c7`
concavity applies.  Thus `q6` also reduces to its two endpoints.

The proof splits `m<=17` from `18<=m<=n-2`, substitutes `n=39/T`, and maps
the remaining `m,x,D4,D5,s` intervals rationally to unit boxes.  The full
`D4` and `D5` intervals are retained; no unproved endpoint reduction is
used.  After exact denominator clearing, every denominator and numerator
tensor has nonnegative rational Bernstein coefficients.  No floating-point
arithmetic or sampled inference is used.

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

The four large-root numerator tensors have 1,090,584 or 1,332,936 exact
entries.  The manifest records every tensor shape, exact minimum and index,
branch log, and branch-log SHA-256.

## Replay

From `C:\Users\chris\erdos993_goal`, run

```powershell
python .\replay_rank7_terminal_broom_delta2_large.py
```

The expected final marker is

```text
RANK7_TERMINAL_BROOM_DELTA2_LARGE_REPLAY_PASS
```

The replay checks half retention, exact root/D6 concavity, all eight
sharp-capacity branch markers and hashes, and the complete manifest.
