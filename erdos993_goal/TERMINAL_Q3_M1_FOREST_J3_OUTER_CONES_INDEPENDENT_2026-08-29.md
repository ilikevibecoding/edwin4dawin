# Forest terminal `m=1`, target `j=3`: corrected outer tail cones

Date: 2026-08-29

Status: **PASS independent exact outer-cone certificate.** This closes two
regions of the `N>=31`, `S>=5` forest tail. It does not close the middle
ratio interval, the short `S=2,3,4` strips, `m=0`, or Erdos Problem 993.

## Coordinates and domain

Use

```text
s=S-5,  D=d-1,  N=6+s+D.
```

Thus `N>=31` is the integer constraint `s+D>=25`. The remaining structural
coordinates are written as

```text
H=(S-2)u/2,
R=(S-2)(1-u)r,
L=(S-2)(1-u)(1-r),
0<=u,r<=1.
```

The proof uses the corrected correlated wedge interval

```text
C(d,2)+R+L <= W
 <= C(d,2)+R+L+C(R+1,2)+C(L+1,2),
```

with its affine parameter `0<=w<=1`. The tangent branch includes the missing
zero-root-neighbor reserve `P_4(S)=C(S-3,4)`.

Both retained row lower bounds are nonincreasing in `y=h_3/f_3`. They are
therefore evaluated at the already-certified conservative cap

```text
yhat=U3/(U3+B),  U3+B>0.
```

Every displayed polynomial below is multiplied by this positive denominator.

## Low-ratio tangent cone

The low-ratio region is

```text
D>=5s,  equivalently s/(s+D)<=1/6.                 (1)
```

For `s>=5`, substitute

```text
s=5+x,  D=5s+z,  x,z>=0.                           (2)
```

Compactify `x,z` independently and convert `u,r,w` to their exact Bernstein
bases. All 114,444 coefficients are nonnegative. The projective-boundary
zeros are harmless: every bounded-coordinate coefficient in the `(x,z)=(0,0)`
block is strictly positive, so the polynomial is strict for finite `x,z`.

For `s=0,1,2,3,4`, the tail constraint gives `D>=25-s`. Substitute
`D=25-s+z`. The five exact strips contain 6,732 Bernstein coefficients each;
all 33,660 are strictly positive, with minimum `1/288`.

Hence the tangent branch is strictly positive throughout (1).

## High-ratio coupled cone

The high-ratio region is

```text
5s>=3D,  equivalently s/(s+D)>=3/8.                (3)
```

Use the continuous tail parameterization

```text
N=31+E,
S=5+(25+E)v,
0<=E,  3/8<=v<=1.
```

On `3/8<=v<=1/2`, all 74,052 exact compactified-Bernstein coefficients are
strictly positive, with minimum `25/110592`. On `1/2<=v<=1`, all 74,052 are
nonnegative. Its 38 zeros lie only on the formal `E=infinity` layer; every
finite-`E` layer is strictly positive, with minimum `7/6912`. Therefore the
coupled branch is strictly positive throughout (3).

## Exact boundary left open

Together the cones close

```text
D>=5s  or  3D<=5s.
```

The exact remaining `S>=5` tail is

```text
5s/3 < D < 5s.                                     (4)
```

No claim about (4) is made here. The short `S=2,3,4` strips are also outside
this certificate.

## Pins

```text
prove_terminal_q3_m1_forest_j3_outer_cones_independent_agent.py
  897F0104E58616217912710051FA62857F1012E531FC0DCCA7AF517408D0DC76
terminal_q3_m1_forest_j3_outer_cones_independent_20260829.json
  A92F6C45F041ADC71AC5FA619BE3F604F1264208C9280DE68A245CEEE67B7587
```

The report contains the seven exact coefficient-stream hashes and pins every
formula dependency, including the independent `h4` path-floor certificate.
