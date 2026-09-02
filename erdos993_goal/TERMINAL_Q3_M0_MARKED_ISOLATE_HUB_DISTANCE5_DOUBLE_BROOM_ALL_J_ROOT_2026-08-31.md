# Terminal q3 Newton m=0: hub-distance-five double brooms, all targets

Date: 2026-08-31

Let `T_(a,b,5)` be the tree whose two hubs are joined by a path of five
edges, with sorted pendant-leaf counts `a>=b>=1`.  This certificate proves
the isolated-marked-root terminal-q3 Newton `m=0` payment nonnegative at
every supported target `j>=3` for this connected remainder family.

Put `n=a+b`.  Exact deletion-state counting gives

```text
F_k = C(n,k)+4C(n,k-1)+3C(n,k-2)
    + C(a,k-1)+3C(a,k-2)+C(a,k-3)
    + C(b,k-1)+3C(b,k-2)+C(b,k-3)
    + [k=2]+2[k=3].
```

The unique-induced-edge row is reconstructed independently by literal
subset enumeration in the verifier.  Its formula is also evaluated directly
for a large exact grid of family members and targets.

For `j>=4`, normalize by `B=C(n,j-2)` and set

```text
rho=C(a,j-2)/B,   tau=C(b,j-2)/B,
u_a=a(a-1)/(n(n-1)),   u_b=b(b-1)/(n(n-1)).
```

The exact payment margin divided by `B` is affine in `(rho,tau)`.  The key
new input is a depth-sensitive hypergeometric cap.  For integers
`A>=k>=1`, `B>=1`,

```text
C(A,k)/C(A+B,k)
 <= (A/(A+B))^k
 <= A/(A+kB).
```

The first inequality follows factor by factor; the second is Bernoulli's
inequality.  This cap is exact at `k=1` and becomes stronger with target
depth, avoiding the false slack introduced by a fixed-order endpoint.

For the middle region `j>=5`, `b>=j-2`, write

```text
j=y+5,  b=q+y+3,  a=q+v+y+3,
k=j-4=y+1.
```

Then

```text
rho <= u_a (a-2)/(a-2+k b),
tau <= u_b (b-2)/(b-2+k a).
```

The four vertices of this containing rectangle have respectively 440,
1264, 1211, and 2073 numerator monomials; every coefficient is positive.
All reduced denominators also have positive coefficients.

For the tail `j>=b+3`, `tau=0`.  The zero endpoint has 427 positive
numerator monomials.  Where `rho` is active, write

```text
b=q+1,  j=q+y+4,  a=q+y+s+2,  k=j-4=q+y.
```

The same cap gives a 1213-monomial positive upper endpoint.  Its only
zero-denominator parameter is `(q,y,s)=(0,0,0)`, namely `(a,b,j)=(2,1,4)`;
that single exact cell is checked directly and has margin `62963292`.

At `j=4`, the exact middle weights `(u_a,u_b)` give a 90-monomial positive
seam.  The pinned universal `j=3` theorem supplies the remaining boundary.
Thus the exhaustive partition is

```text
j=3                              pinned universal boundary;
j=4, b>=2                        exact middle seam;
j>=4, j>=b+3, rho=0              tail lower endpoint;
j>=4, j>=b+3, rho>0              tail depth cap (one cell separate);
j>=5, b>=j-2                     middle depth-cap rectangle.
```

This closes one connected hub-distance-five remainder family.  It does not
by itself cover arbitrary trees or forests, nonisolated marked roots, the
complete terminal payment, or Erdős Problem #993.

Replay:

```powershell
python .\prove_terminal_q3_m0_marked_isolate_hub_distance5_double_broom_all_j_root.py
```

Required marker:

```text
PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE5_DOUBLE_BROOM_ROOT
```
