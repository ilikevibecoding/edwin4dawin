# Forest terminal `m=1`, `j=3`: artificial-cap denominator

Date: 2026-08-29

Status: **independent exact auxiliary theorem for the `N>=31` structural
tail.**  This note proves denominator positivity only.

## Structural coordinates

Let

```text
h=1+H,  d=1+D,  N=2h+d+R+L,
H,D,R,L nonnegative integers.
```

Thus `N-3=2H+D+R+L`.  Put `S=N-d` and
`e_H=N-h-d-R`.  The fixed-edge triple upper and the coarse root-neighbor
class term are

```text
U3 = C(S,3)-e_H(S-2)+C(e_H,2),
B  = d C(S-1,2)-R(S-2)+C(d,2)S-(d-1)R+C(d,3).
```

## Exact positive decomposition

Direct expansion, checked symbolically from the definitions, gives

```text
6(U3+B) = R(R-1)(R+1) + P(H,D,R,L),
```

where all 29 ordinary-power coefficients of `P` are strictly positive.
In particular its linear terms include

```text
H + 5D + 2L.
```

The first summand is `6 C(R+1,3)` and is nonnegative for every integer
`R>=0`.  If `R>=2`, it is already positive.  If `R<=1` and `N>=31`, then

```text
2H+D+R+L=N-3>=28,
```

so at least one of `H,D,L` is positive and consequently `P>0`.  Therefore

```text
U3+B>0
```

throughout the `N>=31` structural cone.

## Conservative cap consequence

The ratio

```text
yhat=U3/(U3+B)
```

is therefore always defined.  When `B>=0`, it is the root-class cap.  When
`B<=0`, it satisfies `yhat>=1`; because both retained payment branches are
nonincreasing in `y`, evaluation at `yhat` is conservative relative to the
valid bound `y<=1`.  This consequence removes the need to split on the sign
of `B`, but positivity of the resulting two-branch maximum is a separate
obligation.

## Replay and scope

Run

```powershell
$env:PYTHONHASHSEED='0'
python prove_terminal_q3_m1_forest_j3_artificial_cap_denominator_independent_agent.py
```

The verifier reconstructs the displayed identity, checks all 29 positive
coefficients, checks the strictness argument's three linear coefficients,
and writes its report atomically.

This theorem does not prove the cap branch cover, forest `m=0`, the full
terminal payment, unimodality, or Erdős Problem 993.
