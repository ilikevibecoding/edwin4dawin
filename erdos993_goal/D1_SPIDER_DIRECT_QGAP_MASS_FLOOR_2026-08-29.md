# Direct q-gap-mass floor for one-centre spiders

Date: 2026-08-29

Let `F=H+xK` be the exact one-centre-spider split at rank `j`, with
`h=H_j`, `k=K_(j-1)`, and `f_j=h+k`.  Let `u_H` be the all-order
linear-forest token cap for `H`, and let

```text
u_I=((j-1)u_K+R)/j
```

be the cap for the included-centre block; the extra `R` comes from the exact
incident-centre term `J_(j-1)<=R k`.  The one-edge decomposition gives

```text
f_j(q3-q_j) >= h(q3-u_H)+k(q3-u_I).                 (1)
```

At fixed `(R,T,Y)`, use the frozen coefficientwise endpoints

```text
Hconc_j <= h <= Hmax_j,
Kmin_(j-1) <= k <= Kmax_(j-1).                      (2)
```

Choose the lower or upper endpoint in each block according to the sign of
its slope in (1).  This gives an explicit all-order block floor `L_j`.
The legitimate smaller-forest strong-induction input `q_j(F)<=q3(F)` is
noncircular because `F` has one fewer vertex than the source tree; it gives
the combined quantitative floor

```text
f_j(q3-q_j) >= max(0,L_j).                          (3)
```

Zero H or K rows are handled literally, so (3) is not restricted to common
Hconc-supported ranks.

At the corrected N=315 obstruction, (3) gives
`27383891167237867351292633227688205009620065/5486427843`.  The bounded literal replay checked
1355 spiders and
6887 supported ranks.

This theorem is the direct quantitative reserve lemma only.  It does not
prove that the floor pays the terminal m=0 certificate at every unbounded
parameter value, does not cover `d>1`, and does not prove Erdos Problem 993.

Replay:

```powershell
python .\prove_d1_spider_direct_qgap_mass_floor_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_D1_SPIDER_DIRECT_QGAP_MASS_FLOOR
```
