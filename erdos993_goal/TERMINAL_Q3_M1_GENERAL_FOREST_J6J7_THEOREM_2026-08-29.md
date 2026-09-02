# Terminal `q3` Newton `m=1` for no-isolate forest bases, `j=6,7`

Date: 2026-08-29

Status: **proved for each supported target `j=6,7`, conditional on the
smaller-forest strong-induction input `q_j(F)<=q_2(F)`.**

## Statement

Let `G` be a disconnected finite forest with no isolated component, mark a
vertex `w`, and put `F=G-w` and `H=G-N_G[w]`.  For `j` equal to `6` or `7`,
assume `i_j(F)>0` and

```text
q_j(F)<=q_2(F).
```

Then the degree-one Newton coefficient `D_1(G,w,j)` of the canonical
terminal-`q3` payment is nonnegative.

The all-forest `q3<=q2` theorem and the forest-anchor theorem are unconditional
inputs.  The displayed `q_j` inequality is the only conditional input.

## Fixed low block and exact reduction

Write

```text
|G|=N+1, h=c(G)-1>=1, m=N-h, d=deg_G(w), r=N-j,
R=sum_(u~w)(deg_G(u)-1),
W=sum_v C(deg_G(v),2),
y=i_j(H)/i_j(F).
```

The low-rank quantities are fixed throughout:

```text
a=i2(F), z2=s3(F), h2=i2(H), c0=a+z2+h2.
```

At one terminal isolate let

```text
p0=i3(G+K1), p1=i2(G+K1),
R0=s4(G+K1), R1=s3(G+K1).
```

Literal forest counting gives

```text
p0=C(N+1,3)-m(N-1)+W+C(N+1,2)-m,
p1=C(N+1,2)-m+N+1,
R1=mN-2W,
a =C(N,2)-(m-d),
z2=(m-d)(N-2)-2(W-C(d,2)-R),
h2=C(N-d,2)-(m-d-R).
```

Define the forest-anchor and all-forest `q3<=q2` reserves

```text
Gap=2*p1*c0-3*a*R1,
M  =3*p0*R1-2*p1*R0.
```

The producer imports the already frozen `j>=8` exact algebra.  In particular,
it retains the positive `Gap` term and discards the `M` term only after
certifying `a*(U1/i_j(F))-p1>=0`.  It uses the inductive `q_j(F)<=q_2(F)`
bound in the adverse one-edge row and no stronger `q` statement.

## Structural domain

For a no-isolate disconnected forest,

```text
0<=R<=N-2h-d,
W>=C(d,2)+R,
W>=B:=N-2h-1,
W<=C(N-2h,2).
```

If `B>0`, then `1<=d<=B+1` and

```text
lambda=(d-1)/B in [0,1],
W>=lambda*C(d,2)+(1-lambda)*B.
```

The latter lower boundary is affine in `R`; this is the corrected component
endpoint reduction.  The face `B=0` forces `d=1` and `R=W=0` and is certified
separately.  Both denominator factors used to clear the lower bound are
positive on `N>=13`, `r>=1`.

## Exact all-order cone

The orders `|G|>=14` are parameterized by

```text
N=13+S,
r=13-j+S,
h=1+(10+S)u/2,
d=1+(10+S)(1-u)v,
```

where `S>=0` and `(u,v)` is in the unit square.  Then

```text
B=(10+S)(1-u),
N-2h-d=(10+S)(1-u)(1-v),
lambda=v
```

on `B>0`, so the map covers the relaxed structural domain for both fixed
targets.

For each `j=6,7`, the exact certificate checks the two `y` endpoints of the
`W^2` coefficient, the constant and slope in `y` of the `M` coefficient, the
two `B=0` faces, and all eight `(y,W,R)` endpoints of the remaining affine
lower.  Tensor-Bernstein conversion yields

```text
728 Bernstein coefficients,
8,204 power coefficients in S,
56 zero coefficients,
minimum positive coefficient 5/6.
```

Every coefficient is nonnegative.  The ordered coefficient stream has
SHA-256

```text
7EEE2C4907ED906C5473CD501AD8F2B35B20CBA17BE54E980FA309C5D93BD4CF.
```

## Finite complement

The exact direct-canonical all-forest theorem through `|G|=13` is pinned by
hash and status.  In that theorem the supported cell counts are

```text
j=6: 46,829,
j=7: 41,806,
all targets combined: 272,761 positive and 0 zero cells,
minimum all-target D_1: 2,400.
```

Thus the pinned finite theorem covers `N<=12`, while the tensor cone covers
`N>=13`; there is no order gap.

## Frozen replay

Run

```powershell
python .\prove_terminal_q3_m1_general_forest_j6j7_agent.py
```

It must print

```text
PASS_EXACT_GENERAL_NO_ISOLATE_FOREST_M1_J6J7_CONDITIONAL_Q_ENVELOPE
```

Frozen artifacts:

- `prove_terminal_q3_m1_general_forest_j6j7_agent.py`, SHA-256
  `749ED165466020E4662C57EEC7608475C04B069C8EF4B9985AF5697DF13BC8C7`.
- `terminal_q3_m1_general_forest_j6j7_exact_agent_20260829.json`, SHA-256
  `EF28F785962D2322B31E27FBE71836AB849A2B738C658E106B17F5886B30E4A6`.

The producer also pins the general symbolic reduction, the canonical row
implementation, the corrected forest-`m=2` canonical importer, the frozen
`j>=8` producer/report, and the finite direct-canonical theorem.

## Scope

This closes only no-isolate disconnected-forest `m=1` at targets `j=6,7`,
conditional on the stated smaller-forest `q` input.  Isolated components are
handled separately by the exact isolate-shift identity plus the corrected
forest-`m=2` theorem.  Targets `j=3,4,5`, forest `m=0`, the complete `q`
envelope, unimodality, and Erdos Problem 993 remain open.
