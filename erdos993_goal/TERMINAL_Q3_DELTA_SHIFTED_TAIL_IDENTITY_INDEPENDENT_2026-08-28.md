# Shifted terminal-payment tail identity (independent scratch note)

Date: 2026-08-28

Status: exact algebraic reduction plus finite diagnostics.  This is not yet an
all-order proof of the terminal payment.

## 1. Normalized identity

For the terminal-support two-block split, put

```text
P(t) = [x^3](1+x)^t I_G(x),
U(t) = [x^(j+1)](1+x)^t I_G(x),
R(t) = [x^2](1+x)^t C_G(x),
a = f_2,                 b = f_j,
c(t) = alpha+t*a,        e(t) = beta+t*b,
alpha = C_(F,1)+h_2,     beta = C_(F,j-1)+h_j.
```

Then

```text
d0=3P,  d1=3a,  c0=R,  c1=c,
D0=(j+1)U,  D1=(j+1)b,
M1=(j+1)b*c-3a*e.
```

Consequently the untruncated payment margin is exactly

```text
Delta = 9*delta,
delta = P(P+a)M1-(j+1)(P*c-a*R)(P*b-a*U).                 (1)
```

This follows by direct substitution; no ratio division is used.

Set `t=1+s`, and write

```text
c=c_*+a*s,  e=e_*+b*s,
M1=M_*+(j-2)ab*s,
A=P*c-a*R,  W=P*b-a*U,  H=P(P+a).
```

If a subscript denotes an ordinary power coefficient in `s` (and an
out-of-range coefficient is zero), (1) gives

```text
delta_k = M_* H_k + (j-2)ab H_(k-1)
          -(j+1) sum_(r=0)^4 A_r W_(k-r).                (2)
```

Here `deg(P)<=3`, `deg(R)<=2`, `deg(A)<=4`, and `deg(H)<=6`.  Therefore,
for every `k>=8`, both low-degree terms in (2) vanish and `k-r>=4`, so the
`P*b` part of `W_(k-r)` also vanishes.  The whole high-degree tail reduces to

```text
delta_k = (j+1)a sum_(r=0)^4 A_r U_(k-r),   k>=8.        (3)
```

The independently audited anchor theorem proves `A_r>=0`.  Thus (3) is
nonnegative if the supported isolate-convolution coefficients `U_q` are
nonnegative.  Only powers `0<=k<=7` retain a separate correction term.

## 2. Exact coefficient condition for U

Writing `i_r=i_r(G)`,

```text
U(s) = sum_(q=0)^(j+1) i_(j+1-q) binom(s+1,q).
```

Hence

```text
[s^k]U = sum_(q=k)^(j+1) i_(j+1-q) theta(q,k),
theta(q,k)=[s^k]binom(s+1,q)
          =(-1)^(q-k)e_(q-k)(-1,0,1,...,q-2)/q!.
```

In particular, at target rank `r=j+1`,

```text
[s]U_r = i_(r-1)
         + sum_(q=2)^r (-1)^(q-2) i_(r-q)/(q(q-1)).     (4)
```

Equivalently, differentiation in the isolate parameter gives the compact EGF
identity

```text
[s^k]U_r(s)
 = 1/k! [x^r](1+x) I_G(x) log(1+x)^k.                  (4a)
```

The Pascal relation `U_r(s+1)=U_r(s)+U_(r-1)(s)` also shows that
coefficientwise positivity at the top supported rank `r=alpha(G)+1` implies
it at every lower rank: `U_(r-1)(s)=U_r(s+1)-U_r(s)`, and the forward shift
difference of a polynomial with nonnegative ordinary coefficients again has
nonnegative ordinary coefficients.

The required tree statement is only for supported ranks
`4<=r<=alpha(G)+1`.  It is not a formal property of arbitrary independence
polynomials.  For example the graph with independence polynomial
`(1+x)^4+9x` has, at `r=5`,

```text
U_5(s)=binom(s+5,5)+9binom(s+1,4)
      =s^5/120+s^4/2-s^3/24+3s^2/2+91s/30+1,
```

so its `s^3` coefficient is negative.  Any proof of the tree case must use
forest structure rather than only the existence of an independent
`(r-1)`-set.

The range cannot be extended even for trees.  For `P_5`, whose independence
row is `[1,5,6,1]` and whose independence number is three, the first rank
beyond the supported range is `r=5=alpha(P_5)+2`, and

```text
U_5(s)=-2s/15+s^2/3+5s^3/8+s^4/6+s^5/120.
```

Thus `r<=alpha(G)+1` is the exact plausible maximal statement; an all-rank
edge-deletion induction is unavailable.

## 3. Exact star equality

Let `G=K_(1,n-1)` and mark its center, so `F=(n-1)K_1` and `H` is empty.
At `t=1`, for `3<=j<=n-1`,

```text
P=binom(n,3),             a=binom(n-1,2),
U=binom(n,j+1),           b=binom(n-1,j),
R=0, c=a, e=b,
P/a=n/3,                  U/b=n/(j+1),
M1=(j-2)ab.
```

Substitution in (1) gives

```text
delta=a^2*b*P*(j-2),
Delta=9a^2*b*P*(j-2),
LHS/RHS=(P+a)/P=(n+3)/n.                              (5)
```

Thus the experimentally observed `(n+3)/n` lower ratio, if true in general,
is sharp on every centered star and every supported target rank.

## 4. Evidence and remaining obligation

The ordinary coefficients of `U_r(s)` were checked exactly for all unlabelled
trees through order 16 and every `4<=r<=alpha(G)+1`: 2,042,701 coefficient
checks, no negative coefficient, ordered diagnostic stream SHA-256
`15BE74054FD184D4588C41C7152B7036D3B3D910B89C88FAF2BEEB92716E98B3`.
Additional tests found no failure on paths and stars through order 120,
double stars with the first arm at most 30 and the second at most 50, or 7,200
seeded random labelled trees at orders 15, 20, 25, 30, 40, and 60.

The same sign survived every connected unlabelled bipartite graph through
order 11 (30,614 graphs and 846,397 coefficient checks), every labelled
bipartite incidence matrix with both color classes of size at most four
(70,510 matrices and 1,000,521 checks), and additional random bipartite and
triangle-free structured families.  These are diagnostics only.  A graph
with `alpha(G)>=|G|/2` need not satisfy the sign condition, so the large color
class alone is insufficient.

This evidence does not prove coefficientwise positivity of `U`.  A complete
terminal-payment proof still needs either:

1. an all-tree proof of the supported `U` coefficient signs plus proofs of
   the seven low powers in (2); or
2. a direct proof that the anchor-weighted convolution in (3) is nonnegative,
   together with the same low-power analysis.
