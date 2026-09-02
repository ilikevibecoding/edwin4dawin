# Terminal `q3` Newton `m=1` for no-isolate forest bases, `j>=8`

Date: 2026-08-29

Status: **proved for every supported `j>=8`, conditional on the smaller-
forest strong-induction input `q_j(F)<=q_2(F)`.**

## Statement

Let `G` be a disconnected finite forest with no isolated component, mark
`w`, and put `F=G-w`, `H=G-N_G[w]`.  For every supported target `j>=8`, let
`D_1(G,w,j)` be the degree-one Newton coefficient of the canonical
terminal-`q3` payment.  Assuming

```text
q_j(F)<=q_2(F),
```

one has

```text
D_1(G,w,j)>=0.                                      (1)
```

The all-forest `q3<=q2` theorem and the forest-anchor theorem used below are
already proved unconditional inputs.

## Fixed low block and exact reserves

Write

```text
|G|=N+1, h=c(G)-1>=1, m=N-h, d=deg_G(w), r=N-j,
R=sum_(u~w)(deg_G(u)-1),
W=sum_v C(deg_G(v),2),
y=i_j(H)/i_j(F).
```

The fixed low block is

```text
a=i2(F), z2=s3(F), h2=i2(H), c0=a+z2+h2.
```

At one terminal isolate, set

```text
p0=i3(G+K1), p1=i2(G+K1), R0=s4(G+K1), R1=s3(G+K1).
```

Literal forest counting gives

```text
p0=C(N+1,3)-m(N-1)+W+C(N+1,2)-m,
p1=C(N+1,2)-m+N+1,
R1=mN-2W,
a =C(N,2)-(m-d),
z2=(m-d)(N-2)-2(W-C(d,2)-R),
h2=C(N-d,2)-(m-d-R).                               (2)
```

Define

```text
Gap=2*p1*c0-3*a*R1,
M  =3*p0*R1-2*p1*R0.
```

The pinned forest-anchor theorem gives `Gap>=0` for disconnected `G`; the
pinned all-forest `q3<=q2` theorem gives `M>=0`.  The exact correlated
elimination is

```text
x*A0+p1*R0
=3*p0*R1/2+p0*x*Gap/(2*p1)+(a*x-p1)*M/(2*p1),       (3)
```

where `A0=p0*c0-a*R0`.  Unlike an earlier failed relaxation, this proof
retains the explicit positive `Gap` term.

The shadow bounds used are

```text
x1=U1/b >= 1+j/(r+1)+j*y/r,
x0=U0/b >= (N-2j+3+(j-1)y)/(j+1)+j*y/r,             (4)
```

where `b=i_j(F)`.  The exact cone proves

```text
a*x1-p1>=0.                                         (5)
```

Thus the last term of (3) may be discarded only after (5), while the `Gap`
term remains.  Also `A1>=0`, and the target one-edge coefficient is adverse,
so the inductive input is used in the direction

```text
e0/b<=1+y+j*z2/(2*a).                               (6)
```

Substitution of (3)--(6) into the exact canonical degree-one Newton product
produces a cleared 2,312-term polynomial `L` with

```text
D_1/(a*b) >= L / [
 12*r(r+1)*(N^2-3N+2d+2h)*(N^2+N+2h+2)
].                                                  (7)
```

Both denominator factors are positive for `j>=8`, `r>=1`.

## Exact no-isolate component bounds

There are `h+1` nontrivial tree components.  Their edge counts are positive
and sum to `m=N-h`.

First, the other `h` components use at least `h` edges.  The marked
component therefore has at most `N-2h` edges, giving

```text
R<=N-2h-d.                                          (8)
```

For every nontrivial tree component,

```text
sum_v C(deg(v),2) >= sum_v(deg(v)-1)=n-2.
```

Summing gives

```text
W>=B:=N-2h-1.                                       (9)
```

At the root, independently,

```text
W>=C(d,2)+R>=A:=C(d,2).                             (10)
```

Convexity of `C(e_i,2)` over positive component edge counts gives

```text
W<=C(N-2h,2).                                       (11)
```

When `B>0`, put

```text
lambda=(d-1)/B.
```

Since `d<=N-2h=B+1`, `0<=lambda<=1`; hence (9)--(10) imply

```text
W>=lambda*A+(1-lambda)*B.                           (12)
```

The key final correction is that `A=C(d,2)` in (12), not
`C(d,2)+R`.  Consequently the lower `W` boundary is affine in `R`.  The
earlier `R`-dependent lower produced a mixed-curvature quadratic and is
explicitly retracted.

For `B=0`, (8)--(11) force `d=1`, `R=W=0`; that face is certified separately.

## Tensor-Bernstein certificate

Put `E=N-9>=0` and write

```text
j=8+E*w,
r=1+E*(1-w),
h=1+(E+6)u/2,
d=1+(E+6)(1-u)v,
```

with `(u,v,w)` in the unit cube.  Then

```text
B=(E+6)(1-u),
N-2h-d=(E+6)(1-u)(1-v),
lambda=v
```

on `B>0`, so the map covers the entire relaxed structural domain.

The `W^2` coefficient of `L` is nonnegative at both `y=0,1`.  After that
square is discarded, `L` is affine in `W`, affine in `R` at both boundaries
from (11)--(12), and affine in `y`.  It therefore suffices to certify:

```text
the two y-endpoints of W^2,
the constant and y-slope of (5),
the two B=0 faces,
the eight (y,W,R) endpoints.
```

Exact tensor-Bernstein conversion gives 1,448 coefficients and 17,038 power
coefficients in `E`.  All are nonnegative; 112 are zero and the minimum
strictly positive coefficient is `1/21`.  The ordered coefficient stream is

```text
2BCC0944F68DFB098EE9DAE89053D9C7BEA6E3F0CF2A1BB7803C75C210AC5E76.
```

The canonical cross-check exhausts 152 supported `j>=8` rooted cells in
no-isolate disconnected forests through `|G|=11`.  Every locally rebuilt
`D_1` equals the canonical `terminal_rows` value, every lower-bound direction
holds, and the minimum actual value is `25,726,944`.

## Retracted intermediate routes

Two exploratory relaxations are not part of the theorem:

1. Dropping the explicit `Gap` reserve admitted a false long-path `y=0`
   face and gave a negative leading term.
2. Using the `R`-dependent lower `A=C(d,2)+R` made the cleared lower boundary
   quadratic in `R` with mixed curvature.  Endpoint-only checking there was
   invalid and is retracted.

The frozen producer uses neither route.

## Frozen replay

```powershell
python .\prove_terminal_q3_m1_general_forest_j8plus_agent.py
```

It must print

```text
PASS_EXACT_GENERAL_NO_ISOLATE_FOREST_M1_J8PLUS_CONDITIONAL_Q_ENVELOPE
```

Frozen artifacts:

- `prove_terminal_q3_m1_general_forest_j8plus_agent.py`, SHA-256
  `3854DA3117F6BB8653E1D98495866121D2C2DA92A077EA741C5FFBDF981D1BCE`.
- `terminal_q3_m1_general_forest_j8plus_exact_agent_20260829.json`, SHA-256
  `60F970B393314511563BFA6D18CDFD27554659EB7EEAC0EFDE009ACE81FEB667`.
- `derive_terminal_q3_m1_general_forest_agent.py`, SHA-256
  `348DB21007B705120538CBA087D67DA40C97295CEA522523A6105078074A1A4C`.

## Scope

This closes the no-isolate disconnected-forest `m=1` lane for every
supported `j>=8`, conditional on the stated smaller-forest `q` input.  The
fixed ranks `j=3,4,5,6,7`, forest `m=0`, the complete `q` envelope,
unimodality, and Erdos Problem 993 remain open.
