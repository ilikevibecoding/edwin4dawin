# Terminal-q3 low Newton coefficient m=1 at targets j>=4

Date: 2026-08-29

Status: `PASS_EXACT_TREE_BASE_N15_PLUS_TERMINAL_Q3_LOW_NEWTON_M1_J4_PLUS_STRONG_INDUCTION_STEP`

## Scope

Let `G` be a tree of order `n>=15`, let `w` be a marked vertex, and put
`F=G-w`.  In the strong-induction step, assume the desired ratio bound on
strictly smaller forests.  Then, for every supported terminal target `j>=4`,
the coefficient of `binom(s,1)` in the normalized, untruncated terminal-q3
included-payment margin is nonnegative.

The induction use is noncircular: `F` has `n-1` vertices, so the induction
hypothesis gives `q_j(F)<=q_3(F)`; the pinned all-forest component-lift theorem
gives `q_3(F)<=q_2(F)`.  No assertion about `G` itself is fed back into this
coefficient calculation.

This note does **not** prove the general-root target `j=3` case, Newton degree
`m=0`, the full terminal payment, unimodality, or Erdos Problem 993.

## 1. Exact terminal row

Write

```
N=n-1,                 r=N-j,
F=G-w,                 H=G-N[w],
f_k=i_k(F),            h_k=i_k(H),
a=f_2,                 b=f_j>0,
y=h_j/b.
```

Let `z_k` denote the number of `(k+1)`-subsets of `F` inducing exactly one
edge.  With `t=1+s` isolates, define

```
P(s)=i_3(G disjoint K_t),
R(s)=(one-edge four-set row of G disjoint K_t),
U(s)=i_(j+1)(G disjoint K_t),
c(s)=z_2+h_2+t*a,
e(s)=z_j+h_j+t*b,
A(s)=P(s)c(s)-aR(s),
Q(s)=(j+1)b(c(s)+R(s))-3(P(s)+a)e(s).
```

The normalized terminal payment is exactly

```
Delta(s)=a[(j+1)A(s)U(s)+P(s)Q(s)].                 (1)
```

For Newton coefficients `X_m=[binom(s,m)]X`, the degree-one product kernel
has the three entries `(0,1),(1,0),(1,1)`, all of weight one.  Hence

```
Delta_1/(ab)
 = (j+1)[A_0 U_1/b + A_1(U_0+U_1)/b]
   +(p_0 Q_1+p_1 Q_0+p_1 Q_1)/b.                   (2)
```

The verifier reconstructs (1) and (2) literally from independent-set and
one-edge rows on every audited rooted tree.

## 2. Exact low coordinates

Put

```
d=deg_G(w),            S=N-d,
x_v=deg_G(v)-1,
B_2=sum_v C(x_v,2),    W=N-1+B_2,
R*=sum_(u adjacent w)(deg_G(u)-1).
```

The exact row identities are

```
p_0=N^3/6-N^2/2+N/3+W,
p_1=(N^2+N+2)/2,
R_1=N^2-2W,
a=C(N,2)-S,
z_2=S(N-2)-2[W-C(d,2)-R*],
h_2=C(S,2)-(S-R*),
c_0=a+z_2+h_2.                                      (3)
```

If `T_4(G)=N-2+B_2+tau`, the exact rank-three motif formula gives

```
R_0=N C(N,2)-2[W(N-1)+C(N,2)-W]
    +3[N-2+B_2+tau].                                (4)
```

Consequently

```
A_0=p_0 c_0-aR_0,
A_1=p_0 a+p_1 c_0+p_1 a-aR_1.                      (5)
```

The pinned anchor-ordering theorem gives `A_0,A_1>=0`.

## 3. The only inductive substitution

The strictly-smaller-forest inequality `q_j(F)<=q_2(F)` is exactly

```
2a z_j <= j b z_2.
```

Thus, with `e_bar=e_0/b`,

```
e_bar=1+y+z_j/b <= 1+y+j z_2/(2a).                 (6)
```

After division by `b`, the exact degree-zero and degree-one rows of `Q` are
bounded below by

```
Q_0/b=(j+1)(c_0+R_0)-3 e_bar(p_0+a),
Q_1/b=(j+1)(a+R_1)-3 e_bar p_1-3(p_0+a+p_1).       (7)
```

The derivative of the remainder in (2) with respect to `e_bar` is

```
-3 p_1(2p_0+a+p_1)<0,                               (8)
```

so substituting the upper bound (6) has the correct direction.

## 4. Coupled extension and shadow floors

Root every component of `F` at its neighbor of `w`.  The prescribed-root
incidence injection gives

```
D_j <= 2[(j-1)b+h_j].                               (9)
```

The exact extension count

```
(j+1)f_(j+1)=(N-j)b-C_j
```

and `C_j<=D_j` imply

```
f_(j+1)/b >= [N-3j+2-2y]/(j+1).                    (10)
```

Ordinary shadows in `F` and `H` give, for `r>0`,

```
f_(j-1)/b >= j/(r+1),
h_(j-1)/b >= jy/r.                                  (11)
```

Using the exact decompositions of `U_0,U_1` and dropping only nonnegative
terms yields the coupled floors

```
U_1/b >= 1+j/(r+1)+jy/r,
U_0/b >= [N-2j+3+(j-1)y]/(j+1)+jy/r.               (12)
```

Substituting (3)-(7) and (12) in (2) defines the exact sufficient lower
polynomial certified below.

## 5. The reduced four-set coordinate

Put

```
B_3=sum_v C(x_v,3),
E=sum_(uv in E(G)) x_u x_v,
X=E-(N-2),
tau=B_3+X.
```

For a tree of order `N+1>=16`, the pinned Zagreb estimate and the elementary
degree-moment estimate are

```
7X <= 2(N-3)B_2-6B_3,
B_3 <= (N-3)B_2/3.
```

Therefore

```
tau=B_3+X
 <= [2(N-3)B_2+B_3]/7
 <= (N-3)B_2/3.                                    (13)
```

The derivative of the retained lower with respect to `tau` is exactly

```
3(j+1)(p_1-a U_1/b).
```

For `j>=4`, `r+1<=N-3`, `a>=C(N-1,2)`, and

```
a U_1/b-p_1
 >= C(N-1,2)(N+1)/(N-3)-(N^2+N+2)/2
 =4/(N-3)>0.                                       (14)
```

Thus the slope is negative, and the upper endpoint (13) again gives a
valid lower bound.

## 6. Root-partition box

For `1<=d<=N-1`, connectivity gives `1<=R*<=S`.  Convex concentration of
the nonnegative integers `x_v` in the neighbor and farther groups gives

```
C(d-1,2)
 <= B_2
 <= C(d-1,2)+C(R*,2)+C(S-R*,2).                    (15)
```

The lower numerator has degree two in `B_2`; its three Bernstein
coefficients over (15), not merely its two endpoints, are retained.

Since `H` is induced in `F`, always `0<=y<=1`.  When `d>=S` and `h_j>0`,
necessarily `S>=j` and the `C(d,j)` root-only independent sets are disjoint
from the `h_j` sets.  Because `d>=S`, the binomial ratio gives the simpler
valid cap

```
y<=S/d.                                             (16)
```

The proof splits the root box at `d=N/2`:

```
low root:  d=1+(N-2)u/2,      y in [0,1],
high root: S=1+(N-2)u/2,      y in [0,S/d],
R*=1+(S-1)v,                  0<=u,v<=1.             (17)
```

The omitted endpoint `d=N` is a marked star center and is certified
separately, including its top-support case `r=0`.

## 7. Exact Bernstein certificates

For `j>=5`, the integer domain `r>=1`, `j+r>=15` is partitioned into

```
r=11+q, j=5+k, k,q>=0,
r=1,...,10, j=15-r+q, q>=0.                         (18)
```

After the three `B_2` Bernstein rows, the two `y` faces, and the tensor
Bernstein transform in `(u,v)`, every resulting polynomial is certified by
nonnegative exact rational coefficients on (18).  The low-root half has
132 coefficient families and the high-root half has 143; none fails.

The exceptional target `j=4` has `N=15+q`.  For `d=1,2,3`, the endpoint
cap `y<=1` gives 66 nonnegative Bernstein coefficients.  For `d>=4`, the
sharper disjoint-family cap is

```
y <= C(S,4)/[C(S,4)+C(d,4)].                        (19)
```

After clearing the positive denominator in (19), parameterizing
`d=4+(N-5)u`, and applying one exact de Casteljau split at `u=1/2`, all
352 tensor-Bernstein coefficients are nonnegative power polynomials in
`q`.  No finite tail patch is used.

The marked-star-center boundary is checked by one `r>=11` cone and the
eleven strips `r=0,...,10`; all twelve numerator polynomials are
coefficient-nonnegative with positive denominators.

## 8. Order boundary and literal replay

The symbolic proof covers `N>=15`, equivalently `n>=16`.  The pinned exact
all-unlabeled-tree audit supplies `n=15`, every root and every supported
rank, with zero negative `m=1` coefficients.

The producer also rebuilds the terminal rows by an independent tree message
recursion.  It checks (1)-(5), the induction inequality, the anchor signs,
the two coupled floors, the reduced-tau bound, and the final lower inequality
on its recorded literal sample.  Those replay counts and a hash of every
literal value are stored in the JSON report.

## Frozen replay

- Producer: `prove_terminal_q3_low_newton_m1_j4plus_agent.py`
- Producer SHA-256: `7349A169FBF406EADA042F8F47C78EA55CCA08E9E8A766A7C02C69291FA4DBC6`
- Report: `terminal_q3_low_newton_m1_j4plus_exact_agent_20260829.json`
- Report SHA-256: `D39FE1342650B9F7518AA0E05FB9D44353CAE57826E5F0B478520E56FD08B35A`
- This note SHA-256: recorded externally after the two placeholders above are replaced.

Run the producer with Python.  It fails closed on every pin, algebraic
identity, sign-sensitive derivative, cone or strip coefficient, Bernstein
coefficient, literal row identity, shadow/extension comparison, and status
check.  The JSON output is written to a temporary file and atomically
replaces the report only after every assertion passes.
