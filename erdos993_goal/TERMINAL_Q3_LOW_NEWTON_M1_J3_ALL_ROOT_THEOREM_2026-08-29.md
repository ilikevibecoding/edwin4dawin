# Terminal-q3 Newton m=1 at target j=3, every marked vertex

Date: 2026-08-29

Status: `PASS_EXACT_ALL_TREE_BASE_TERMINAL_Q3_LOW_NEWTON_M1_J3`

## Theorem

Let `G` be a tree of order `n>=15`, let `w` be any marked vertex, and put
`F=G-w`.  At terminal target `j=3`, the coefficient of `binom(s,1)` in the
normalized, untruncated terminal-q3 included-payment margin is nonnegative.

This closes target `j=3` at Newton degree `m=1` for every tree base.  It does
not prove Newton degree `m=0`, the corresponding general forest-base sector,
the full terminal payment, unimodality, or Erdos Problem 993.

## 1. Exact coefficient

Write

```
N=n-1,                 F=G-w,
H=G-N[w],              a=i2(F),
b=i3(F),               y=i3(H)/b.
```

Let `z_k` be the number of `(k+1)`-subsets of `F` inducing exactly one edge.
For `t=1+s` isolates define

```
P(s)=i3(G disjoint K_t),
R(s)=(one-edge four-set row of G disjoint K_t),
U(s)=i4(G disjoint K_t),
c(s)=z2+i2(H)+t*a,
e(s)=z3+i3(H)+t*b,
A(s)=P(s)c(s)-aR(s),
Q(s)=4b(c(s)+R(s))-3(P(s)+a)e(s).
```

The normalized payment is

```
Delta(s)=a[4A(s)U(s)+P(s)Q(s)].
```

If `X_m=[binom(s,m)]X`, the degree-one product kernel gives exactly

```
Delta_1/(ab)
 =4[A0 U1/b+A1(U0+U1)/b]
  +(p0 Q1+p1 Q0+p1 Q1)/b.                         (1)
```

The pinned anchor theorem supplies `A0,A1>=0`.

## 2. Root coordinates

Put

```
d=deg_G(w),            S=N-d,
R*=sum_(u adjacent w)(deg_G(u)-1),
B2=sum_v C(deg_G(v)-1,2),
W=N-1+B2,
P_F=W-C(d,2)-R*.
```

The exact low-row identities are

```
p0=N^3/6-N^2/2+N/3+W,
p1=(N^2+N+2)/2,
R1=N^2-2W,
a=C(N,2)-S,
z2=S(N-2)-2P_F,
i2(H)=C(S,2)-(S-R*),
b=C(N,3)-S(N-2)+P_F.                              (2)
```

If `T4(G)=N-2+B2+tau`, the exact rank-three motif formula also gives

```
R0=N C(N,2)-2[W(N-1)+C(N,2)-W]
   +3[N-2+B2+tau].                                 (3)
```

Equations (2)-(3) reconstruct `A0,A1` exactly.

## 3. The q-envelope substitution

The proved all-forest theorem `q3(F)<=q2(F)` is exactly

```
2a z3 <= 3b z2.
```

Consequently

```
e0/b=1+y+z3/b <= 1+y+3z2/(2a).                    (4)
```

The remainder in (1) decreases in `e0/b`, so substituting the right-hand
side of (4) gives a valid lower bound.  This step is unconditional: unlike
targets `j>=4`, it does not invoke the desired inequality at another rank.

## 4. Two compatible extension floors

Ordinary shadows and the prescribed-root extension injection give

```
U1/b >= 1+3/(N-2)+3y/(N-3),                       (5)

U0/b >= Uc=(N-3+2y)/4+3y/(N-3).                  (6)
```

There is a second, rank-four floor.  For a forest of order `N` with `S`
edges, `P_F` wedges, and `T3(F)` connected three-edge subtrees,
inclusion-exclusion gives

```
i4(F)=C(N,4)-S C(N-2,2)+P_F(N-4)+C(S,2)-T3(F).
```

Since `T3(F)<=C(S,3)`, define

```
f4_floor=C(N,4)-S C(N-2,2)+P_F(N-4)
         +C(S,2)-C(S,3),

Ur=f4_floor/b+1+y+i2(H)/b.                        (7)
```

Then `U0/b>=Ur`.  Hence the fixed convex combination

```
Ublend=(3Uc+Ur)/4                                 (8)
```

is also a valid lower bound.  Keeping (8) is what removes the false
piecewise crossing that appears if the two floors are optimized
independently.

## 5. Correlated four-set surplus cap

Orient every component of `F` away from its neighbor of `w`, and write
`x_v` for the outdegree.  Thus `sum x_v=S` and the root outdegrees sum to
`R*`.  Put

```
L=B2-C(d-1,2)=sum_(v in F) C(x_v,2),
B3'=sum_(v in F) C(x_v,3).
```

Splitting the whole-tree rank-four surplus at `w` gives

```
tau=C(d-1,3)+(d-2)(R*-1)+B3'
    +[E_F-(S-R*)],                                 (9)
```

where `E_F=sum_(p->u) x_p x_u`.  The integer identity

```
C(x,2)+C(y,2)-(x-1)y=C(x-y,2)>=0
```

implies

```
E_F-(S-R*)=sum_(p->u)(x_p-1)x_u <= 3L+3B3'.       (10)
```

Here a root contributes `x C(x,2)=3C(x,3)+2C(x,2)` and a nonroot
contributes one additional `C(x,2)`.  Finally

```
3B3'<= (S-2)L,                                     (11)
```

term by term.  Combining (9)-(11) yields the correlated cap

```
0<=tau<=C(d-1,3)+(d-2)(R*-1)
        +3L+4(S-2)L/3.                             (12)
```

For completeness, the lower endpoint has a short direct proof.  Delete the
leaves of `G` and let the remaining internal-vertex skeleton have weights
`x_v=deg_G(v)-1`.  If it has at least two vertices, every skeleton edge
satisfies

```
x_u x_v-1=(x_u-1)+(x_v-1)+(x_u-1)(x_v-1).
```

Thus its edge surplus pays at least
`sum_v(x_v-1)=number_of_leaves-2`, so `E>=N-2` and
`tau=B3+E-(N-2)>=0`.  If the skeleton has one vertex, `G` is a star and
the claim is immediate in the operative range.

## 6. The y cap and continuous root box

Since `H` has `S` vertices, `i3(H)<=C(S,3)`.  Moreover `P_F>=0`, and at
`P_F=0` one has

```
b-C(S,3)
 >= (d-2)[3N^2-3Nd-6N+d^2+5d]/6 >=0              (13)
```

for `d>=2`, `S=N-d>=1`.  Therefore

```
0<=y<=C(S,3)/b.                                    (14)
```

For `2<=d<=N-1`, connectivity and convex concentration give

```
1<=R*<=S,
C(d-1,2)<=B2<=C(d-1,2)+C(R*,2)+C(S-R*,2).         (15)
```

The proof maps this entire domain to a unit cube:

```
N=15+q,
d=2+(N-3)u,
R*=1+(S-1)v,
B2=C(d-1,2)+w[C(R*,2)+C(S-R*,2)],
q>=0,  0<=u,v,w<=1.                                (16)
```

After (4), (5), and (8), the retained lower in (1) is bilinear in `y`
and `tau`.  Its minimum on the realizable rectangle is therefore attained
at the four corners

```
y in {0,C(S,3)/b},
tau in {0,the cap in (12)}.                        (17)
```

## 7. Exact Bernstein certificate

The producer clears only the known-positive denominators

```
576*i2(F)*i3(F)*(N-2)
```

on the `y=0` faces and one additional factor `N-3` on the upper-`y`
faces.  It then applies the exact tensor-Bernstein transform in `(u,v,w)`.

The four faces have degrees `(7,6,3)`, `(7,6,3)`, `(8,6,3)`, and
`(8,6,3)`, for 952 Bernstein coefficients in total.  Every coefficient is
a polynomial in `q` with nonnegative rational power coefficients and at
least one positive coefficient.  No finite tail patch or numerical root
test is used.

## 8. Boundaries and literal replay

The marked-leaf case `d=1` is the separately frozen all-order theorem.
For the marked star centre `d=N`, the lower is exact and factors as

```
(4N^5+25N^4-37N^3+104N^2-72N+72)/[6(N-2)].
```

After `N=15+q`, its numerator is

```
4q^5+325q^4+10463q^3+167189q^2+1328073q+4200642,
```

which is coefficient-positive.  The complete exact all-unlabeled-tree
audit supplies tree order `n=15`, every root.

The producer also rebuilds independent-set and exactly-one-edge rows by a
tree message recursion.  It checks the raw Newton identity, (2)-(8), the
actual surplus bounds, and the final retained lower on small unlabeled and
larger deterministic structured/random trees.  These replay counts and an
ordered exact-value hash are stored in the JSON report.

## Frozen replay

- Producer: `prove_terminal_q3_low_newton_m1_j3_general_root.py`
- Producer SHA-256: `5C73254AB22746911187FFCF38E79560D9C250173969D92700AB1B752AD70E61`
- Report: `terminal_q3_low_newton_m1_j3_general_root_exact_20260829.json`
- Report SHA-256: `012F97B1DD1E7DC42C4733DB67F7C7D77B8F10D89E4198190B1EE08F0CA01385`
- This note SHA-256 is recorded externally after replacing the placeholders.

Run the producer with Python.  It fails closed on every pinned dependency,
symbolic identity, denominator, endpoint coefficient, finite-boundary status,
literal row identity, or structural comparison mismatch.
