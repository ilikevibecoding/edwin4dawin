# Terminal q3 payment: exact Newton coefficient m=2 for target j>=4

Date: 2026-08-29

Status: **proved for every tree base of order at least 15 and every supported
target `j>=4`.**  The order-15 boundary is supplied by an independently
reconstructed exhaustive audit; the symbolic proof covers all larger orders.
Target `j=3` is a separate theorem.

This note proves one coefficient of one terminal payment.  It does not prove
the whole terminal payment, unimodality, or Erdős Problem 993.

## 1. Setup

Let `G` be a tree, mark `w`, and put

```text
F=G-w,             N=|F|=|G|-1,
H=G-N[w],          a=i_2(F),
b=i_j(F)>0,        y=i_j(H)/b.
```

The components of `F` are rooted at the neighbors of `w`, and `H` is obtained
by deleting those roots.  Thus `0<=y<=1`.

Write `s=t-1` and expand every polynomial in the Newton basis `C(s,m)`.  The
pinned terminal-tail identity is

```text
delta=(j+1)a A U+a P Q,
A=P c-a R,
Q=(j+1)b(c+R)-3(P+a)e.                         (1)
```

The original integer payment margin is `9 delta`, so signs agree.  Put

```text
W=sum_(v in V(G)) C(deg_G(v),2).
```

For a tree of order `N+1`, the first coefficients are

```text
p0=[P]_0=i_3(G)+i_2(G)=N^3/6-N^2/2+N/3+W,
p1=[P]_1=(N^2+N+2)/2,
p2=[P]_2=N+2,                                      (2)
R1=N^2-2W,
R2=N.
```

The excess degrees `deg_G(v)-1` sum to `N-1`, so

```text
N-1<=W<=C(N,2).                                    (3)
```

Also `F` has `N-deg_G(w)` edges, hence

```text
a=C(N,2)-N+deg_G(w)>=C(N-1,2).                     (4)
```

## 2. The refined rooted-incidence bound

For every independent `j`-set `S` of `F`, let `D_j` be the total selected
degree, summed over all such sets, and let `U_j` be the total number of
selected nonroots.

Every `(j+1)`-set inducing exactly one edge has exactly two endpoint
deletions.  Each deletion produces an independent `j`-set and an outside
vertex having exactly one selected neighbor.  Therefore, if `z_j` is the
number of one-edge `(j+1)`-sets in `F`, then

```text
2z_j <= D_j.                                        (5)
```

The pinned prescribed-root injection gives `D_j<=2U_j`.  Every independent
`j`-set not counted by `i_j(H)` contains at least one root.  Consequently

```text
U_j <= j b-(b-i_j(H))=(j-1)b+i_j(H),
z_j <= (j-1)b+i_j(H).                               (6)
```

With `e0=[e]_0=z_j+i_j(H)+b`, (6) gives the correlated upper bound

```text
e0/b <= j+2y.                                       (7)
```

This is sharper than replacing `i_j(H)` independently by `b`: the same `y`
will generate positive extension and shadow terms below.

## 3. The exact adverse remainder at m=2

Use `c0>=a`, `c1=a`, `R0>=0`, and the exact values in (2).  Coefficientwise,

```text
Q0 >= (j+1)ba-3e0(p0+a),
Q1 >= (j+1)b(a+N^2-2W)-3e0 p1-3b(p0+a+p1),
Q2  = (j+1)bN-3e0 p2-6b(p1+p2).                    (8)
```

The six nonzero product kernels at Newton degree two are

```text
kappa(0,2)=1,  kappa(1,1)=2,  kappa(1,2)=2,
kappa(2,0)=1,  kappa(2,1)=2,  kappa(2,2)=1.         (9)
```

Hence

```text
[P Q]_2 >= p0 Q2+2p1 Q1+2p1 Q2+p2 Q0+2p2 Q1+p2 Q2. (10)
```

Its derivative with respect to `e0` is negative.  The verifier checks the
manifestly positive opposite derivative

```text
-d/de0 [P Q]_2
 =3[p0p2+2p1^2+4p1p2+p2(p0+a)+p2^2].               (11)
```

It is therefore valid to substitute the upper bound (7).  Denote the
resulting normalized lower remainder by

```text
B2=(lower bound for [P Q]_2 after e0=b(j+2y))/b.    (12)
```

The producer records the full expanded integer polynomial for `B2` rather
than hiding it behind numerical evaluation.

## 4. Positive anchor and shadow payment

The pinned anchor-ordering theorem gives `A0>=0`, so the `A0 U2` term may be
dropped.  Directly from `A=P c-aR`, (2), and `c0>=a`,

```text
A1/a >= p0+2p1-R1=p0+N+2+2W,                       (13)
A2/a >= N^2+3N+8.                                   (14)
```

Put `r=N-j`.  The ordinary lower shadows in `F` give

```text
S1=f_(j-1)/b >= j/(r+1),
S2=f_(j-2)/b >= j(j-1)/[(r+1)(r+2)].                (15)
```

Assume first `r>=1`.  Since `H` has at most `N-1` vertices, downward shadow
counting inside `H` gives

```text
j i_j(H) <= (N-j)i_(j-1)(H),
H1=i_(j-1)(H)/b >= jy/r.                            (16)
```

The coupled rooted-forest extension theorem says

```text
(j+1)f_(j+1) >= (N-3j+2)b-2i_j(H).                 (17)
```

Using

```text
U0=f_(j+1)+i_j(H)+b+i_(j-1)(H),
U1=b+i_(j-1)(H)+f_(j-1)+i_(j-2)(H),
U2=f_(j-1)+i_(j-2)(H)+f_(j-2)+i_(j-3)(H),
```

and dropping only nonnegative terms yields

```text
U0/b >= [N-2j+3+(j-1)y]/(j+1)+H1,
U1/b >= 1+S1+H1,
U2/b >= S1+S2.                                      (18)
```

The retained product kernels are

```text
[A U]_2 >= 2A1(U1+U2)+A2(U0+2U1+U2).               (19)
```

Combining (13)--(19), put

```text
alpha1=p0+N+2+2W,
alpha2=N^2+3N+8,
U0bar=[N-2j+3+(j-1)y]/(j+1),

E=2 alpha1(1+2S1+S2+H1)
  +alpha2(U0bar+2+3S1+S2+3H1).                     (20)
```

Then (1) and (12) imply

```text
[delta]_2 >= a b { (j+1)a E+B2 }.                  (21)
```

It remains only to prove that the braced expression is nonnegative.

## 5. Exact integer-cone certificate

The expression in braces in (21) is affine in `a`.  Its `a`-slope is
bilinear in `(W,y)`.  After substituting the floor (4), the remaining
expression is also bilinear in `(W,y)`.  A bilinear function on a rectangle
is the bilinear interpolation of its four corner values.  Thus it suffices
to certify, both for the `a`-slope and for the value at `a=C(N-1,2)`, the
four corners

```text
y in {0,1},    W in {N-1,C(N,2)}.                  (22)
```

Set

```text
j=4+k,    N=j+r,    k>=0, r>=1,    k+r>=11.        (23)
```

The verifier clears the positive denominators exactly.  It covers (23) by

```text
r=11+q, k,q>=0,
```

and the ten strips `r=1,...,10`, where `k>=11-r`.  Every coefficient of
every cleared numerator is a strictly positive integer at all four corners,
for both the `a`-slope and the floor value.

If `r=0`, then `H` has fewer than `j` vertices, so `y=0`; no division by `r`
or `H`-shadow is used.  Rebuilding (20) without `H1`, putting `j=N=15+q`,
and checking the two `W` endpoints gives strictly positive coefficient
polynomials for both the `a`-slope and the floor value.

This proves (21) for every `N>=15`, or every tree base of order at least 16.

## 6. Boundary order 15

For `|G|=15` (`N=14`), the independently reconstructed exhaustive audit
enumerated every unlabeled tree, every marked vertex, and every supported
rank.  Across all orders through 15 it checked

```text
13,188 trees,
188,260 roots,
1,222,653 rank cells,
9,781,224 Newton coefficients.
```

There were zero negative `m=2` coefficients; the smallest was `19,746`
over the complete finite range (and is therefore positive at order 15 as
well).  Together with the infinite certificate, this closes every tree base
order `|G|>=15` for target `j>=4`.

## 7. Replayable artifacts

Producer:

- `prove_terminal_q3_low_newton_m2_j4plus_agent.py`
- SHA-256
  `15D2DDA0571B27B752774C2C55807DE54E146C676DFE2BB0BB3660C258CF7E65`
- report `terminal_q3_low_newton_m2_j4plus_exact_agent_20260829.json`
- report SHA-256
  `7DF40F60CAD088D731B7D30E6246E0FF542359A128578AE328D3EBC25C3152A4`
- status
  `PASS_EXACT_TREE_BASE_N15_PLUS_TERMINAL_Q3_LOW_NEWTON_M2_J4_PLUS`

The producer fails closed on the pinned terminal-tail identity, anchor
ordering audit, rooted component-surplus theorem, extension-floor note, and
independent finite low-Newton audit.

## Scope boundary

This theorem proves only Newton degree `m=2` for supported targets `j>=4`.
It does not prove target `j=3`, degrees `m=0,1`, the whole terminal payment,
unimodality, or Erdős Problem 993.
