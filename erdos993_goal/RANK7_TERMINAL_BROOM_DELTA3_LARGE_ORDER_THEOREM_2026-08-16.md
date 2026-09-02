# Rank-seven terminal-broom Delta-three theorem from order 39

Date: 2026-08-16

Status: **PROVED ALL-ORDER LARGE-ORDER THEOREM.**  This proves the third
Newton coefficient of the terminal-broom residual for every rooted tree core
of order at least 39.  Together with the separately replayed Delta-zero,
Delta-one, Delta-two, Delta-four, Delta-five, Delta-six, and high-coefficient
packages, this closes the terminal-broom residual for every rooted core of
order at least 39.  It does not settle core orders 19--38, the connected-tree
reserve `Q7`, or Erdos Problem #993.

## Theorem

For the exact terminal-broom residual `R_t` attached to any rooted tree core
`A` of order `n>=39`,

```text
Delta^3 R_1 >= 0.
```

## Base cone and endpoint reductions

Normalize `c3=1` and put

```text
w=c2/c3,                 x=c3/c4,
D4=1-c3*c5/c4^2,         x5=c4/c5=x/(1-D4),
D5=1-c4*c6/c5^2,         z=c5/c6=x5/(1-D5),
D6=1-c5*c7/c6^2,
s=h5/c5,                 d=h6/c6.
```

The proof uses

```text
3/(n-3) <= w <= 3(n-1)/((n-3)(n-4)),
8w/(6-w) <= x <= 4w/(3(1-w)),

(2+x)/10 <= D4 <= 1559/3575,
(2+x5)/12 <= D5 <= 1/6+x5/2,
(2+z)/14 <= D6 <= 1/7+z/2,

1/2 <= s,d <= 1.
```

The exact root-curvature replay proves separate concavity in `h5`, `h6`,
and `c7`.  The exact conditional-curvature replay reduces `D5` to its two
endpoints; its Delta-three cases use the proved `D5` upper bound and the
order-39 consequence `c5>=4c4`.  The full `D4` interval is retained as a
Bernstein coordinate.

Fifteen of the resulting sixteen `(D5,D6,s,d)` branches pass directly.  In
every passing branch, exact denominator clearing gives numerator tensor
degrees `(34,17,8,7)` and 45,360 nonnegative Bernstein entries.

## The sole rectangular enclosure failure

The raw branch `0010`, namely

```text
D5 lower, D6 lower, s=1, d=1/2,
```

has a negative Bernstein coefficient at index `(9,17,8,0)`.  Its exact log
is retained.  This is not a tree counterexample: with `J=A-N[q]`,

```text
c5-h5=i4(J),    c6-h6=i5(J),
```

so `s=1` forces `i4(J)=0`, hence `i5(J)=0` and `d=1`.

## Quantitative capacity repair

Let `m=|J|`.  Extension counting inside `J` gives

```text
5 i5(J) <= (m-4)i4(J).
```

Since `m<=n-2`,

```text
d >= 1-K(1-s),    K=(n-6)z/5.
```

Also `z>=6/(n-5)`, so

```text
K-1 >= (n-11)/(5(n-5)) > 0.
```

Put `s0=1-1/(2K)`.  On `1/2<=s<=s0`, separate concavity in `s,d`
reduces to the already-passing corners and the boundary point `(s0,1/2)`.
On `s0<=s<=1`, concavity in `d` reduces to `d=1` and to the capacity edge

```text
d=1-K(1-s).
```

The `d=1` face is controlled by the passing endpoints.  A single new exact
Bernstein certificate maps the full capacity edge using `n=39/T` and unit
coordinates for `w,x,D4,s`.  After exact denominator clearing, its numerator
tensor has degrees `(40,19,9,8,2)`, 221,400 entries, and minimum zero.  Thus
the entire capacity edge is nonnegative and the sole fake corner is repaired.

## Replay

Run

```powershell
python .\replay_rank7_terminal_broom_delta3_large.py
```

The replay checks half retention, root/D6 concavity, D5 conditional
concavity, all 15 raw passing logs and hashes, the exact quarantined
enclosure failure, and the fresh capacity-edge certificate.  Its final
marker is

```text
RANK7_TERMINAL_BROOM_DELTA3_LARGE_REPLAY_PASS
```
