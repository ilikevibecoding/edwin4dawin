# Balanced subdivided-star m=0 row-correlation lemma

Date: 2026-08-29

## Scope

This note proves the exact all-order row correlations needed on the balanced
subdivided-star endpoint of the terminal Newton `m=0` root-partition
reduction.  It does **not** prove the remaining root-partition sign, the full
terminal-payment theorem, or Erdős Problem #993.

## Literal family

There are `d` centres.  Centre `i` has `r_i` arms, where the `r_i` are the
balanced parts of `R`.  Arm `a` contains one mandatory vertex and `ell_a`
subdivision vertices, with

```text
ell_a >= 0,       sum_a ell_a = T,
Y = #{a : ell_a > 0},       N=d+R+T.
```

Write `P_m=I(P_m;x)`, with

```text
P_m=P_(m-1)+x P_(m-2),  P_-2=0, P_-1=P_0=1.
```

If `H_i` is the product of the arm paths at centre `i` and `K_i` is obtained
by deleting the first vertex of every such arm, then the rows are literally

```text
I_H = product_a P_(ell_a+1),
K   = product_a P_(ell_a),
I_F = product_i (H_i+x K_i).                         (1)
```

Consequently, for the terminal constant row,

```text
U_0/b = 1 + h_j/b + f_(j+1)/b.                       (2)
```

The common rank-four/root-partition coordinates are not relaxed:

```text
Y   = #{a:ell_a>0},
tau = B3+(d-1)R+T-(N-2)
      +sum_(ell_a>0)(r_(centre(a))-1).                (3)
```

## Four path grafts

The recurrence gives, by induction in each unbounded path index,

```text
P_a P_b-P_(a+b-2)P_2 = x^4 P_(a-4)P_(b-4),  a,b>=2,
P_a P_1-P_(a-1)P_2   = x^3 P_(a-4),          a>=2,

P_(a+b-3)P_3-P_a P_b = x^5 P_(a-5)P_(b-5),  a,b>=3,
P_(a-1)P_3-P_a P_2   = x^4 P_(a-5),          a>=3.   (4)
```

Every right side has nonnegative coefficients.  The first pair of grafts
concentrates the deep-tail paths to give a coefficientwise minimum `Kmin`.
The second pair reduces the arm paths to a coefficientwise maximum `Hmax`.
At fixed `T,Y` these canonical products are

```text
Kmin = P_(T-2Y+2) P_2^(Y-1),                  T>=2Y,
     = P_2^(T-Y) P_1^(2Y-T),                  T<2Y;

Hmax = (1+x)^(R-Y) P_(T-2Y+3) P_3^(Y-1),     T>=2Y,
     = (1+x)^(R-Y) P_3^(T-Y) P_2^(2Y-T),     T<2Y.   (5)
```

Thus `K >=_coeff Kmin` and `I_H <=_coeff Hmax` for every allocation, at every
rank.

## Exact-centre Jensen floor and the y cap

Let `U=R-Y` be the number of unsubdivided arms.  Fix a nonempty `c`-subset
`C` of the centres and select exactly those centres.  Restrict the remaining
vertices to all deep-tail vertices plus the unsubdivided arm vertices whose
centres are outside `C`.  This is a disjoint subfamily in the corresponding
term of (1), with row

```text
x^c (1+x)^L K,  L=number of unsubdivided arms outside C.       (6)
```

For fixed residual rank, `[x^r](1+x)^L Kmin` is a discrete-convex function of
integer `L`: its second forward difference is another nonnegative coefficient
of `(1+x)^L Kmin`.  Across all `c`-subsets,

```text
average L = U(d-c)/d.                                (7)
```

Integer Jensen therefore gives the explicit floor `E_j` implemented in
`center_sector_extra_lower`.  The disjoint centre sectors imply

```text
f_j-h_j >= E_j,
h_j <= [x^j]Hmax,
h_j/f_j <= Hmax_j/(Hmax_j+E_j).                      (8)
```

This is the required all-order `y=h_j/f_j` correlation; it is derived from
the literal rows, not from an independent endpoint box.

## Extension floors used with U_0

`H` is a linear forest on `S=R+T` vertices and has exactly `R-Y` isolated
vertices.  Under the uniform distribution on independent `j`-sets, each
isolate has inclusion probability at least `j/S`: swapping an occupied
non-isolate to a fixed unused isolate is an injection.  If an independent
set contains `k` isolates, its number of one-vertex extensions is at least
`S-3j+2k`.  Double counting gives

```text
h_(j+1)/h_j >= max(0,S-3j+2j(R-Y)/S)/(j+1).          (9)
```

Also `j h_j <= (S-j+1)h_(j-1)`.  When the balanced quotient is zero, `F` is a
linear forest on `N` vertices with `d-R` isolates, and the same argument gives

```text
f_(j+1)/f_j >= max(0,N-3j+2j(d-R)/N)/(j+1).          (10)
```

Equations (2), (8), (9), and (10) are the correlated `Y,y,U_0/b` inputs for
the remaining terminal `m=0` sign reduction.

## Replay and boundary audit

Run

```powershell
python .\prove_balanced_subdivided_star_m0_row_correlation_adversary.py
```

The required marker is

```text
PASS_EXACT_ALL_ORDER_BALANCED_SUBDIVIDED_STAR_M0_ROW_CORRELATION_LEMMA
```

The verifier checks the recurrence bases and graft identities, 1,397,304
path-allocation coefficient inequalities, and 222,879 supported literal
balanced-family ranks.  It separately replays all 36 allocations at the first
relaxed obstruction `(N,j,d,R,T)=(15,4,5,8,2)`.  Their exact minimum cleared
shared-`q3` lower margin is

```text
6,226,152,956,340 > 0,
```

at allocation `(0,0,0,0,0,2,0,0)`.  This finite replay audits the all-order
lemma but is not a substitute for it.
