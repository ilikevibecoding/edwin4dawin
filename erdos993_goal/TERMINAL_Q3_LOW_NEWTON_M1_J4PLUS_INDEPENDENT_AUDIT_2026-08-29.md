# Independent audit: terminal-q3 tree Newton coefficient m=1, targets j>=4

Date: 2026-08-29

Status: `PASS_INDEPENDENT_EXACT_TREE_BASE_TERMINAL_Q3_LOW_NEWTON_M1_J4_PLUS_STRONG_INDUCTION_STEP_AUDIT`

## Exact scope

Let `G` be a tree of order `n>=15`, let `w` be marked, put `F=G-w`,
and let `j>=4` be supported (`i_j(F)>0`).  Inside the stated strong-
induction step on the strictly smaller forest `F`, the coefficient of
`binom(s,1)` in the normalized, untruncated terminal-q3 included-payment
margin is nonnegative.

This independent audit does **not** prove Newton degree `m=0`, a general
forest-base statement, the full terminal payment, unimodality, or Erdos
Problem 993.

The auditor imports no producer helper, symbolic formula object, Bernstein
coefficient, or literal value stream.  It reconstructs all formulas below
from the defining rows and uses different transformations from the producer:

1. midpoint interpolation for the quadratic `B2` Bernstein coordinate;
2. a sequential tensor power-to-Bernstein transform;
3. direct affine substitutions `u=x/2` and `u=(1+x)/2` for the `j=4`
   half-cells;
4. direct subset enumeration for the literal identity sample; and
5. vertex-deletion recursion plus a unique-edge identity for every tree of
   order 15.

## 1. Reconstructed terminal row

Write

```
N=n-1,                 rho=N-j,
F=G-w,                 H=G-N[w],
f_k=i_k(F),            h_k=i_k(H),
a=f_2,                 b=f_j>0,
y=h_j/b.
```

Let `z_k` count the `(k+1)`-subsets of `F` inducing exactly one edge.  With
`t=1+s` isolates, define

```
P(s)=i_3(G disjoint K_t),
R(s)=the one-edge four-set row of G disjoint K_t,
U(s)=i_(j+1)(G disjoint K_t),
c(s)=z_2+h_2+t*a,
e(s)=z_j+h_j+t*b,
A(s)=P(s)c(s)-aR(s),
Q(s)=(j+1)b(c(s)+R(s))-3(P(s)+a)e(s).
```

The normalized terminal row is exactly

```
Delta(s)=a[(j+1)A(s)U(s)+P(s)Q(s)].                 (1)
```

The degree-one Newton product kernel has entries `(0,1),(1,0),(1,1)`, each
of weight one.  Therefore

```
Delta_1/(ab)
 = (j+1)[A_0 U_1/b+A_1(U_0+U_1)/b]
   +(p_0 Q_1+p_1 Q_0+p_1 Q_1)/b.                   (2)
```

The audit reconstructs (1), takes the exact first difference between
`t=1` and `t=2`, and checks (2) for every literal cell.

## 2. Low coordinates and sign-sensitive substitutions

Put

```
d=deg_G(w),            S=N-d,
x_v=deg_G(v)-1,        B2=sum_v C(x_v,2),
W=N-1+B2,              R*=sum_(u adjacent w)(deg_G(u)-1).
```

Direct counting gives

```
p_0=N^3/6-N^2/2+N/3+W,
p_1=(N^2+N+2)/2,
R_1=N^2-2W,
a=C(N,2)-S,
z_2=S(N-2)-2[W-C(d,2)-R*],
h_2=C(S,2)-(S-R*),
c_0=a+z_2+h_2.                                      (3)
```

Writing `T_4(G)=N-2+B2+tau`, the rank-three motif identity gives

```
R_0=N C(N,2)-2[W(N-1)+C(N,2)-W]
    +3[N-2+B2+tau].                                (4)
```

Thus

```
A_0=p_0c_0-aR_0,
A_1=p_0a+p_1c_0+p_1a-aR_1.                         (5)
```

The pinned independent anchor-ordering certificate supplies
`A_0,A_1>=0`.

The sole inductive input is on `F`, which has one fewer vertex.  Strong
induction gives `q_j(F)<=q_3(F)` and the independently pinned all-forest
component lift gives `q_3(F)<=q_2(F)`.  Equivalently,

```
2a z_j <= j b z_2.                                 (6)
```

Hence

```
e_0/b <= 1+y+jz_2/(2a).                            (7)
```

The auditor differentiates the complete remainder in (2) before making
this substitution.  The adverse-slope magnitude is exactly

```
3p_1(2p_0+a+p_1)>0,                                (8)
```

so the upper endpoint in (7) is used in the correct direction.

## 3. Coupled extension floors

Root every component of `F` at its neighbour of `w`.  If `C_j` counts
blocked extensions of independent `j`-sets, the root-preserving incidence
injection gives

```
C_j <= 2[(j-1)b+h_j].                              (9)
```

The exact extension identity

```
(j+1)f_(j+1)=(N-j)b-C_j
```

and (9) give

```
f_(j+1)/b >= [N-3j+2-2y]/(j+1).                  (10)
```

Ordinary shadows give

```
f_(j-1)/b>=j/(rho+1),       h_(j-1)/b>=jy/rho.    (11)
```

Now

```
U_1=i_j(G)+i_(j-1)(G),
U_0=i_(j+1)(G)+i_j(G).
```

Using `i_k(G)=f_k+h_(k-1)`, (10), (11), and dropping only nonnegative
terms yields

```
U_1/b >= 1+j/(rho+1)+jy/rho,
U_0/b >= [N-2j+3+(j-1)y]/(j+1)+jy/rho.            (12)
```

The auditor symbolically rebuilds both expressions from (9)-(11), rather
than copying the producer's final rows.  It also verifies them cell by cell
in the direct subset replay.

## 4. Reduced four-set coordinate

Let

```
B3=sum_v C(x_v,3),
E=sum_(uv in E(G)) x_u x_v,
X=E-(N-2),
tau=B3+X.
```

The pinned tree path-surplus/Zagreb certificate and the elementary degree-
moment bound give

```
7X<=2(N-3)B2-6B3,
B3<=(N-3)B2/3.
```

Consequently

```
tau <= [2(N-3)B2+B3]/7 <= (N-3)B2/3.              (13)
```

The retained lower has exact `tau` derivative

```
3(j+1)(p_1-aU_1/b).
```

For `j>=4`, `rho+1<=N-3`, `a>=C(N-1,2)`, and

```
aU_1/b-p_1
 >= C(N-1,2)(N+1)/(N-3)-(N^2+N+2)/2
 =4/(N-3)>0.                                      (14)
```

Thus the derivative is negative and the upper endpoint (13) is again a
valid lower substitution.  The verifier derives the endpoint and the
margin `4/(N-3)` exactly.

## 5. Root box and y faces

For a non-star-centre root, `1<=d<=N-1` and connectivity gives
`1<=R*<=S`.  Since `sum_v x_v=N-1`, the three root-partition masses are

```
d-1, R*, S-R*.
```

Convex concentration of `C(x,2)` gives

```
C(d-1,2)
 <= B2
 <= C(d-1,2)+C(R*,2)+C(S-R*,2).                   (15)
```

The lower numerator is quadratic in `B2`; the audit retains all three
Bernstein rows.  It obtains them independently by evaluating the lower
endpoint, midpoint, and upper endpoint and using

```
b_1=2 f(midpoint)-(b_0+b_2)/2.
```

It then substitutes a fresh symbolic Bernstein parameter and proves that
the three reconstructed rows reproduce the original polynomial identically.

Always `0<=y<=1`, since `H` is induced in `F`.  In the high-root sector the
root-neighbour `j`-sets are disjoint from the `H` `j`-sets, giving the valid
simplification `y<=S/d`.  At `j=4,d>=4`, retaining the exact disjoint-family
bound gives

```
y <= C(S,4)/[C(S,4)+C(d,4)].                       (16)
```

The noncentre box is split exhaustively as

```
low root:  d=1+(N-2)u/2,       y in [0,1],
high root: S=1+(N-2)u/2,       y in [0,S/d],
R*=1+(S-1)v,                   0<=u,v<=1.           (17)
```

The omitted `d=N` boundary is exactly the marked star centre and is audited
separately.

## 6. Independent coefficient certificates

For `j>=5`, `rho>=1` and `j+rho>=15` are partitioned exactly into

```
rho=11+q, j=5+k, k,q>=0,
rho=1,...,10, j=15-rho+q, q>=0.                    (18)
```

After the three `B2` rows, two `y` faces, and the fresh tensor transform in
`(u,v)`, all power coefficients on the main cone and every strip are
nonnegative exact rationals:

- low-root sector: 132 coefficient families;
- high-root sector: 143 coefficient families;
- total: 275;
- independent stream SHA-256:
  `07815C81903F47D0829182FDF813897D524BAE6B19ACB1E3C33BE2E3D483F9E3`.

For `j=4`, `N=15+q`:

- `d=1,2,3`: 66 one-variable Bernstein coefficients, all nonnegative;
- `d>=4`: clear the positive denominator in (16), put
  `d=4+(N-5)u`, and directly substitute `u=x/2` and `u=(1+x)/2`;
- the two half-cells contain 352 tensor-Bernstein coefficients, all with
  nonnegative power coefficients in `q`;
- combined independent stream SHA-256:
  `A12CF317D050A82F538B5759727A34E3CF977575C9A3C29A3E20800D833A3504`.

The star-centre boundary is partitioned into one `rho=11+q,j=4+k` cone and
the eleven strips `rho=0,...,10`.  All 12 numerator polynomials have
nonnegative coefficients and positive denominators.  Independent stream
SHA-256:
`E3CADD90D1947F110C6879396C9871CC5BBA592DEDFD3A684EEC5BAFC0A62334`.

## 7. Literal identities and the order-15 boundary

The direct-subset oracle checks 97 trees, 759 roots, and 1,489 supported
`j>=4` cells, including 152 order-16 cells.  It independently enumerates
every subset inducing zero or one edge and verifies:

- the low-row identities (3)-(5);
- the exact first-difference form (1)-(2);
- the inductive inequality (6);
- both anchor signs;
- both coupled floors (12);
- the tau cap (13);
- the root box (15); and
- the final retained-lower comparison.

Literal stream SHA-256:
`5D8E1917EEF40ED165857E3163DEBE3A38A186E41235DB13A0B46B951DC9A1CB`.

The symbolic cones start at `N=15`, i.e. tree order `n=16`.  The auditor
therefore independently replays **every** unlabeled tree of order 15 using
a second oracle.  Its independence polynomial is computed by vertex
deletion.  Its one-edge polynomial uses the exact unique-edge identity

```
E_F(x)=sum_(uv in E(F)) x^2 I_(F-N[u]-N[v])(x).    (19)
```

A subset inducing one edge has a unique edge `uv`; its remaining vertices
form an independent set outside both closed neighbourhoods, so (19) counts
each such set exactly once.

Fresh order-15 results:

- 7,741 unlabeled trees;
- 116,115 rooted trees;
- 682,334 supported `j>=4` cells;
- 0 negative coefficients;
- 0 zero coefficients;
- minimum `984950800` at graph6 `NpCGP@??G?_@?@?CG??`, root 4, target 10;
- stream SHA-256:
  `708727F5ADED7C41B085841B7E2847E1DAAB24A279ACEF4905102FA17F24F93D`.

The separately pinned all-unlabeled-tree audit through order 15 also has
zero negative `m=1` coefficients over 13,188 trees and 188,260 roots.

## Frozen replay

- Independent auditor:
  `audit_terminal_q3_low_newton_m1_j4plus_independent_agent.py`
- Auditor SHA-256:
  `902F3670BE36B01F7AB1BA1B9638F5AF888BCD751BD67ECF19B936A6720EE18B`
- Independent report:
  `terminal_q3_low_newton_m1_j4plus_independent_audit_20260829.json`
- Report SHA-256:
  `4C73AC25F7E25AB5F5142E55107F3AE6AD1721272EDECB982866FFCED6C27DC5`

Run with `PYTHONHASHSEED=0` for deterministic SymPy factorization order.  The
auditor checks every dependency hash and PASS status, fails closed on every
identity and coefficient sign, and writes the report through an atomic
temporary-file replacement only after all checks succeed.

