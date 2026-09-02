# Terminal q3 Newton m=0: hub-distance-six double-broom tail targets

Date: 2026-08-31

Let `T_(a,b,6)` be the tree whose two hubs are joined by a path of six
edges, with sorted pendant-leaf counts `a>=b>=1`.  This certificate proves
the isolated-marked-root terminal-q3 Newton `m=0` payment positive at every
supported tail target

```text
j>=4 and j>=b+3.
```

Put `n=a+b`.  The independence number of this family is `n+3`, so the
supported tail ends at `j=n+3`.

The proof uses one common normalizer

```text
B=C(n,j-2),
rho=C(a,j-2)/B,
tau=C(b,j-2)/B.
```

At every tail target, `tau=0`.  For `j>=6` and `j<=n+2`, the common-
normalizer bulk payment is affine in `rho`.  A side whose baseline binomial
vanishes can still contribute at the next two boundary layers, so those
terms are tracked separately below rather than silently discarded.

If `rho=0`, encode all ordering, tail, and support constraints by

```text
b=s+t+1,
a=s+t+r+1,
j=t+r+2s+4,
r,s,t>=0.
```

The resulting `n`-row bulk numerator has 545 terms and every coefficient is
positive.  Here

```text
j-a=s+3,
j-b=r+s+3.
```

At gap at least five the omitted side contributes nothing.  The gap-four
correction is manifestly positive.  The gap-three large-side correction has
a 55-term positive numerator; the only small-side gap-three case has
`r=s=0` and is its symmetric specialization.  Thus every boundary correction
in the `rho=0` region is nonnegative.

If `rho>0`, write

```text
b=q+1,
j=q+y+4,
a=q+y+u+2,
q,u,y>=0.
```

Factoring the first two selected vertices gives

```text
rho = a(a-1)/(n(n-1)) * C(a-2,j-4)/C(n-2,j-4).
```

The depth-sensitive hypergeometric bound therefore gives

```text
rho <= a(a-1)/(n(n-1))
       * (a-2)/((a-2)+(j-4)b).
```

The affine bulk payment is positive both at `rho=0` and at this upper
endpoint: the two reduced numerators have respectively 543 and 1414 positive
terms and no negative coefficient.  The cap denominator can vanish only at
`q=u=y=0`, namely the excluded low target `j=4`; the theorem uses this chart
only for `j>=6`.

The small-side boundary gap is `j-b=y+3`.  For `y>=2` there is no correction;
for `y=1` the gap-four correction is positive.  At `y=0` the gap-three
correction need not be positive by itself.  But `j>=6` gives `q>=2`, and

```text
B=C(n,q+2) >= C(n,3).
```

The lower payment `C(n,3)` times the positive affine bulk plus the exact
gap-three correction is positive at both affine endpoints.  Its two reduced
numerators contain 150 and 220 positive terms and no negative coefficient.
Consequently the actual payment, with the larger factor `B`, is positive as
well.

The low tail targets are separate exact positive-coefficient charts:

```text
j=4: b=1, a>=1;
j=5: b=1 or b=2, a>=b.
```

Finally, `B=0` only at the supported endpoint `j=n+3`.  There

```text
F_(n+3)=1, F_(n+4)=Z_(n+4)=0,
F_(n+2)=n+6       when b>=2,
F_(n+2)=n+9       when b=1 and a>=2.
```

Both endpoint cases are direct positive-coefficient charts.  The remaining
endpoint `(a,b,j)=(1,1,5)` is already included in the exact `j=5,b=1`
chart.

The earlier exploratory distance-six tail script used row-dependent
normalizers and therefore was not a proof certificate.  This theorem uses
one common `B` throughout and checks the normalized identity directly against
integer graph rows.

This closes the tail targets of one connected hub-distance-six remainder
family.  It does not cover arbitrary remainder forests, nonisolated marked
roots, the complete terminal payment, or Erdos Problem 993.

Replay:

```powershell
python .\prove_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_tail_all_j_root.py
```

Required marker:

```text
PASS_EXACT_TAIL_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE6_DOUBLE_BROOM_ROOT
```
