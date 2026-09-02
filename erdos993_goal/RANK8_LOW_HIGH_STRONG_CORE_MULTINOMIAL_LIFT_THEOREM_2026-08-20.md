# Rank-8 low/high direct-H left-prefix core theorem (2026-08-20)

## Exact statement

Let `H_str = C*M0 + h*d` be the direct strong auxiliary in the rank-8
low/high reduction.  On the face

`a0 = a2 = b3 = b4 = b5 = b6 = b7 = 0`,

`H_str >= 0` for every nonnegative value of
`h,ta,a3,a4,a5,a6,a7,tb,b0,b1,b2`.

## Certificate

The independently audited `a3,a4` AM-GM certificate has 1,950 negative rows.
Substitute

`ta -> ta + a5 + a6 + a7`

in every row.  The resulting multinomial expansion:

- matches all 11,883 negative coefficients of the full left-prefix core;
- uses 28,493 positive source monomials;
- has no source-capacity deficit against the exact core polynomial.

The target was checked as a stream: 4,975,819 nonzero terms, of which
4,963,936 are positive and 11,883 are negative.  This avoids materializing a
multi-gigabyte coefficient dictionary.

## Frozen artifacts

- Producer `verify_rank8_low_high_strong_core_multinomial_lift.py`:
  `7CD865F1FCFAC817A96EE52AF4C953F671848104F25372FDDD3AE919C937CDAB`
- Exact report `rank8_low_high_strong_core_multinomial_lift_exact_20260820.json`:
  `FD6D13C4B290594EBD7D0763E0542683EBCE94B61D9C7F58EA0F508EA8F7786F`
- Independent audit `audit_rank8_low_high_strong_core_multinomial_lift.py`:
  `CDE59D66F87563EC1145C6EA1E40F204977D6AE9E9AF755DE5EAF30534CE72C0`
- Independent audit report
  `rank8_low_high_strong_core_multinomial_lift_independent_audit_20260820.json`:
  `3C950FAD8F8923CB0D10A33EE4C804C43A343DD1F0A0038F2AB428E5E386087D`

## Scope

This is a direct-H face theorem.  The separately certified `a0,a2` lift can
extend the left side, and the separately certified terminal compression removes
`b6,b7`; the simultaneous `b3,b4,b5` join is still required.  This note makes
no standalone full low/high, low/low, Q8, PGC, or Problem 993 claim.
