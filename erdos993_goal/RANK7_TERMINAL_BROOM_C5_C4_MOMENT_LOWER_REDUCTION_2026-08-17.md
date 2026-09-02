# Rank-seven terminal-broom joint `c5/c4` moment lower reduction

Date: 2026-08-17

Status: **proved exact reduction; not yet a positivity theorem for the
remaining `B2>=6` band**.

## Result

For a tree `A` of order `n`, write

```text
beta = sum_v C(deg(v)-1,2),
gamma = sum_v C(deg(v)-1,3),
E = sum_(uv in E(A)) (deg(u)-1)(deg(v)-1),
V = number of connected four-edge subtrees.
```

The exact rank-`(4,5)` motif identity is

```text
5(n-3)c5-(n-7)(n-8)c4
 = A(n) beta-B(n) gamma-C(n)(E-(n-3))
   +5(n-3)(V-(n-4)),

A(n)=3n^3/2-20n^2+133n/2-20,
B(n)=4n^2-35n+49,
C(n)=4n^2-30n+34.
```

The exact tree rank-four identity gives

```text
E-(n-3)=C(n-3,4)+(n-5)beta-gamma-c4.
```

Finally, the already-certified connected-four-subtree theorem gives

```text
V-(n-4)>=beta+gamma.
```

Substitution and exact simplification therefore prove

```text
5(n-3)c5-(n-7)(n-8)c4
 >= -(5/2)(n-6)(n-3)^2 beta
    +10(n-3)gamma
    -(4n^2-30n+34)(C(n-3,4)-c4).                 (1)
```

The coefficient of `gamma` is positive for every `n>=4`.  Consequently,
in the finite band `23<=n<=38`, (1) remains valid after substituting the
exact degree-partition floor

```text
gamma >= g_n(beta),
```

where `g_n` is obtained by enumerating the integer partitions of `n-2`
by the positive excess degrees `deg(v)-1`.  This is a degree-sequence
calculation, not a tree or root census.

## Effect on the preserved obstruction

The previous rooted-`c4` reduction retained an exact abstract negative
point at

```text
n=23, beta=20,
c4=660405825/126742,
c5=808963450/63371.
```

Here the exact degree floor is `gamma>=8`.  Formula (1) requires

```text
c5 >= 1832655243/126742,
```

which exceeds the point's `c5` by

```text
214728343/126742 > 0.
```

Thus the old point is rigorously excluded from the strengthened domain.
It was an enclosure failure, not a tree counterexample.

## Remaining obligation

The new lower endpoint must now be inserted into the joint rooted
`(A,A-q,A-N[q])` endpoint cone and all seven low terminal-broom
coefficients certified for `23<=n<=38`, `B2>=6`.  No such positivity claim
is made here.

## Replay

```powershell
python .\verify_rank7_terminal_broom_c5_c4_moment_lower.py
```

The replay writes
`rank7_terminal_broom_c5_c4_moment_lower_exact_20260817.json`.
