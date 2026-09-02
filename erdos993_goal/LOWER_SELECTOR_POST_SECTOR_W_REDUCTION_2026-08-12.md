# Post-sector one-minor reduction

Date: 2026-08-12

The unequal-polar sector theorem already proves the lower first Durán margin
whenever

```text
A>(m-1)^2.
```

The unique failure of the one-tail-minor inequality in the complete exact
`d<=50` audit, `(d,r,s,m)=(19,3,8,6)`, lies in that proved region because
`A=68>25`.  Thus it is irrelevant to the remaining problem.  On the actual
complement `A<=(m-1)^2`, the same audit has no failure of

```text
h_(m-3)^2+h_(m-2)^2>1,
W=(h_(m-3)h_(m-1)-h_(m-2)^2)^2>E+F-1.              (1)
```

This note makes the first three nontrivial degrees of that observation a
theorem and reduces the remaining analytic obligation to `m>=7`.

## 1. The complement forces `d<=2m`

Write `d=2D+delta`.  The exact lower-selector formulas give, independently of
the forced-zero order,

```text
d=2D:     x=D-1,       A=(D-1)(D-1+beta),
d=2D+1:   x=D-1 (s even), or x=D (s odd),
```

where `beta` is `-1/2` or `1/2`.  Therefore the smallest possible `A` at
fixed `d` is

```text
d=2D:     A>=(D-1)(D-3/2),
d=2D+1:   A>=(D-1)(D-1/2).                           (2)
```

If even `d>=2m+2`, then `D>=m+1` and the first bound is
`A>=m(m-1/2)>(m-1)^2`.  If odd `d>=2m+1`, then `D>=m` and the second bound is
`A>=(m-1)(m-1/2)>(m-1)^2`.  Hence

```text
A<=(m-1)^2  ==>  d<=2m,
```

with the sharper `d<=2m-1` for odd `d`.

## 2. Degrees four through six are finite and closed exactly

For `m=4`, (2) leaves only `5<=d<=8`; exact enumeration of the admissible
lower-selector rows gives 21 cells.  For `m=5`, it leaves only `5<=d<=10`
and gives 45 cells.  For `m=6`, it leaves only `5<=d<=12` and gives 77
cells.  Direct rational evaluation of the quotient recurrence proves both
inequalities in (1) in all 143 cells.  The smallest ratio is

```text
W/(E+F-1)=5.42618286258173...
```

at `(d,r,s,a,m)=(6,1,8,2,4)`, so the finite certificate has substantial
strict slack.

The replay `prove_lower_selector_w_complement_low_degree.py` reconstructs
the selector, forced-zero normalization, Durán polynomial, quotient
coefficients, energies, and minor over exact FLINT rationals.  It reports

```text
PASS_EXACT_POST_SECTOR_W_CERTIFICATE_FOR_M4_TO_M6.
```

Its source and report SHA-256 hashes are respectively
`F7C4BE37EC396CC5068D041D08B1C17319C04D31B73737921108B34E17316F69` and
`9AF70740211796F6185312B36F02DE9CBB51C0CB337532EC29F836B5F4C6F50E`.

Consequently, after combining the sector theorem and this finite exact
closure, the sole remaining one-minor theorem is (1) under

```text
m>=7,       A<=(m-1)^2.                              (3)
```

In the authoritative `d<=50` diamond, (3) contains 36,606 cells and has no
failure.  That last count is exact finite evidence, not a proof of (3).

## 3. Natural coordinates for the remaining theorem

The remaining domain has a compact exact parametrization.  Put

```text
sigma=s mod 2,       e=2m-d.
```

Since `m=floor(s/2)+2-a`, one has

```text
d=2m-e,
s=2m+2a-4+sigma,
N_D=d+s-a=4m+a-e-4+sigma.                            (4)
```

Here `N_D` is the ambient falling-factorial parameter in the corrected Durán
polynomial.  Also

```text
x=floor((d+sigma)/2)-1,
beta = 1/2 if sigma-e is odd, and -1/2 otherwise,
A=x(x+beta).                                         (5)
```

The complement is exactly `e>=0`, except that `(e,sigma)=(0,1)` is sector
safe.  If `a=0`, put `g=N-s>=1`; then

```text
r=e+g-4+sigma,
max(1,4-e-sigma)<=g<=2m-2e-1-sigma.                 (6)
```

If `a>=1`, the forced-zero relation gives

```text
r=e+a-3+sigma,
1<=a<=2m-2e-2-sigma,       e+sigma>=2.              (7)
```

Thus (3) is an integer cone in `(m,e,g,sigma)` on the unforced chart and in
`(m,e,a,sigma)` on the forced chart.

There is also a completely rational closed form for the quantities in (1).
Let `gamma_j=[t^j]Gamma_(d+r,s)(t)` and set

```text
q_k=sum_(h=0)^(m-k) gamma_(a+h) (N_D)_h^fall/4^h
                    * unsigned_stirling1(m-h,k).     (8)
```

Define `v_0=1` and the reciprocal coefficients

```text
v_j=-sum_(ell=1)^j (q_ell A^ell/q_0)v_(j-ell).       (9)
```

Then the radical-free quotient coefficients are

```text
H_j=q_0^(-1) sum_(k=0)^j q_(m-k)v_(j-k),
h_j=A^((m-j)/2)H_j.                                  (10)
```

In particular the remaining inequality is the rational inequality

```text
A^4(H_(m-3)H_(m-1)-H_(m-2)^2)^2
 > 2 sum_(j=0)^(m-2) A^(m-j)H_j^2
   +A H_(m-1)^2-1,                                  (11)
```

together with

```text
A^3H_(m-3)^2+A^2H_(m-2)^2>1.                        (12)
```

Equations (4)--(12) remove all square roots and make the desired
coefficient-positivity attack precise.  They also show why a fixed-size local
expansion is unavailable: the reciprocal recursion (9) genuinely has depth
`m-1`.  A successful coefficient proof must exploit sign regularity or a
uniform majorant for the entire reciprocal sequence, rather than merely
expand the last three terms.

The independent replay
`verify_lower_selector_post_sector_natural_coordinates.py` checks both charts
in all 36,683 cells with `m>=6` through `d=50` (19,409 unforced and 17,274
forced) and independently reconstructs (8)--(10) on a compact exact diamond.
It reports `PASS_EXACT_POST_SECTOR_NATURAL_COORDINATE_REDUCTION` in
`lower_selector_post_sector_natural_coordinates_exact_20260812.json`.  The
source and report SHA-256 hashes are respectively
`5BE13317CBB4F419DA1BB89FF463A8971360921E3694FDC8A553DBBD1CE46DE2` and
`28C9D1A955ADA83EF38F7AFACFB6EDFFE05A24D05DE98C572AAFCBA158D697EE`.
The finite chart count is a transcription check; (4)--(12) are exact
algebraic identities.
