# One-polar strip reduction for the near-sector selector

Date: 2026-08-13

Status: exact all-order reduction, not a proof of the remaining rotation
lemma.  Both selector bounds identified below have since been proved
all-order; only the one-polar strip lemma remains.

## 1. Remove only one exceptional degree

Put

```text
M_j(d;z)=P_B[(4q-d)^j](z),       k=m-1,
H_u(d;z)=4P_B[(q+u/4)(4q-d)^k](z).
```

The source identity and the Meixner recurrence give

```text
H_u=M_(k+1)+(d+u)M_k,                              (1)

(B+k)H_u=A_u M_k+d(d+4)M_k',                       (2)

A_u=4(z-k)+u(B+k)-kd.                              (3)
```

After the Section 59 substitution this is, up to a nonzero scalar,

```text
A_u Q_k-dkQ_(k-1).                                  (4)
```

Thus a zero is a last-coordinate rank-one perturbation of the degree-`k`
Section 59 tridiagonal core, with

```text
delta=(B+k-1)dk/A_u.                                (5)
```

The near strip has `k-1<R<k`.  Therefore the unperturbed degree-`k` core
already satisfies the strict half-angle theorem, with no exceptional bulk
Rayleigh branch.

At a hypothetical rotating-boundary zero, put

```text
z=Rs^2, d=sx, |s|=1, Im(s)>0,
p=|v_(k-1)|^2,
0<=D<=k-1<R, C^2<=D(B+D), (k-1)p<=D.
```

Writing

```text
X=4(D-z)+d(B+2D),
Y=(B+k-1)dk(d+4)p,
```

the cleared scalar equation and its squared necessary condition are exactly

```text
A_u X+2A_u C sqrt(d(d+4))+Y=0,                     (6)

(A_u X+Y)^2=4A_u^2 C^2 d(d+4).                    (7)
```

This is one degree smaller and one parameter smaller than the twice-polar
boundary equation in Section 106.2.

## 2. The natural one-polar interval

Write `theta=k-R in (0,1)`.  At the real anchor, direct Pochhammer
evaluation gives

```text
H_u(0;R)=positive_factor * {u/4-theta/(B+k)}.       (8)
```

The first polar derivative has at most one nonpositive root, so

```text
u>4theta/(B+k)                                      (9)
```

is exactly the condition that all its anchor roots are positive.  At the
opposite endpoint the leading coefficient is a nonzero multiple of
`u/4-R/B`; hence

```text
u<4R/B                                               (10)
```

is the matching no-degree-loss orientation.

The sharp universal target suggested by (6)--(10) is:

> **One-polar strip lemma.**  If `B>=3k-1`, `k-1<R<k`, and
> `4(k-R)/(B+k)<u<4R/B`, then every zero of `H_u(d;Rs^2)` satisfies
> `Im(d/s)>0` for `0<arg(s)<pi/2`.

This lemma is not proved here.  A direct algebraic-symbol shortcut also does
not prove it: the degree-`k` symbol factors as

```text
(x+y)^(k-1){a(x+y)+kx(4-sy)},
a=4Rs^2-4k+u(B+k),                                  (11)
```

and the bilinear factor is not a generic upper-half-plane stable polynomial.
The exact path tridiagonal structure must therefore remain in the proof.

Once the one-polar strip lemma holds, the second polar derivative is
automatic: its polar point `-v` lies strictly in the desired rotating
half-plane, so the classical Laguerre polar-derivative theorem preserves the
half-plane containing all zeros of `H_u`.

## 3. What the actual selector must supply

Let `rho_1<rho_2` be the two positive selector roots and choose the larger
reciprocal

```text
u=1/rho_1.
```

The already-proved selector ceiling is `rho_1<K`, where `K=B+k-1`.

For the upper-radius charts

```text
R^2=k(k-1/2),                                        (12)
```

the existing ceiling already implies (9).  Indeed

```text
K < (K+1)/(4(k-R))                                  (13)
```

throughout both the unforced and forced parameter ranges.  On the unforced
chart `B<4R`, so `rho_1>1` implies (10).  On the forced chart it is enough
to know `rho_1>5/4`, because the exact chart bounds give `B<5R`.

For the lower-radius charts

```text
R^2=(k-1)(k-1/2),                                    (14)
```

the convenient sufficient selector cap is

```text
rho_1<K/4.                                           (15)
```

Since `k-R<1`, (15) implies (9).  The same `rho_1>5/4` bound supplies
(10) on the forced chart; the unforced chart again has `B<4R`.

Consequently near-sector rotation is reduced to three explicit statements:

1. the universal one-polar strip lemma above;
2. `rho_1>5/4` on the forced near-sector chart;
3. `rho_1<K/4` on the two lower-radius charts.

Statement 2 is now an all-order theorem in
`LOWER_SELECTOR_NEAR_SECTOR_FORCED_ROOT_LOWER_BOUND_THEOREM_2026-08-13.md`.
Statement 3 is now an all-order theorem in
`LOWER_SELECTOR_NEAR_SECTOR_LOWER_RADIUS_CAP_THEOREM_2026-08-13.md`.
Thus only statement 1 remains.

The first selector statement has an especially concrete coefficientwise
route.  With `G_0=G_(N,s),G_1=G_(N-1,s),G_2=G_(N-2,s)`, it is enough to prove

```text
4G_1-5G_2 >=_coeff 0,
16G_0-40G_1+25G_2 >_coeff 0.                         (16)
```

The first inequality makes the Section 67 fixed point exceed `5/4`; the
second makes `Gamma(5/4)>0`, forcing the first positive selector root to lie
to the right of `5/4`.

For (15), put `t=K/4`.  The exact sufficient dichotomy is

```text
G_1(t)<tG_2(t)   or   Gamma(t)<0.                    (17)
```

In the first case a Turan fixed point lies in `(1,t)`; in the second case
`t` already lies between the two positive roots.  Either way `rho_1<t`.

The companion replay verifies (1)--(11), the chart implications
(12)--(15), and the earlier finite exact evidence for (16)--(17).  The two
selector statements now have separate all-order proofs; this replay is not
the proof of the remaining rotating strip lemma.
