# Terminal q3 payment: exact Newton m=2 theorem at j=3

Date: 2026-08-29

Status: `PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M2_J3`

## Claim and scope

For every supported terminal cell with target `j=3`, the coefficient of
`binom(t-1,2)` in the normalized untruncated terminal included-payment margin
is nonnegative.

This theorem closes only `(m,j)=(2,3)`. It does not claim target `j>=4`,
Newton degrees `m=0,1`, the complete terminal payment, or Erdos Problem 993.

## Exact rooted coordinates

Let `F=G-w`, `N=|F|`, and `d=deg_G(w)`. For the tree `G`, put

```text
W = sum_v binom(deg(v),2),
V = number of connected four-vertex subtrees,
X = sum_{v~w}(deg(v)-1),
B = sum_{v~w} binom(deg(v)-1,2),
Y = sum_{dist(w,u)=2}(deg(u)-1).
```

All seven coordinates are reconstructed directly from the marked tree. The
verifier derives `F` and `H=G-N[w]` without an imported terminal formula:

```text
|E(F)|=N-d,
W(F)=W-binom(d,2)-X,
V(F)=V-[binom(d,3)+B+(d-1)X+Y],

|V(H)|=N-d,
|E(H)|=N-d-X,
W(H)=W-binom(d,2)-B-X-Y.
```

For any forest with `v` vertices, `e` edges, `w` wedges, and `v4` connected
four-vertex subtrees, the needed exact motif identities are

```text
i3 = binom(v,3)-e(v-2)+w,
i4 = binom(v,4)-e*binom(v-2,2)+w(v-4)+binom(e,2)-v4,
s3 = e(v-2)-2w,
s4 = e*binom(v-2,2)-2[w(v-3)+binom(e,2)-w]+3v4.
```

These identities reconstruct every coefficient of `P,R,U,c,e`, then the
exact Newton product identity

```text
delta_2 = 4a[A*U]_2 + a[P*Q]_2,
Q=4b(c+R)-3(P+a)e.
```

The resulting polynomial is divisible by

```text
a=i2(F)=(N^2-3N+2d)/2 > 0.
```

## Exact reductions for N>=15

Write

```text
beta = W-(N-1) = sum_v binom(deg(v)-1,2).
```

The exact slope of `delta_2` in `V` is negative. After removing the positive
factor, its bracket is bounded below by

```text
21N^4+63N^3+138N^2-74N+252 > 0.
```

The slopes in `B` and `Y` are positive. Therefore a valid lower bound is
obtained by replacing `V` by an upper bound and setting `B=Y=0`.

The pinned Zagreb inequality, together with
`3B3<=(N-3)beta`, gives

```text
V <= N-2 + N*beta/3.                              (1)
```

After (1), the lower bound `L=delta_2/a` is a concave quadratic in `X`:

```text
[X^2]L = -12(N+2).
```

Since `X` counts distance-two vertices,

```text
0 <= X <= N-d.
```

It is therefore enough to check `X=0` and `X=N-d`. At either endpoint, `L`
is a concave quadratic in `beta`, with leading coefficient

```text
2(-26N^2-217N+36d-318)/3 < 0.
```

The degree-sum constraints give

```text
binom(d-1,2) <= beta
 <= binom(d-1,2)+binom(N-d,2).                    (2)
```

Thus (2) reduces the theorem to four polynomials in `N,d`. Each has degree
five in `d`. On the full real interval `1<=d<=N`, every one of its six
Bernstein coefficients becomes a coefficient-positive polynomial after
`N=15+r`, `r>=0`. There are 24 Bernstein coefficients total; each shifted
numerator has nine nonnegative terms and a strictly positive value at `r=0`.
The four exact coefficient-stream hashes are recorded in the JSON report.

This proves `N>=15`. The pinned exhaustive exact census of all 13,188
unlabeled trees through `|G|=15`, every marked root, and every supported rank
has zero negative `m=2` coefficients, covering `N<=14`.

## Independent identity audit

The verifier also enumerates all subsets in every unlabeled tree of orders
4 through 9. For all 743 marked roots, it computes the original terminal
margin at `s=0,1,2`, takes the exact second forward difference, and compares
it with the motif polynomial. All comparisons agree. This literal audit is a
check of the algebra; the all-order proof is the Zagreb/concavity/Bernstein
certificate above.

## Replay

```powershell
python .\prove_terminal_q3_low_newton_m2_j3_independent_agent.py
```

Expected status:

```text
PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M2_J3
```

Artifacts:

```text
prove_terminal_q3_low_newton_m2_j3_independent_agent.py
SHA256 6BE654DE92AD60C71BD3C1462EE215C32D31BF3E9C03B3A6F222BA25AF036864

terminal_q3_low_newton_m2_j3_exact_independent_20260829.json
SHA256 823677240E7B656958C34886E351F4B40A976A4AB5261E2FF5A50A9F8AA10FA2
```

The verifier fails closed on the pinned Zagreb theorem and the exact finite
low-Newton census hashes.
