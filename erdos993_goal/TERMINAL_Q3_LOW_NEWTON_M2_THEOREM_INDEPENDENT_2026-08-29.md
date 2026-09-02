# Terminal-q3 low Newton coefficient m=2: exact all-order theorem

Date: 2026-08-29

Status: `PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M2_ASSEMBLY`

## Theorem

For every tree base `G` of order `n>=15`, every marked vertex, and every
supported terminal target rank `j>=3`, the coefficient of
`binom(t-1,2)` in the normalized, untruncated terminal included-payment
margin is nonnegative.

This is a theorem about the single Newton degree `m=2`.  It does not by
itself prove degrees `m=0,1`, the full terminal payment, unimodality, or
Erdos Problem 993.

## Exact rank partition

The supported ranks are the disjoint union of `j=3` and `j>=4`.

### Rank j=3

The independent rank-three proof uses exact rooted motif coordinates
`N,d,W,V,X,B,Y`.  After eliminating the adverse `V` variable with the
pinned Zagreb inequality, the lower margin is concave first in `X` and
then in the excess-wedge coordinate.  It is therefore enough to check four
endpoint polynomials.  Each has all 24 Bernstein coefficients strictly
positive after `N=15+r`.  A literal subset enumeration on all 92 unlabeled
trees of orders 4 through 9, all 743 roots and all 219,220 subsets verifies
the motif formulas independently.  The all-tree order-15 census supplies
the boundary `n=15`.

The full proof and replay are pinned below as the `j3` source, report and
theorem note.

### Ranks j>=4

Write `N=n-1`, `r=N-j`, `b=f_j`, and `y=h_j/b`.  Root every component of
the forest `F=G-w` at its vertex adjacent to `w`.  The prescribed-root
incidence injection sends every downward selected incidence injectively to
an upward selected incidence.  Consequently

```
D_j <= 2[(j-1)b+h_j].
```

The two endpoint deletions of every one-edge `(j+1)`-set give
`2z_j<=D_j`, hence

```
e_0/b <= j+2y.
```

Combining the exact extension double count with the same incidence bound
gives

```
U_0/b >= [N-2j+3+(j-1)y]/(j+1) + h_(j-1)/b.
```

For `r>0`, the ordinary shadow inequality in the root-deleted forest gives
`h_(j-1)/b >= jy/r`.  The two `F` shadows give

```
S_1=j/(r+1),  S_2=j(j-1)/[(r+1)(r+2)].
```

The exact `m=2` binomial-product kernels are

```
(0,2):1, (1,1):2, (1,2):2,
(2,0):1, (2,1):2, (2,2):1.
```

The anchor floors, preserving the common wedge coordinate `W`, are

```
A_1/a >= p_0+N+2+2W,
A_2/a >= N^2+3N+8,
a >= binom(N-1,2),
N-1 <= W <= binom(N,2).
```

After substitution, the normalized lower margin is affine in `a`, and both
its `a`-slope and its value at `a=binom(N-1,2)` are bilinear in `(W,y)`.
Every one of the four rectangle corners is coefficient-positive on the
complete integer domain `r>=1,j>=4,j+r>=15`: one high cone `r=11+q` and
the ten strips `r=1,...,10`.  When `r=0`, the root-deleted forest has order
less than `j`, so `y=0`; rebuilding without the `1/r` shadow gives positive
path/star endpoint polynomials for `j=N>=15`.

The independent auditor reconstructed every formula and every symbolic
corner without importing the producer.  It also realized the incidence
injection on all 79 atlas forests of orders at most 7, all 426 component-root
choices and 2,220 ranks (15,652 mapped downward incidences).  That atlas
run is a sanity audit only; the explicit injection and symbolic cone
certificates are the all-order proof.

## Order boundary

The symbolic arguments cover `N>=15`, equivalently `n>=16`.  The exact
all-unlabeled-tree census through order 15 covers `n=15`, every root and
every supported rank, with no negative `m=2` coefficient.

## Frozen replay chain

- `prove_terminal_q3_low_newton_m2_j3_independent_agent.py`
  SHA256 `6BE654DE92AD60C71BD3C1462EE215C32D31BF3E9C03B3A6F222BA25AF036864`
- `terminal_q3_low_newton_m2_j3_exact_independent_20260829.json`
  SHA256 `823677240E7B656958C34886E351F4B40A976A4AB5261E2FF5A50A9F8AA10FA2`
- `TERMINAL_Q3_LOW_NEWTON_M2_J3_THEOREM_INDEPENDENT_2026-08-29.md`
  SHA256 `63B04830E2C622706A0CBC063F304C319EFF39D407F4F89F81960FFCDA60BEB5`
- `prove_terminal_q3_low_newton_m2_j4plus_agent.py`
  SHA256 `15D2DDA0571B27B752774C2C55807DE54E146C676DFE2BB0BB3660C258CF7E65`
- `terminal_q3_low_newton_m2_j4plus_exact_agent_20260829.json`
  SHA256 `7DF40F60CAD088D731B7D30E6246E0FF542359A128578AE328D3EBC25C3152A4`
- `audit_terminal_q3_low_newton_m2_j4plus_independent_agent.py`
  SHA256 `DC0977DF1093D8E3D8AC5184711F2DC2005732E99AA491D3DCE9801094E54947`
- `terminal_q3_low_newton_m2_j4plus_independent_audit_20260829.json`
  SHA256 `B86F27D62203FCE62A4213B0D1AEF9BF30B35955C91FBC6A35A49A0A00BDF8ED`
- `assemble_terminal_q3_low_newton_m2_all_order_independent_agent.py`
  SHA256 `A6663061A40BA2188F9C3C4446E518E316C93642CB75E0058E18C0095056B759`
- `terminal_q3_low_newton_m2_all_order_independent_20260829.json`
  SHA256 `A670835BDE8CB91517F4FA4B99DD48F8F2E8AC6D14B6D8470713607309FDC08D`

Replay the two proof scripts, the independent `j>=4` auditor, and finally
the assembly script with Python.  Every script fails closed on a pin,
identity, inequality direction, symbolic coefficient, endpoint, or status
mismatch.
