# Terminal q3 Newton m=0: hub-distance-seven double-broom middle targets

Date: 2026-08-31

Let `T_(a,b,7)` be the tree whose two hubs are joined by a path of seven
edges, with sorted pendant-leaf counts `a>=b>=1`.  This certificate proves
the isolated-marked-root terminal-q3 Newton `m=0` payment positive at every
middle target

```text
j>=4 and b>=j-2.
```

Put `n=a+b`.  Exact deletion-state counting gives

```text
F_k = C(n,k)+6C(n,k-1)+10C(n,k-2)+4C(n,k-3)
    + C(a,k-1)+5C(a,k-2)+6C(a,k-3)+C(a,k-4)
    + C(b,k-1)+5C(b,k-2)+6C(b,k-3)+C(b,k-4)
    + [k=2]+4[k=3]+3[k=4],

Z_k = 5C(n,k-2)+12C(n,k-3)+3C(n,k-4)
    + (b+1)C(a,k-2)+(5b+8)C(a,k-3)+(6b+9)C(a,k-4)+bC(a,k-5)
    + (a+1)C(b,k-2)+(5a+8)C(b,k-3)+(6a+9)C(b,k-4)+aC(b,k-5)
    + (n+2)[k=3]+(4n+9)[k=4]+(3n+4)[k=5].
```

Here `F_k` counts independent `k`-sets and `Z_k` counts `k`-sets inducing
exactly one edge.  Literal subset enumeration independently checks both rows
on small family members.

The targets `j=4,5,6` are direct positive-coefficient charts after writing

```text
b=q+j-2,  a=q+v+j-2,  q,v>=0.
```

Their reduced numerators contain 90, 104, and 119 positive monomials.

For the induction step, keep one tree fixed.  For `j>=6` and `b>=j-1`,
normalize by

```text
B=C(n,j-4),
rho=C(a,j-4)/B,
tau=C(b,j-4)/B.
```

The exact consecutive-target difference

```text
(Delta_(j+1)(a,b)-Delta_j(a,b))/B
```

is affine in `(rho,tau)`.  The hypergeometric bound

```text
C(A,k)/C(A+B,k) <= A/(A+kB)
```

gives

```text
0<=rho<=a/(a+(j-4)b),
0<=tau<=b/(b+(j-4)a).
```

Parameterize the recurrence domain by

```text
j=y+6,  b=q+y+5,  a=q+v+y+5,  q,v,y>=0.
```

At the four vertices of the containing rectangle, the reduced numerators
have respectively 662, 1077, 1062, and 1611 positive monomials and no
negative coefficient.  The denominators are positive on the whole orthant.
Thus the same-tree difference is positive throughout the rectangle.  Starting
from the exact `j=6` chart proves every `j>=7` middle target by induction;
the separate `j=4,5` charts complete the stated region.

This closes only the middle targets of one connected hub-distance-seven
remainder family.  It does not cover its tail, other remainder forests,
nonisolated marked roots, the complete terminal payment, or Erdos Problem
993.

Replay:

```powershell
python .\prove_terminal_q3_m0_marked_isolate_hub_distance7_double_broom_middle_all_j_root.py
```

Required marker:

```text
PASS_EXACT_MIDDLE_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE7_DOUBLE_BROOM_ROOT
```
