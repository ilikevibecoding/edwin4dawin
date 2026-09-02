# Rank-seven terminal-broom Delta-five theorem from order 39

Date: 2026-08-16

Status: **PROVED ALL-ORDER LARGE-ORDER THEOREM.**  This proves the fifth
Newton coefficient of the terminal-broom residual for every rooted tree core
of order at least 39.  It does not settle the other outstanding coefficients,
the core orders 19--38, the connected-tree reserve `Q7`, or Erdos Problem
#993.

## Theorem

For the exact terminal-broom residual `R_t` attached to any rooted tree core
`A` of order `n>=39`,

```text
Delta^5 R_1 >= 0.
```

## Defect coordinates and exact cone

Normalize `c3=1` and put

```text
w=c2/c3,                 x=c3/c4,
D4=1-c3*c5/c4^2,         x5=c4/c5=x/(1-D4),
D5=1-c4*c6/c5^2,         x6=c5/c6=x5/(1-D5),
D6=1-c5*c7/c6^2,
s=h5/c5,                 d=h6/c6.
```

The exact cone used by the proof is

```text
3/(n-3) <= w <= 3(n-1)/((n-3)(n-4)),
8w/(6-w) <= x <= 4w/(3(1-w)),

(2+x)/10 <= D4 <= 1559/3575,
(2+x5)/12 <= D5 <= 1/6+x5/2,
(2+x6)/14 <= D6 <= 1/7+x6/2,

1/2 <= s,d <= 1.
```

The defect lower bounds are the already-proved `Q4,Q5,Q6` inequalities;
the upper bounds are the exact two-extension ceilings, and the `D4` ceiling
is the proved rank-(3,4,5) forest defect theorem.

The half-retention bounds are automatic from order 39.  Coefficientwise path
minimality and `|A-N[q]|<=n-2` give

```text
c5 >= C(n-4,5) >= 2C(n-2,4) >= 2i4(A-N[q]),
c6 >= C(n-5,6) >= 2C(n-2,5) >= 2i5(A-N[q]).
```

The exact shifted factorizations are replayed separately.

## Endpoint reductions

The raw Newton coefficient is separately concave in `h5`, `h6`, and `c7`.
Since `c7=(1-D6)c6^2/c5`, this reduces `(s,d,D6)` to their eight endpoints.

At each endpoint, write `y=c6`.  The two `D6` endpoints have

```text
c7=(12y^2/c5-k y)/14,   k in {1,7}.
```

The exact conditional-curvature replay proves that `Delta^5 R_1` is concave
in `y`, hence in `D5`, for all eight branches.  This reduces `D5` to its two
endpoints.  No concavity assertion is made for `D4`: its complete interval is
retained as a fourth Bernstein coordinate.

Thus there are exactly 16 branches indexed by the endpoint bits
`(D5,D6,s,d)`.  In every branch the substitution

```text
n=39/T,
w=w_low+(w_high-w_low)W,
x=x_low+(x_high-x_low)X,
D4=D4_low+(1559/3575-D4_low)U
```

maps the domain to `[0,1]^4`.  After exact denominator clearing, every branch
has numerator Bernstein tensor degrees `(40,18,8,7)` and 56,088 entries; all
entries are nonnegative.  Every cleared denominator tensor is likewise
nonnegative.  All 16 branches pass.

## Replay

Run

```powershell
python .\replay_rank7_terminal_broom_delta5_large.py
```

The replay checks the half-retention factorizations, root/D6 concavity, D5
conditional concavity, all 16 branch markers and hashes, and the batch
manifest.  Its final marker is

```text
RANK7_TERMINAL_BROOM_DELTA5_LARGE_REPLAY_PASS
```

This theorem uses only the base half-retention cone; the stronger rooted
cross inequality `C7` is not needed for this coefficient.
