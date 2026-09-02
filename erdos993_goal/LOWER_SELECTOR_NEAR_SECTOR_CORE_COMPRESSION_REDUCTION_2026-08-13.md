# Near-sector rotation reduces to one boundary coordinate of a safe core

Date: 2026-08-13

Status: exact all-order reduction, not a proof of the rotating continuation.
The real-anchor selector ceiling has already been proved in every near-sector
chart.  This note isolates the remaining rotation obstruction after removing
the two degrees introduced by the exceptional factors.

## 1. Eliminate the two unsafe degrees exactly

Write

```text
M_k(d;z)=P_B[(4q-d)^k](z)
```

and put `r=m-2`, `S=u+v`, and `P=uv`.  The unequal twice-polar polynomial is

```text
F_r(d;z)=16P_B[(q+u/4)(q+v/4)(4q-d)^r](z)
        =M_(r+2)+(2d+S)M_(r+1)+(d^2+Sd+P)M_r.       (1)
```

The Meixner recurrence is

```text
(B+k)M_(k+1)
 ={4(z-k)-d(B+2k)}M_k-d(d+4)kM_(k-1).              (2)
```

Applying (2) twice to (1) gives the all-order identity

```text
(B+r)(B+r+1)F_r=A_r M_r-dr(d+4)L_r M_(r-1),         (3)

L_r=Bd+(B+r+1)S+4(z-r-1),                           (4)
```

where

```text
A_r=
 B^2P+2BPr+BP-BSdr-4BSr+4BSz-Bd^2r-4Bdr
 +Pr^2+Pr-Sdr^2-Sdr-4Sr^2+4Srz-4Sr+4Sz
 +4dr^2-8drz+4dr+16r^2-32rz+16r+16z^2-16z.         (5)
```

Since differentiation of the source gives `M_r'=-rM_(r-1)`, (3) is also

```text
(B+r)(B+r+1)F_r=A_r M_r+d(d+4)L_r M_r'.             (6)
```

Thus the difficult degree-`r` polynomial is a first-order transform of the
degree-`r` base, rather than a genuinely degree-`r+2` object.

## 2. The core already satisfies the half-angle theorem

Put

```text
w=d/(d+4),
Q_k(w)=(1-w)^k M_k(4w/(1-w);z)/4^k.
```

Then (3) becomes, up to a nonzero scalar,

```text
A_r Q_r-drL_r Q_(r-1).                               (7)
```

Let `T_r` be the `r` by `r` tridiagonal matrix from Section 59, with

```text
diagonal_k=k-z+w(z+B+k),
upper_k=B+k,
lower_k=w(k+1).
```

Its determinant and the leading minor satisfy

```text
det T_r=(-1)^r(B)_r Q_r,
det T_(r-1)=(-1)^(r-1)(B)_(r-1)Q_(r-1).             (8)
```

When `A_r!=0`, (7) is therefore the characteristic equation of the
rank-one boundary perturbation

```text
T_r+delta e_(r-1)e_(r-1)^T,
delta=(B+r-1)drL_r/A_r.                              (9)
```

In the near strip one has `R=sqrt(A)>m-2=r`.  Consequently the unperturbed
core `M_r` is already covered by the proved Section 61 half-angle theorem.
The old exceptional Rayleigh branch has disappeared: after symmetric
off-diagonal scaling, every normalized core vector obeys

```text
0<=D<=r-1<R.                                         (10)
```

If a boundary zero of (9) exists and `p=|v_(r-1)|^2`, the exact scalar
equation is

```text
D-z+w(z+B+D)+2yC+delta p=0,       y^2=w,             (11)

C^2<=D(B+D),        (r-1)p<=D.                        (12)
```

Without the final term, the Section 59 proof excludes a crossing because
`R>D`.  Hence the entire rotating-continuation problem has been compressed
to the single boundary mass `delta p`; no bulk `D>R` branch remains.

Equations (3), (6), and (7) remain valid when `A_r=0`; only the divided
rank-one notation (9) is then replaced by the cleared equation (7).

## 3. Why the real-anchor ceiling alone cannot control the boundary term

The condition `u,v>=1/(B+r)` is sufficient for the real-anchor orientation,
but it is not sufficient for rotation, even at the first relevant rank.
Take

```text
m=7, r=5, B=27, R^2=(m-2)(m-3/2)=55/2,
u=v=1/32=1/(B+r).                                    (13)
```

At `z=R`, the five roots of `F_5(d;R)` are positive.  Its smallest root lies
strictly in

```text
1/6000 < d_0 < 1/5000.                               (14)
```

For `z(psi)=R exp(2i psi)` and the analytic root branch `d(psi)` through
`d_0`, implicit differentiation gives

```text
d/dpsi Im(exp(-i psi)d(psi)) at psi=0
 =-{2R F_z(d_0,R)+d_0 F_d(d_0,R)}/F_d(d_0,R).       (15)
```

Exact quadratic-field Sturm counts show that both the numerator in braces
and `F_d` are negative throughout (14), so (15) is strictly negative.
The root immediately enters the wrong rotating half-plane.  This is a
counterexample only to the generic shortcut; it is not a lower-selector
cell.  It proves that the remaining argument must retain further
path-specific information about the actual pair `(u,v)` or prove a direct
sign estimate for `delta p`.

## 4. Sharp remaining lemma

For each of the four near-sector charts, with `(u,v)` equal to the actual two
positive selector reciprocals, prove that the cleared boundary system
(7), equivalently (11), has no solution when

```text
z=R exp(2i psi), d=exp(i psi)x,
0<psi<pi/2, x real.                                  (16)
```

The dimension reserve is now optimal: the core has degree `m-2` and
`R>m-2`, while only one explicitly known boundary coordinate remains.  This
is strictly smaller than the earlier formulation with a possible bulk
Rayleigh parameter `D>R`.

The companion replay is
`verify_lower_selector_near_sector_core_compression.py`; it verifies (1)--(9)
symbolically and certifies (13)--(15) by exact Sturm counts over
`QQ(sqrt(110))`.
