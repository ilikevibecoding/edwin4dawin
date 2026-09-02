# Terminal q3 payment: exact Newton-degree-3 theorem for target j>=4

Date: 2026-08-29

Status: exact proof for tree bases of order `n>=15` and supported targets
`j>=4`.  The target `j=3` is explicitly excluded and remains a separate
boundary.  This note does not prove Newton degrees `m=0,1,2`, the whole
terminal payment, forest-base closure, unimodality, or Erdős Problem 993.

## Statement

Let `G` be a tree of order `n>=15`, mark `w`, and put `F=G-w` and
`N=|F|=n-1`.  Let `j>=4` be supported, put `a=f_2(F)`, `b=f_j(F)>0`, and
`s=t-1`.  For the pinned terminal split

```text
delta=(j+1)a*A*U+L,       L=a*P*Q,
Q=(j+1)b(c+R)-3(P+a)e,
```

the coefficient of `binom(s,3)` in `delta` is nonnegative.

## 1. Tree bounds needed at Newton degree one

Write `W=sum_v binom(d_v,2)` for the wedge count of `G`, which has `N+1`
vertices and `N` edges.  If `x_v=d_v-1`, then `x_v>=0` and
`sum_v x_v=N-1`.  Therefore

```text
N-1 <= W=1/2 sum_v(x_v^2+x_v) <= N(N-1)/2.          (1)
```

The three-set motif identity and the fixed value `i_2(G)=binom(N,2)` give

```text
p_0=P_0=i_3(G)+i_2(G)
   =binom(N+1,3)-N(N-1)+W+binom(N,2).                (2)
```

Substituting the two endpoints in (1) into (2) proves

```text
(N-1)(N^2-2N+6)/6 <= p_0 <= N(N-1)(N+1)/6.         (3)
```

For the residual polynomial `R`, direct counting of one-edge triples gives

```text
R_1=N^2-2W>=N,             R_2=N.                   (4)
```

Pascal expansion gives

```text
P_1=(N^2+N+2)/2,           P_2=N+2,       P_3=1.   (5)
```

Writing `c_0=z_2+h_2+a>=a`, exact Newton multiplication in
`A=P*c-aR`, followed by (4)--(5), yields

```text
A_1 >= a[p_0+2P_1-R_1]
    >= a[(N-1)(N^2-2N+6)/6+N+2],
A_2 >= a(N^2+3N+8),
A_3 >= a(3N+10).                                  (6)
```

The last two bounds are the quantitative form of the pinned anchor.

## 2. Correct remainder bound

Put `e_0=z_j+h_j+b`.  The unconditional one-edge incidence theorem gives
`z_j<=jb`, while `h_j<=b`, so

```text
e_0<=(j+2)b.                                        (7)
```

Retaining `c_0>=a`, `c_1=a`, `R_1>=N`, and `R_2=N`, and discarding only
nonnegative terms, gives

```text
Q_0 >= (j+1)ba-3e_0(p_0+a),
Q_1 >= (j+1)b(a+N)-3e_0P_1-3b(p_0+a+P_1),
Q_2 >= (j+1)bN-3e_0P_2-6b(P_1+P_2),
Q_3  = -3[e_0+3b(P_2+1)].                           (8)
```

The nonzero Newton product kernels in `[P Q]_3` now give exactly

```text
[P Q]_3 >=
 p_0Q_3+3P_1Q_2+3P_1Q_3
+3P_2Q_1+6P_2Q_2+3P_2Q_3
+Q_0+3Q_1+3Q_2+Q_3.                                (9)
```

After substituting (7), the coefficient of `a` on the right of (9) is

```text
b[3(N+3)(j-2)-(2j+5)]>0                             (10)
```

for `N>=j>=3`, while the coefficient of `p_0` is negative.  Thus the valid
directions are the forest pair floor `a>=binom(N-1,2)` and the upper bound
for `p_0` in (3).  Using precisely those directions in (9) gives

```text
[P Q]_3 >= -(b/2)Q_3^*,                             (11)

Q_3^* = 15N^4+14N^3j+169N^3+89N^2j+689N^2
        +229Nj+1469N+316j+1948.
```

Consequently `L_3>=-(ab/2)Q_3^*`.

## 3. Positive anchor payment

Let

```text
B_1=(N-1)(N^2-2N+6)/6+N+2,
B_2=N^2+3N+8,
B_3=3N+10,
r=N-j,
R_2^*=j/(r+1),
R_3^*=j(j-1)/((r+1)(r+2)).                          (12)
```

Containment shadows give `U_0,U_1>=b`, `U_2>=bR_2^*`, and
`U_3>=bR_3^*`.  Retain these nine kernels in `[A U]_3`:

```text
(A_1,U_2),(A_1,U_3):                         3,3;
(A_2,U_1),(A_2,U_2),(A_2,U_3):               3,6,3;
(A_3,U_0),(A_3,U_1),(A_3,U_2),(A_3,U_3):     1,3,3,1.
```

Equations (6) and (12) imply `[A U]_3>=abE_3`, where

```text
E_3=3B_1(R_2^*+R_3^*)
   +B_2(3+6R_2^*+3R_3^*)
   +B_3(4+3R_2^*+R_3^*).                            (13)
```

Hence, using again `a>=binom(N-1,2)`, it is enough to prove

```text
2(j+1)binom(N-1,2)E_3-Q_3^* >=0.                   (14)
```

## 4. Exact integer-cone certificate

Set `j=4+k`, `N=j+r`, with `k,r>=0`.  Since `N>=14`, the domain is
`k+r>=10`.  Clearing the positive denominator in (14) gives

```text
2(r+1)(r+2).                                        (15)
```

The exact verifier partitions the domain into 12 pieces:

* for `r=11+q`, `k,q>=0`, the cleared numerator has 42 monomials, all
  positive, with minimum coefficient `1`;
* for each `r=0,...,10`, put `k=max(0,10-r)+q`.  Each resulting degree-eight
  polynomial in `q` has nine positive coefficients, again with minimum `1`.

This proves (14), so (11)--(14) prove `delta_3>=0` for every stated target.

## Replay and strict boundary

`prove_terminal_q3_low_newton_m3_j4plus_agent.py` reconstructs (1)--(15) in
exact SymPy arithmetic and asserts every algebraic identity, kernel, bound
direction, and integer-cone coefficient.  It also verifies that the coarse
sufficient inequality has negative coefficients when `j=3`; that target is
not silently included.

At freeze time:

```text
source SHA-256:
9B94CF67D89F162B21811B90DED6D6A120C639DDC9BEE25E3D60CC2E00C1684C

report SHA-256:
81F460E98578753735ED09A74F4B30F75A3B493CC04E9E2C86B2AF57B1AE2126

status:
PASS_EXACT_TREE_BASE_N15_PLUS_TERMINAL_Q3_LOW_NEWTON_M3_J4_PLUS
```
