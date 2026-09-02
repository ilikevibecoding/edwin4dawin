# Left gap-0 over simultaneous right gap-0 and gap-1 theorem

## Statement

For every integer `k >= 8` and all real `x,y,a,s,t >= 0`, take

- left ratios `(x+k+1+a, x+k-1, x+k-2, ..., x)`, and
- right ratios `(y+k+1+s+t, y+k-1+s, y+k-2, ..., y)`.

Then the complete strong auxiliary

`(x+k-2) M(c) + B(c,v)`

is strictly positive.  This closes three simultaneous gap coordinates on the
translated low/high boundary.  It is not a proof of the full Erdos Problem
#993.

## Left top-gap lift

Normalize the left gap-0 slack by

`p=a/(x+k+1) >= 0`.

Let `C` and `V` be the whole and oriented-tail rows on the already certified
simultaneous right-gap01 face.  Increasing the first left ratio multiplies
every positive-degree left coefficient by `1+p`.  If `A` is the right-only
contribution, then

`C(p)=C+p(C-A)` and `V(p)=(1+p)V`.

The factorial row `A=(b,br,br(r-1))` satisfies `M(A)=0`.  Exact universal
expansion gives

`H(p)=(1+p)H0+p(1+p)K`.

The independently audited simultaneous right-gap01 theorem gives `H0>0`.
It remains to prove `K>0` on that entire face.

## Right top-gap reduction inside K

Fix the right gap-1 slack `s` and normalize the right gap-0 slack by

`q=t/(y+k+1+s) >= 0`.

Direct canonical fraction-field reconstruction gives, product by product and
for every coefficient of `s`,

`K1=K0+K2`.

Therefore

`K(q,s)=(1+q)K0(s)+q(1+q)K2(s)`.

Only the ten rows `(q-degree,s-degree) in {0,2} x {0,1,2,3,4}` require sign
certificates.

## Exact payments

Each row is split into the left block

`T*L*alpha + L^2*epsilon`

and the right block

`T*R*beta - L*R*gamma - R^2*delta`.

For the left block, degrees `s^0,s^1` use exact positivity of `alpha` and
`alpha+epsilon`.  Degrees `s^2,s^3,s^4` use exact positivity of `epsilon`,
`alpha+epsilon`, and the union-bound reserve.  Every transformed numerator
and denominator coefficient is strictly positive.

For the right block, the proof splits into `x>=y` and `y>=x`.  The first chart
uses `T/L >= 1+(k-1)(y+k)/(x+k)` and `R/L<=1`.  The second uses the cubic
binomial lower bound for `T/R` and `L/R<=((x+k)/(y+k))^7`, with separate
reserves according to the sign of `gamma`.  Exact sparse certificates prove
all ten rows strictly positive.

Hence `K0(s)>0` and `K2(s)>0` for every `s>=0`, so `K(q,s)>0` for every
`q,s>=0`.  The left lift then proves `H(p)>0` for every `p>=0`.

## Independent replay

The independent audit imports neither the payment producer nor the theorem
assembler.  It rebuilds the gap-1 whole and tail vectors directly, applies
both normalized top-gap lifts, rechecks `K1=K0+K2` in every product and
`s`-degree, and recomputes every ordered sparse coefficient hash.  All ten
certificate summaries match the producer exactly.  It also replays the
abstract null-row factorization and direct integer convolutions.

## Exact artifacts

- Payment source:
  `prove_uniform_low_high_left_gap0_right_gap01_payments_root.py`
  (`8F9FC8E73461BDC4C2C1EC28C47B4309A36AB508760E3185283053B56EA28602`)
- Payment report:
  `uniform_low_high_left_gap0_right_gap01_payments_root_20260827.json`
  (`587F99CD8025DC6433A5D87C2C975CBE04A6FECEB2075321B84413F0928159F7`)
- Theorem assembler source:
  `prove_uniform_low_high_left_gap0_right_gap01_slack_root.py`
  (`C97D477F79EC86CD998293CC6957516C78A353A157A8B12C47068EE55409B6DB`)
- Theorem report:
  `uniform_low_high_left_gap0_right_gap01_slack_exact_root_20260827.json`
  (`0A5DA773954EFBAA876DF45FB95D63A6F6D799D779761DF91C7F955CD6BCE55D`)
- Independent audit source:
  `audit_uniform_low_high_left_gap0_right_gap01_slack_independent_root.py`
  (`6A85FCD3363767EB240C2B6C21BD82A3A6F2F866AD15D676BF79F69B373F6E4C`)
- Independent audit report:
  `uniform_low_high_left_gap0_right_gap01_slack_independent_audit_root_20260827.json`
  (`88A440024EC2C7E898FA72FC8615451F2175127EFEE77B3556F00E68B77E5BD1`)

This is an exact all-rank boundary theorem with an independent replay, not a
finite search result and not a proof of the full conjecture.
