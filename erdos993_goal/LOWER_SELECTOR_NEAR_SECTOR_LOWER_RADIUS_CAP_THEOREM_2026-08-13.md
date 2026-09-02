# Lower-radius near-sector selector cap

Date: 2026-08-13

Status: all-order theorem.  In both lower-radius near-sector charts, the
smaller positive selector root satisfies

```text
rho_1 < K/4.
```

Together with the forced lower bound `rho_1>5/4`, this supplies every
selector inequality required by the one-polar strip reduction.  The separate
universal rotating one-polar strip lemma remains open.

## 1. The fixed-point criterion

Write

```text
Gamma(t)=G_0(t)-2tG_1(t)+t^2G_2(t),
Turan(t)=G_1(t)^2-G_0(t)G_2(t)>0.
```

Section 67 gives a fixed point `t_* > 1`, with `Gamma(t_*)<0`, between the
two positive roots of `Gamma`.  For any `t>1`, either of the following is
sufficient for the smaller root `rho_1<t`:

```text
G_1(t)<tG_2(t),              or              Gamma(t)<0.       (1)
```

Indeed, the first inequality puts `t_*` in `(1,t)`, and the second puts `t`
itself between the two positive roots.  We apply (1) at `t=K/4`.

## 2. Unforced lower-radius chart

This chart is `(e,sigma)=(1,0)`.  Put

```text
s=2T,                 T=m-2>=5,
3<=g<=2T+1,           y=2g-4 in [2,4T-2],
R=s+y-1,              K=4T+2,
t=K/4=T+1/2.
```

Let

```text
c_h=[u^h]G_(N-2,s),        c_h^+=[u^h]G_(N-1,s).
```

The active-box expansion and the positive-term injection already proved in
Section 106 give, with

```text
A=(s+y)(s+y+1),
b_h=A/((y+h)(y+h+1)),
L_h={(s-2h)(s-2h-1)(2s+2y-1)}
    /{(y+2h)(y+2h+1)(h+1)},                         (2)
```

the all-order inequalities

```text
c_h^+/c_h <= b_h,             c_(h+1)/c_h >= L_h.  (3)
```

Let `H` be the last index with `b_H>t`, and put `q=T-H`.  All possibly
negative terms of

```text
tG_(N-2,s)(t)-G_(N-1,s)(t)
 =sum_h (tc_h-c_h^+)t^h                              (4)
```

lie in `0<=h<=H`.  Moreover, throughout that head, (3) makes `c_ht^h`
increase.  Hence its total possible debt is at most

```text
(H+1)(b_0-t)c_Ht^H.                                  (5)
```

The leading term is at least `(t-b_T)c_Tt^T`.  Iterating (3) gives the exact
lower factor

```text
P_H=product_(h=H)^(T-1) tL_h
   ={t(2s+2y-1)}^q (2q)! (T-q)! (y+s-2q-1)!
      /{T!(y+s-1)!}.                                 (6)
```

Thus (4) is positive whenever

```text
(t-b_T)P_H > (H+1)(b_0-t).                          (7)
```

For `T>=101`, (7) follows from elementary estimates.  Since
`b_floor(T/2)<25<t`, one has `q>=ceil(T/2)`.  Also `tL_h>(T-1)/9>1` on
the negative head.  Using `y<=4T-2` in (6),

```text
P_H >= (2q)!/(9T)^q
    > (T/81)^q
    >=(T/81)^ceil(T/2).                              (8)
```

Here `n!>(n/3)^n` follows from the elementary integral bound
`n!>=(n/e)^n` and `e<3`.  The remaining prefactor satisfies

```text
(t-b_T)/{(H+1)(b_0-t)} >= 1/(2T^2),                 (9)
```

because `b_T<=4`, `b_0<=T^2`, and `H+1<=T`.  Finally,

```text
(101/81)^51 > 2*101^2,                              (10)
```

and the left/right ratio in (10) increases with every subsequent integer
`T`.  For an even-to-odd step this follows from
`4n^2>81(2n+1)` for `n>=51`; an odd-to-even step leaves the exponent fixed
and increases the base faster than the quadratic denominator.  Equations
(8)--(10) prove (7) for every `T>=101`.

The finite base `5<=T<=100` contains exactly 9,984 admissible `(T,y)`
cells.  Of these, 9,281 are already coefficientwise positive because
`b_0<=t`.  Exact rational evaluation proves (7) in every remaining cell
except `(T,y)=(6,2)`.  In that sole cell direct evaluation of (4) is

```text
158004513515667/32 > 0.                              (11)
```

This is an exhaustive finite base joined to the all-order estimate, not an
extrapolating scan.  Therefore the first alternative in (1) holds throughout
the unforced lower-radius chart.

## 3. Forced lower-radius chart

This is `(e,sigma)=(2,1)`.  Put

```text
R=2m-6,                  s=2m+2a-3,
T=m+a-2,                 1<=a<=2m-7,
K=4m+a-6,                t=K/4.
```

The forced support begins with `c_(a+2)` while `c_(a+1)^+` is already
nonzero.  For every `a+1<=h<=T-2`, the coefficient-ratio proof of the forced
shift theorem gives

```text
c_h^+/c_(h+1)<(R+2)(R+1)/4<t^2.                    (12)
```

The last inequality is already true at the smallest `a=1`, because its
margin is `(32m-55)/16>0`.  Multiplying (12) by `t^h` pairs every interior
term of `G_(N-1,s)(t)` with the corresponding term of `tG_(N-2,s)(t)`.

It remains to prove the final block

```text
c_(T-1)^+ + t c_T^+ < t^2c_T.                      (13)
```

For `m>=44` this has a uniform coefficient-ratio certificate.  Let

```text
F(x)=(1+x)^A(1+2x)^B=sum f_jx^j,
A=3m+a-7, B=2m-7, n=A+B, W=A+2B,
q_0=f_(T-1)/f_T.
```

The final margin divided by `f_T` is an affine function `M(q_0)`.  Its slope
is strictly negative.  If `mu_k` is the expected number of weight-two
variables in a weighted `k`-subset, then

```text
mu_k >= 2Bk/(W+k-1).                                (14)
```

To see (14), delete one weight-two variable.  Since every remaining weight
is at least one, `e_k/e_(k-1)<=(W-k-1)/k`; hence that variable's inclusion
probability is at least `2k/(W+k-1)`, and summing over the `B` such variables
gives (14).

The differential recurrence for `F` yields, with

```text
mu_0=2B(T-2)/(W+T-3),
r_0=(T-1)/(W-T+2-mu_0),
qbar=T/{W-3T+3+2(n-T+2)r_0},                       (15)
```

the rigorous bound `q_0<=qbar`.  Substitution into the exact final margin
gives `M(qbar)>0` for every `m>=44` and `1<=a<=2m-7`.  This last rational
inequality has a compact exact certificate: set

```text
m=44+u,       a=1+(2m-8)v,       u>=0, 0<=v<=1.
```

The numerator of `-M'(q_0)` has degree four in `v`, and the numerator of
`M(qbar)` has degree six.  In Bernstein form on `0<=v<=1`, their respective
five and seven coefficients are polynomials in `u` with all coefficients
strictly positive.  Their denominators are respectively
`24(2m-5)(4m-9)` and
`72(m-3)(4m-9){a(2m-3)+20m^2-118m+172}`, hence are positive on this
chart.  The companion replay derives these polynomials exactly; no numerical
root check is used.  Thus (13), and hence the first alternative of (1),
holds for all `m>=44`.

The remaining `7<=m<=43` chart has exactly 1,591 cells.  Exhaustive exact
rational evaluation gives:

* `G_1(t)<tG_2(t)` in 1,572 cells;
* in the other 19 cells, `Gamma(t)<0`.

This is the complete finite base below the symbolic threshold.  Therefore
the dichotomy (1) holds throughout the forced lower-radius chart as well.

## 4. Consequence

Both lower-radius charts satisfy `rho_1<K/4` in every order.  The other
selector input of the one-polar reduction, `rho_1>5/4` on forced charts, was
proved separately.  Hence the only remaining near-sector obligation is the
universal rotating one-polar strip lemma itself.

The companion exact replay is
`prove_lower_selector_near_sector_lower_radius_cap.py`; it writes
`lower_selector_near_sector_lower_radius_cap_exact_20260813.json`.
