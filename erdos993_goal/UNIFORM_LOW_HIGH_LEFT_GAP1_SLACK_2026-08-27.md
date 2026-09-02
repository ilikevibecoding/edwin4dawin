# Uniform left gap-1 slack theorem

## Statement

For every integer `k >= 8` and all real `x,y,s >= 0`, take

- left ratios `(x+k+1+s, x+k-1+s, x+k-2, ..., x)`, and
- right ratios `(y+k+1, y+k-1, y+k-2, ..., y)`.

Then the complete strong auxiliary

`(x+k-2) M(c) + B(c,v)`

is strictly positive.  This is an exact all-rank translated-boundary theorem,
not a proof of the full Erdos Problem #993.

## Quartic reduction

The first two left ratios are linear in `s`.  Every left coefficient of degree
at least two is therefore multiplied by

`((x+k+s)^2-1)/((x+k)^2-1)`,

while the oriented left-tail convolution is multiplied by the same factor.
The auxiliary is a quartic in `s`.

For each positive slack degree `1,2,3,4`, exact `T/L/R` reduction gives

`alpha*T*L + beta*T*R - gamma*L*R - delta*R^2`.

The `T^2` and `L^2` coefficients vanish.  Exact sparse certificates show
`alpha>0` and `beta-delta>0` in every row.

## The `x>=y` chart

Put `x=y+z`.  Here `R/L<=1`, and `T/L` is bounded below by the cubic
binomial truncation with base `(y+k)/(x+k)`.  Exact positive-coefficient
certificates prove both reserves required by the two signs of `delta`:

- `beta*(T/L lower bound)-gamma-delta>0` when `delta>=0`;
- `beta*(T/L lower bound)-gamma>0` when `delta<0`.

The needed `beta>0` certificate is also exact in this chart.

## The `y>=x` chart

Put `y=x+z`, `N=x+k`, and `M=y+k`.  Since `k>=8`,

`L/T <= L/R <= (N/M)^7`.

For `V=T/R`, the union bound and a paired-endpoint convexity estimate give

`1-1/V <= (k-1)N/2 * (1/(x+y+k+2)+1/(x+y+2k))`.

The endpoint estimate follows by pairing the terms indexed by `j` and
`k+2-j`; the difference from the endpoint pair factors into nonnegative
factors.

Splitting on the signs of `delta` and `gamma` leaves three reserves in
addition to `beta-delta`.  Every transformed numerator and denominator
coefficient in all four slack degrees is strictly positive.  Hence all four
positive quartic coefficients are positive; the constant coefficient is the
independently audited zero-slack theorem.

## Independent replay

The independent audit imports neither the producer nor its row builder.  It
reconstructs the left-degree `0`, `1`, and `>=2` convolution blocks directly,
recomputes all four quartic product rows, replays every ordered sparse hash,
checks the paired-endpoint identity, and repeats the direct integer
convolutions.  Its certificate dictionaries equal the producer exactly.

## Exact artifacts

- Theorem source:
  `prove_uniform_low_high_left_gap1_slack_root.py`
  (`089B45E3BDC4149CE4CF1DE19AEAEE3F8057C848CF6CB127263B54C4F80D50D2`)
- Theorem report:
  `uniform_low_high_left_gap1_slack_exact_root_20260827.json`
  (`ED93FB61FE756B2B0186549B260F96FF9B9BEE36303492F185C9404B2B2153EA`)
- Independent audit source:
  `audit_uniform_low_high_left_gap1_slack_independent_root.py`
  (`354180A825047280E994AB8CCF1697EA6662D3FC642B4ACE2A5BC60E3FA8041F`)
- Independent audit report:
  `uniform_low_high_left_gap1_slack_independent_audit_root_20260827.json`
  (`91938449F8C915CB30A80B96B128E7929A269BAFBC19D980A70CAC30F8DE2F89`)

This closes the isolated left gap-1 coordinate uniformly in rank.  Its
simultaneous interaction with the previously closed three-coordinate face is
a separate remaining theorem.
