# One-centre spider one-edge decomposition

Date: 2026-08-29

For a spider with centre `c` and arm subdivision counts `ell_i>=0`, put
`L_i=ell_i+1`.  Let `P_n` be the independence polynomial of the path on
`n` vertices, with the boundary convention `P_-1=P_0=1`.  Define

```text
H=product_i P_(L_i),
K=product_i P_(L_i-1),
Z_H=sum_i Z(P_(L_i)) product_(k!=i) P_(L_k),
Z_K=sum_i Z(P_(L_i-1)) product_(k!=i) P_(L_k-1),
J=sum_i P_(L_i-2) product_(k!=i) P_(L_k-1).
```

Here `Z(Q)` counts selected sets inducing exactly one edge by selected-set
size.  Splitting by whether the centre is absent, present with no incident
selected edge, or present with its unique incident selected edge gives the
all-order identities

```text
I_F=H+xK,
Z_F=Z_H+x Z_K+x^2 J.                              (1)
```

For a path on `n` vertices, direct block compression gives

```text
i_r=C(n-r+1,r),
z_r=r C(n-r,r),
q_r=(n-2r+1)/(n-r+1),
q_3-q_r=(r-3)(n+1)/((n-2)(n-r+1)).                (2)
```

The producer checked (2) through path order 80 in
6560 coefficient checks and
1482 exact cleared-gap checks.  It also
reconstructed (1) against an independent integer tree DP on
1364 small spider allocations, with
37316 literal coefficient checks.

This is a structural identity and a quantitative path lemma only.  It does
not prove a positive lower bound for `q3-q_j` on a multi-arm spider, the
terminal Newton `m=0` coefficient, or Erdos Problem 993.

Replay:

```powershell
python .\prove_d1_spider_one_edge_decomposition_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_D1_SPIDER_ONE_EDGE_DECOMPOSITION
```
