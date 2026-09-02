# Uniform low/high strong auxiliary with arbitrary right gap-1 slack

## Theorem

For every integer `k>=8` and every real `x,y,s>=0`, take

```text
L=(x+k+1,x+k-1,x+k-2,...,x),
R_s=(y+k+1+s,y+k-1+s,y+k-2,...,y).
```

For their binomial convolution `c` and the oriented left-tail convolution
`v`, the complete strong auxiliary satisfies

```text
(x+k-2) M(c) + B(c,v) > 0.
```

Thus the second ordinary gap coordinate of the right ratio row is closed
uniformly in rank on the translated low/high boundary.  Other gap coordinates
remain outside this theorem.

## Quartic product reduction

The right row is quadratic in `s`, so the auxiliary is quartic.  For each
positive power `s^j`, `1<=j<=4`, exact EGF reduction gives six possible
products in

```text
T=product(x+y+k+i,i=2..k),
L=product(x+i,i=2..k),
R=product(y+i,i=2..k).
```

The `T^2` coefficient vanishes.  After the positive rescaling used in the
certificate, each remaining row has the form

```text
T*L*alpha + L^2*epsilon
+ T*R*beta - L*R*gamma - R^2*delta.
```

The constant term is the independently audited two-parameter zero-slack
theorem.

## Left product payments

Put `U=T/L>1`.  For `s^1`, exact sparse positivity proves both
`alpha+epsilon>0` and `alpha>0`, hence

```text
alpha*U+epsilon=(alpha+epsilon)+alpha*(U-1)>0.
```

For `s^2,s^3,s^4`, exact sparse positivity proves `alpha+epsilon>0`,
`epsilon>0`, and the reserve required by

```text
1-1/U <= (k-1)(y+k)/(x+y+k+2).
```

Therefore the full `T*L/L^2` block is positive for every positive slack
power.

## Right product payments

The `T*R/L*R/R^2` block is split into `x>=y` and `y>=x` charts.  On `x>=y`,
the shifted sparse coefficient dictionaries are strictly positive.  On
`y>=x`, a quadratic lower bound for the product ratio and the upper bound

```text
W <= ((x+k)/(y+k))^7
```

reduce each row to three compact projective charts.  Their exact tensor
Bernstein arrays are nonnegative after at most one bisection.  The independent
audit reconstructs every chart by direct sparse monomial substitution, then
recomputes every ordered Bernstein hash.

## Independent row-identity audit

The 24 rational product rows were independently rebuilt by coefficient-array
convolution using exact `Fraction` arithmetic.  After clearing

```text
((k+x)(k+y)((k+y)^2-1)(x+2)(y+2)(y+3))^2,
```

a separately mirrored rational-degree DAG gives cross-difference
multidegree at most `(20,10,17)` in `(k,x,y)`.  The audit deliberately used
the larger envelope `(32,24,32)` and checked its determining tensor grid

```text
k=8..40, x=0..24, y=0..32.
```

All `27,225 * 24 = 653,400` exact rational comparisons agree.  Hence every
cached row is identically equal to the independently reconstructed row, not
merely equal at sampled theorem parameters.

The second independent stage replays all left payments, all right sparse and
Bernstein payments, both universal discriminant certificates, and eight direct
integer evaluations.

## Replay artifacts

```text
prove_uniform_low_high_right_gap1_slack_root.py
  SHA256 62D71D2C460C16B14209218F4622409537EA62317B7C748C68ACF30CA8206037

uniform_low_high_right_gap1_slack_exact_root_20260827.json
  SHA256 AB958CE36ED840E4CA9A10B70979BAEA464113B1632D4BBA1E2E86FB881D0684

audit_uniform_low_high_right_gap1_rows_interpolation_root.py
  SHA256 2D406C3263ABCE5E452B9616A7E7CB6C4CAF00378F08DC2D1ADFCAAAC1D86EFC

uniform_low_high_right_gap1_rows_interpolation_audit_root_20260827.json
  SHA256 598A179F63D5CB1354B79EDAB1469B57FEBD2E8A2571B28163FA29AC450E9088

audit_uniform_low_high_right_gap1_slack_independent_sparse_root.py
  SHA256 32C9D860AB96222E491EE83D2DE2FD61ED4010217DF58201E9AC574A98123E93

audit_uniform_low_high_right_gap1_payments_sparse_root.py
  SHA256 CEA6D27384CC932C4212F8CCCEDE19F68F4B3DC8130B5FC24147CBF30310E3C6

uniform_low_high_right_gap1_payments_sparse_audit_root_20260827.json
  SHA256 087A2A14F69F349E550F118F91AA24C1A7CAD32904ED82AF922C981E7DD9591D
```

This is an exact all-rank boundary theorem, but it is not a proof of the full
Erdos conjecture.
