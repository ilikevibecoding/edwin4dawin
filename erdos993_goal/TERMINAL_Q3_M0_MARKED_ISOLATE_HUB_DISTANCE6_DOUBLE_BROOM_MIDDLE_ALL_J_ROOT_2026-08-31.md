# Terminal q3 Newton m=0: hub-distance-six double-broom middle targets

Date: 2026-08-31

Let `T_(a,b,6)` be the tree whose two hubs are joined by a path of six
edges, with sorted pendant-leaf counts `a>=b>=1`.  This certificate proves
the isolated-marked-root terminal-q3 Newton `m=0` payment nonnegative at
every middle target

```text
j>=4 and b>=j-2.
```

Put `n=a+b`.  Exact deletion-state counting gives

```text
F_k = C(n,k)+5C(n,k-1)+6C(n,k-2)+C(n,k-3)
    + C(a,k-1)+4C(a,k-2)+3C(a,k-3)
    + C(b,k-1)+4C(b,k-2)+3C(b,k-3)
    + [k=2]+3[k=3]+[k=4],

Z_k = 4C(n,k-2)+6C(n,k-3)
    + (b+1)C(a,k-2)+(4b+6)C(a,k-3)+(3b+3)C(a,k-4)
    + (a+1)C(b,k-2)+(4a+6)C(b,k-3)+(3a+3)C(b,k-4)
    + (n+2)[k=3]+(3n+6)[k=4]+n[k=5].
```

Here `F_k` counts independent `k`-sets and `Z_k` counts `k`-sets inducing
exactly one edge in the remainder.  Literal subset enumeration independently
checks these two rows on small graphs.

The targets `j=4,5,6` are direct positive-coefficient charts after writing

```text
b=q+j-2,  a=q+v+j-2,  q,v>=0.
```

For the induction step, keep one tree fixed and write `Delta_j(a,b)` for its
exact payment at target `j`.  For `j>=6` and `b>=j-1`, normalize

```text
B=C(n,j-4),
rho=C(a,j-4)/B,
tau=C(b,j-4)/B.
```

The exact consecutive-target difference

```text
(Delta_(j+1)(a,b)-Delta_j(a,b))/B
```

is affine in `(rho,tau)`.  The depth-sensitive hypergeometric bound

```text
C(A,k)/C(A+B,k) <= (A/(A+B))^k <= A/(A+kB)
```

for integers `A>=k>=1`, `B>=1` gives

```text
0 <= rho <= a/(a+(j-4)b),
0 <= tau <= b/(b+(j-4)a).
```

Parameterize the whole recurrence domain by

```text
j=y+6,  b=q+y+5,  a=q+v+y+5,  q,v,y>=0.
```

At each of the four vertices of the containing `(rho,tau)` rectangle, the
reduced numerator and denominator have only positive coefficients.  Hence
the affine difference is positive throughout the rectangle.  Starting from
the exact `j=6` chart proves every `j>=7` middle target by induction; the
separate exact `j=4,5` charts complete the stated middle region.

This closes the middle targets of one connected hub-distance-six remainder
family.  It does not cover its tail targets `j>=b+3`, arbitrary remainder
forests, nonisolated marked roots, the complete terminal payment, or Erdos
Problem 993.

Replay:

```powershell
python .\prove_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_middle_all_j_root.py
```

Required marker:

```text
PASS_EXACT_MIDDLE_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE6_DOUBLE_BROOM_ROOT
```
