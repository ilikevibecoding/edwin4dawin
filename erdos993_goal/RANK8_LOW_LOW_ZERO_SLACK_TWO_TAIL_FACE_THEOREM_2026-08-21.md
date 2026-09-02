# Rank-eight low/low zero-slack two-tail face theorem

## Theorem

On the terminal face where every adjusted gap slack is zero, the rank-eight
low/low convolution margin is nonnegative for both tail coordinates throughout
their full intervals:

`0 <= x <= h/C` and `0 <= y <= h/D`.

The terminal parameters `h,ta,tb` remain arbitrary and nonnegative.  Thus this
is a genuine two-dimensional low/low face theorem, not an endpoint scan.

## Exact proof

The audited double-tail reduction writes

`M(x,y)=M(0,y)+x*d_x(y)+x^2*q_x(y)`.

The full low/high theorem supplies `M(0,y)>=0`.  The two remaining auxiliaries
are quadratic in `y`.

For `q_x(y)`, the base and middle Bernstein coefficients have 126 exact terms
each and no negative coefficients.  The far coefficient has 125 terms and only
two negative monomials.  Four distinct positive monomials pay those two terms
by exact midpoint AM-GM inequalities; an independent reconstruction verifies
the same polynomial and allocations.

For `C*M(0,y)+h*d_x(y)`, the base, doubled middle, and far Bernstein
coefficients have respectively 6, 6, and 10 negative monomials.  Exact
disjoint midpoint AM-GM allocations pay all 22.  An independent verifier
reconstructs the three coefficients directly from the `t=-h,0,h` ratio rows
and rechecks every allocation.

All Bernstein weights are nonnegative on the interval, so both auxiliaries are
nonnegative throughout the right-tail interval.  If `d_x(y)>=0`, the
`x`-quadratic is at least its nonnegative base.  If `d_x(y)<0`, convexity and
`x<=h/C` give

`M(x,y) >= M(0,y)+(h/C)d_x(y) = [C*M(0,y)+h*d_x(y)]/C >= 0`.

## Sealed artifacts

- assembly: `assemble_rank8_low_low_zero_slack_two_tail_face.py`
  (`714D2BADF88CDEDBDDFD7B0A914EA950003D80BF7DD8ED64E5E14AFFE379726A`)
- assembly report: `rank8_low_low_zero_slack_two_tail_face_exact_20260821.json`
  (`DC70DA88AD6E86045DEAF624EB68BB0F5AC2AC9AE0757126035DE17C7CDED732`)
- independent audit: `audit_rank8_low_low_zero_slack_two_tail_face.py`
  (`802F09C9DB07C41C69CABBDE42A53EEAE04BB610D3D4B6D7CFE14234CBB09897`)
- independent audit report:
  `rank8_low_low_zero_slack_two_tail_face_independent_audit_exact_20260821.json`
  (`FA8C78091519B88FAB7F617B2224DE634A35E176B1636E33E0D37C6C1DFA11F1`)
- curvature far AM-GM report:
  `rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json`
  (`E90CD40EDDE350EFAF23DB9738964146C0C5358CB2893560313772D1A9CB1C4C`)
- curvature independent audit report:
  `rank8_low_low_tail_curvature_far_zero_slack_amgm_independent_audit_exact_20260821.json`
  (`6F4B40ABA29A55207ED5371786348300090AB00E326D3E7BEFCFA528E3D333AB`)
- strong-payment AM-GM report:
  `rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json`
  (`8C390F8C24F663B551B63D0E80FA9DF8894A2759D06DE5EA181CFB1E26636911`)
- strong-payment independent audit report:
  `rank8_low_low_strong_payment_zero_slack_amgm_independent_audit_exact_20260821.json`
  (`CCC40D4325ACD001328156374DA1F82DA84328B9BFE9F4713C368F69B31BD9E3`)

## Scope

The lift through arbitrary adjusted gap slacks remains open.  Consequently
this theorem does not yet prove the full low/low cone, forest `Q8`, the
rank-eight PGC, or Problem 993.
