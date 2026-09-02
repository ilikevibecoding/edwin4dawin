# Canonical-H retained-Dprev reduction for d=1 terminal m=0

Date: 2026-08-29

Put `S=R+T`, `u=R-Y`, `g=T-Y`, and

```text
Hc=(1+x)^u P_(g+2)(1+2x)^(Y-1),  P=P_S.
```

Repeated endpoint joining gives the exact all-order identity

```text
Hc-P=x^2 Q,
Q=sum_(r=0)^(Y-2) P_(g+2r)(1+2x)^(Y-2-r)(1+x)^u
  +sum_(s=0)^(u-1) P_(g+2Y+s-2)(1+x)^(u-1-s).       (1)
```

Every first-sum term is a linear-forest row on `S-4` vertices; every
second-sum term is one on `S-3` vertices.  The frozen path-joining theorem
says every linear-forest row likelihood-ratio dominates the path of the same
order, and the path adjacent ratio increases with order.  Hence, for `j>=5`,

```text
D_(j+1) >= sigma D_j,  D=Hc-P,
sigma=[x^(j-1)]P_(S-4)/[x^(j-2)]P_(S-4),             (2)
```

with `sigma=0` when the denominator is unsupported.  Therefore, for every
`lead>=0` and every real `BH`,

```text
lead(Hc_(j-1)+Hc_(j+1))+BH Hc_j
 >= pathH + lead D_(j-1)+(BH+lead sigma)D_j.          (3)
```

The previous-rank gap is retained exactly.  This is essential: the former
reverse-only relaxation fails on top-support cells with `D_j=0` but
`D_(j-1)>0`.

The finite sign audit combines (3) with the exact critical-`Z` K lower from
the frozen one-step crossing theorem.  Its zero-negative result is bounded
evidence only.  Equations (1)-(3) are the all-order theorem; a separate
unbounded sign cone is still required before terminal Newton `m=0`, the full
terminal-payment theorem, or Erdős Problem #993 can be claimed.
