# Forest terminal `m=1,j=3`: exact `S>=5,N>=31` tail

Date: 2026-08-29

Status: **PASS independent exact tail certificate.** Together with the frozen
outer-cone theorem, this proves the terminal `m=1,j=3` row for every
no-isolate disconnected forest in the `S>=5,N>=31` tail. It does not prove
the `S=2,3,4` strips, the finite `N=13,...,30` boundary, `m=0`, or Erdős
Problem 993.

## 1. Structural coordinates

Let `G` be a forest of order `N+1`, with `h+1` components, no isolated
component, and `h>=1`. Mark a vertex `w` and put

```text
d = deg_G(w),
R = sum_(v~w)(deg_G(v)-1),
H = G-N[w],
S = |H| = N-d,
W = sum_v C(deg_G(v),2),
L = N-2h-d-R.
```

The complete vertex budget is

```text
S=2h+R+L.                                           (1)
```

For `S>=5`, every integral structural tuple is contained in the simplex

```text
h=1+(S-2)u/2,
R=(S-2)(1-u)rho,
L=(S-2)(1-u)(1-rho),
0<=u,rho<=1.                                        (2)
```

The independently frozen lower and upper wedge lemmas give

```text
C(d,2)+R+L <= W
 <= C(d,2)+C(R+1,2)+C(L+1,2).                      (3)
```

For integral `R,L`, the width of (3) is `C(R,2)+C(L,2)>=0`. We write `W`
as the affine interpolation of these endpoints with `0<=w<=1`. The
certificate proves the resulting larger continuous relaxation, so every
structural integral point is covered.

## 2. Exact row identity

Write `m=N-h`. Direct subset counting gives the following fixed-low and
target-rank coordinates:

```text
p0=C(N+1,3)-m(N-1)+W+C(N+1,2)-m,
p1=C(N+1,2)-m+N+1,
R1=mN-2W,
a=C(N,2)-(m-d),
z2=(m-d)(N-2)-2(W-C(d,2)-R),
h2=C(S,2)-(m-d-R),
c0=a+z2+h2,
b=C(N,3)-(m-d)(N-2)+W-C(d,2)-R.                   (4)
```

On a supported target row, `b>0`. Put

```text
A1=p0*a+p1*c0+p1*a-a*R1,
g=2*p1*c0-3*a*R1,
y=h3/b,
ebar=1+y+3*z2/(2a),
Q0=4*c0-3*ebar*(p0+a),
Q1=4*(a+R1)-3*ebar*p1-3*(p0+a+p1),
Q=p0*Q1+p1*Q0+p1*Q1.                               (5)
```

The exact target-`j=3` extension identity is `U1=p0/b`. After the previous
terminal-payment reduction, either of the following valid lower bounds for
`U0` may be inserted:

```text
U0_c=(N-3+2y)/4+3y/(N-3),                           (6)
U0_t=1+y+(h2+f4_lower)/b.                           (7)
```

For either choice, the normalized row lower is

```text
Phi=4*(3*p0*R1/2
       +p0*U1*g/(2*p1)
       +A1*(U0+U1)) + Q.                            (8)
```

The verifier reconstructs (4)--(8) without importing any exploratory
producer. It clears (8) by

```text
2*a*p1*b*(N-3),                                     (9)
```

which is positive on every supported row in this domain. Expanding (9)
gives exactly the four `common` terms and the selected `U0` term in the
source. Thus positivity of the cleared polynomial proves `Phi>0` with no
change of sign.

## 3. The two exact caps for `y`

Both retained row bounds are affine and nonincreasing in `y`; this is the
content of the pinned all-order slope theorem.

For the coupled bound, let `e_H=m-d-R` and define

```text
U3=C(S,3)-e_H(S-2)+C(e_H,2),
B=d*C(S-1,2)-R(S-2)+C(d,2)S-(d-1)R+C(d,3).         (10)
```

The fixed-edge cap is

```text
y <= U3/(U3+B).                                     (11)
```

The denominator theorem proves `U3+B>0`. If `B<=0`, the right side of
(11) is at least one and remains conservative; if `B>=0`, it is the genuine
fixed-edge cap. The verifier evaluates the affine row at (11) by multiplying
through by the positive denominator.

For the tangent bound, the pair-exclusion lemma gives

```text
y <= (S-2)/(S-2+3(d-2)).                            (12)
```

The denominator in (12) is positive in the middle tail (`d>=2,S>=5`). The
verifier again clears it directly, so no division or floating arithmetic is
used.

## 4. Rank-four floors retained in the tangent branch

The classes using at least one root neighbor have the baseline lower

```text
T4=d*C(S-2,3)-R*C(S-3,2)
   +C(d,2)*C(S-1,2)-(d-1)R(S-2)
   +C(d,3)S-C(d-1,2)R+C(d,4).                      (13)
```

Two zero-root-neighbor floors are used on separate boxes:

```text
h4 >= C(S-3,4),                                     (14)
4h4 >= (h+R-3)h3.                                  (15)
```

(14) is the independently replayed path-minimality theorem. For (15), `H`
has `h+R` components. From each independent triple of `H`, selecting a
vertex in a component not met by the triple gives at least `h+R-3`
extensions; each independent four-set is counted at most four times. If
`h+R<3`, the right side is negative and (15) is immediate. Hence (15) is
all-order without a hidden support assumption.

For the correlated boxes let

```text
Qfloor=W-C(d,2)-R-C(L+1,2),
gamma=(3S-R-10)/3+d-2.                              (16)
```

The root-group wedge theorem proves that (13) may be strengthened by

```text
gamma*Qfloor+C(R,2).                                (17)
```

Indeed the actual group wedge count is at least `Qfloor`, and `gamma>=0`
on this domain. Formula (17) is retained even when `Qfloor<0`; doing so is
only a weaker valid lower bound.

Thus the tangent source uses exactly one of

```text
f4_lower=T4+C(S-3,4),
f4_lower=T4+(h+R-3)by/4+(17),
f4_lower=T4+C(S-3,4)+(17).                          (18)
```

## 5. Exact cone cover

Put

```text
s=S-5,  D=d-1,  N=6+s+D.                           (19)
```

The tail condition is `s+D>=25`. The frozen outer theorem already proves

```text
D>=5s  or  D<=5s/3.                                (20)
```

Only `5s/3<=D<=5s` remains (including harmless overlaps at the endpoints).

### All-order part, `s>=10`

Set `s=10+x`, `x>=0`, and parameterize `D/s` affinely. The following four
exact Bernstein nets are strictly positive:

| ratio box | retained row/floor | coefficients | exact minimum |
|---|---|---:|---:|
| `5/3 <= D/s <= 2` | coupled, fixed-edge cap | 114,444 | `1717986918400/1162261467` |
| `2 <= D/s <= 17/4`, `rho<=1/2` | tangent, path | 56,700 | `59049/16` |
| `2 <= D/s <= 17/4`, `rho>=1/2` | tangent, component plus (17) | 60,480 | `85293/32` |
| `17/4 <= D/s <= 5` | tangent, path plus (17) | 56,700 | `245855885658356673/4294967296` |

Total: **288,324 exact coefficients, zero negative, zero zero.** The direct
coefficient-stream hash is

```text
6A9E716D0C9839055B6CD2E6664328DC60929855E3C42FC60FC8F7CED14C5226.
```

### Integer boundary, `s=5,...,9`

For fixed `s`, (19) requires `D>=25-s`, while the middle interval has
`D<5s`. Therefore the exact boundary contains

```text
sum_(s=5)^9 (5s-(25-s)) = 85                       (21)
```

integer `(s,D)` cells. The verifier applies the coupled row for `D/s<2`,
the two `rho` halves for `2<=D/s<=17/4`, and the path-plus-(17) row above
`17/4`. This produces 145 exact row nets containing **36,828 coefficients**.
All are strictly positive; their minimum is `2380862741330144736`. The
direct stream hash is

```text
3A1398DC1FA31C342E1E769C654741BF973EEC771A3B1D2F157A789B9815528F.
```

For `s=0,...,4`, the tail constraint forces `D>=25-s>5s`, so (20) already
covers every cell. Hence (20), the 85 boundary cells, and the four all-order
nets cover every `S>=5,N>=31` structural point.

## 6. Why the coefficient check is all-order

For a polynomial `P(x,t,u,rho,w)` of degree `q` in `x`, the verifier forms

```text
(1-z)^q P(z/(1-z),t,u,rho,w),  0<=z<1,              (22)
```

by dividing the coefficient of `x^k` by `C(q,k)`. It then converts each of
`t,u,rho,w` exactly to its Bernstein basis on `[0,1]`. Every coefficient is
an exact FLINT rational. Strict positivity of the complete Bernstein net
proves positivity for every finite `x>=0` and every bounded coordinate; no
finite cutoff or floating comparison enters the all-order part.

## 7. Exact scope and remaining gate

This closes the remaining **disconnected-forest `m=1,j=3`, `S>=5,N>=31`
tail gate**. Before all-order forest `m=1,j=3` can be declared closed, the
separate `S=2,3,4` strips and the finite `N=13,...,30` boundary must still be
proved. This note makes no claim about `m=0` or the full conjecture.

## 8. Replay and pins

```powershell
$env:PYTHONHASHSEED='0'
python prove_terminal_q3_m1_forest_j3_s5_tail_independent_agent.py
```

The verifier checks every dependency hash and status, enforces both frozen
coefficient-stream hashes and counts, and writes its report atomically.

```text
prove_terminal_q3_m1_forest_j3_s5_tail_independent_agent.py
  A27C3CEF834A6E6DD78430A47241F89F18BEB383E706E3F84DCA501D495F56EE
terminal_q3_m1_forest_j3_s5_tail_independent_20260829.json
  4AB0FF2B94BFD50767F102E454E5BC603D38710EE709A7F9BB63506F397A9014
```
