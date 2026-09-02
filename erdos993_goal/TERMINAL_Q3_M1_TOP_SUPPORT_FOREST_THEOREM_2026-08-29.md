# Terminal `q3` Newton `m=1`: the top-support disconnected-forest theorem

Date: 2026-08-29

Status: **proved, conditional only on the smaller-forest strong-induction
input `q_j(F)<=q_2(F)`.**

## Statement

Let `G` be a disconnected finite forest with no isolated component, mark a
vertex `w`, and put

```text
F=G-w,                 H=G-N_G[w].
```

Fix the top supported rank

```text
j=alpha(F)>=3.
```

Let `D_1(G,w,j)` be the degree-one Newton coefficient of the canonical
terminal-`q3` payment in the variable `s=t-1`.  Assuming the strong-induction
input

```text
q_j(F)<=q_2(F),
```

one has

```text
D_1(G,w,j)>=0.                                      (1)
```

The all-forest `q3<=q2` theorem and the forest anchor theorem used below are
already proved unconditional inputs, not additional conjectures.

## Canonical fixed-low rows

Write `|G|=N+1`, `h=c(G)-1>=1`, `m=N-h`, `d=deg_G(w)`,

```text
R=sum_(u~w)(deg_G(u)-1),
W=sum_v C(deg_G(v),2),
r=N-j,
y=i_j(H)/i_j(F).
```

Since `j=alpha(F)`, the exact domain includes

```text
1<=r<=j,  h+d<=j,  0<=y<=1,
0<=R<=m-d,
C(d,2)+R<=W<=C(m,2).                               (2)
```

The terminal low block stays fixed at ranks two, three, and four:

```text
a  = i2(F),
z2 = s3(F),
h2 = i2(H).
```

At `t=1`, put

```text
p0 = i3(G disjoint_union K1),
p1 = i2(G disjoint_union K1),
R0 = s4(G disjoint_union K1),
R1 = s3(G disjoint_union K1),
c0 = a+z2+h2.
```

Literal forest counting gives

```text
p0=C(N+1,3)-m(N-1)+W+C(N+1,2)-m,
p1=C(N+1,2)-m+N+1,
R1=mN-2W,
a =C(N,2)-(m-d),
z2=(m-d)(N-2)-2(W-C(d,2)-R),
h2=C(N-d,2)-(m-d-R).                               (3)
```

The verifier compares every field in (3), and the resulting `D_1`, directly
against the canonical `terminal_rows` implementation.  It does not substitute
target-dependent `i_(j-1)` data into the fixed low block.

## Exact reserve elimination

Define the two unconditional margins

```text
Gap=2*p1*c0-3*a*R1,
M  =3*p0*R1-2*p1*R0.
```

For disconnected `G`, the pinned forest-anchor proof gives `Gap>=0`; the
pinned all-forest `q3<=q2` theorem gives `M>=0`.  If

```text
A0=p0*c0-a*R0,
```

then direct elimination gives

```text
A0=(p0*Gap+a*M)/(2*p1),
R0=(3*p0*R1-M)/(2*p1).                              (4)
```

At top support, shadows give

```text
U0/b >= 1+y+j*y/r,
U1/b >= 1+j/(r+1)+j*y/r,                            (5)
```

where `b=i_j(F)`, `U0=i_(j+1)(G+K1)`, and
`U1=i_j(G+K1)`.  The exact cone certificate proves

```text
a*(U1/b)>=p1.                                       (6)
```

Combining (4)--(6),

```text
(U1/b)*A0+p1*R0
 >= 3*p0*R1/2.                                      (7)
```

This is the step that removes the otherwise unknown rank-four row `R0` while
preserving its correlation with `A0`.

Also

```text
A1=a*(p0+2*p1-R1)+p1*(z2+h2)>=0,
```

because `z2,h2>=0` and

```text
p0+2*p1-R1
=(N+1)(N^2-4N+24)/6+2(N+1)(h-1)+3W>0.              (8)
```

Finally the coefficient of the target one-edge ratio is exactly

```text
-3*p1*(2*p0+a+p1)<0.
```

Therefore the inductive bound

```text
e0/b<=1+y+j*z2/(2*a)                                (9)
```

has the required direction.

Substitution of (5), (7), and (9) into the exact Newton product formula
produces a cleared 959-term polynomial `L(j,r,h,d,R,W,y)` satisfying

```text
2*r*(r+1)*D_1/b >= L.                               (10)
```

The source derives (10) symbolically from the canonical degree-one product;
the expanded polynomial is never entered by hand.

## Exact positivity certificate

As a polynomial in `W`, `L` has degree two.  Its `W^2` coefficient is

```text
r(r+1)*(
 -10*d*j-16*d+2*h*j-16*h+j^3+2*j^2*r+13*j^2
 +j*r^2+5*j*r+36*j-8*r^2+24*r
).
```

It is nonnegative on (2).  After discarding that nonnegative square term,
the remainder is affine in `W`, concave in `R` at
`W=C(d,2)+R`, affine in `R` at `W=C(m,2)`, and affine in `y`.  Thus only the
eight `(y,W,R)` endpoint polynomials remain.

Put

```text
H=h-1, D=d-1, K=j-h-d, X=j-2=H+D+K.
```

For `X>=10`, write

```text
X=10+S,
h=1+X*u,
d=1+X*(1-u)*v,
r=1+(X+1)*w,
```

with `S>=0` and `(u,v,w)` in the unit cube.  Exact tensor-Bernstein
conversion proves that every coefficient of every power of `S` is
nonnegative for

```text
the W^2 coefficient,
the constant and y-slope of (6),
all eight endpoint polynomials.
```

There are 2,428 tensor-Bernstein coefficients and 26,180 power coefficients;
all are strictly positive, with minimum `1/120`.

For `5<=X<=9`, the verifier exhausts the exact integer strip

```text
H+D+K=X,
max(0,10-X)<=q=r-1<=X+1.
```

All 14,080 exact evaluations are positive.  If `N>=13`, top support implies
`X>=5`; hence the strip and the tensor cone cover every large-order case.
The pinned direct-canonical census supplies all supported cells with
`|G|<=13`.

As a literal convention check, the producer independently enumerates 1,059
top-support rooted cells through `|G|=10`.  Every reconstructed `D_1` equals
the canonical implementation and is positive; 1,047 cells also directly
check the reserve lower-bound direction.  The 12 small cells where (6) is
not yet valid are intentionally supplied by the finite theorem rather than
misrepresented as large-cone cases.

## Support-collapse corollary

Suppose adding a leaf bridge `uv` changes a supported source row
`i_j(F)>0` into `i_j(F+uv)=0`.  Then every independent `j`-set of `F`
contains both `u` and `v`.  If `alpha(F)>=j+1`, deleting `u` from an
independent `(j+1)`-set would leave an independent `j`-set avoiding `u`, a
contradiction.  Therefore

```text
j=alpha(F).
```

Thus (1) closes precisely the previously unsupported source boundary in the
leaf-bridge reduction.

## Frozen replay

```powershell
python .\prove_terminal_q3_m1_top_support_forest_agent.py
```

It must print

```text
PASS_EXACT_TOP_SUPPORT_DISCONNECTED_FOREST_M1_CONDITIONAL_Q_ENVELOPE
```

Frozen artifacts:

- `prove_terminal_q3_m1_top_support_forest_agent.py`, SHA-256
  `34C69C5A528D0F382B5F9A653EF80C79369CC28F5D16ADE2BE1B7F93A9E5FD55`.
- `terminal_q3_m1_top_support_forest_exact_agent_20260829.json`, SHA-256
  `A2BE8B254F1E28DAFF7EE3AB89D7ECC5FB2D38839309048E4496A1308EA6A0E9`.
- `derive_terminal_q3_m1_top_support_forest_agent.py`, SHA-256
  `6B632A9E9E01A4D0B3D00093138C61927A7C56319B3A38698EA2CC0A782BA46C`.

## Scope

This proves the top-support, no-isolate, disconnected-forest `m=1` lane under
the stated strong-induction `q` input.  It does **not** prove the non-top
forest `m=1` lane, forest `m=0`, the full `q_r<=q_3` envelope, unimodality, or
Erdos Problem 993.
