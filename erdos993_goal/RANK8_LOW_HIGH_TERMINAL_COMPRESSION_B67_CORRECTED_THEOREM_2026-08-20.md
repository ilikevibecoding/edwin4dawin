# Corrected rank-8 low/high terminal-compression theorem

Let `P` be the exact rank-8 low/high base-payment polynomial.  On the full
remaining gap cone, the two highest partner gaps may be eliminated in order.

For `b7=z`, absorbing `z` into the terminal ratio gives the exact identity

`P(tb,b7=z) = P(tb+z,b7=0) + z*c7*q8`.

After setting `b7=0`, for `b6=z` the exact identity is

`P_actual - P_terminal_shift = z*q7*Q + z^2*q7*(c7-q7)`,

where

`Q = c7*(2*tb+h+9*a1)-2*c8`.

The corrected full-cone scan has 371,056 coefficients in `Q`, with zero
negative coefficients and minimum positive coefficient 7.  The factor
`c7-q7` has 126,988 coefficients, zero negative coefficients, and minimum
positive coefficient 1.  Therefore a proof of `P>=0` with `b6=b7=0`
extends to arbitrary nonnegative `b6,b7`.

The producer is
`verify_rank8_low_high_base_payment_terminal_compression_b67.py`, SHA-256
`F428BF4B0B27D0099041EF630937E7E95114E0674121A620F115AFC9B7C9F557`.
Its report
`rank8_low_high_base_payment_terminal_compression_b67_corrected_exact_20260820.json`
has SHA-256
`A5648D9EEBCE43C6D8CFFB7A52C790710FB85ACB91302511886D27D85E9B77C1`.

A separate derivation and coefficient reconstruction passes:

- audit source SHA-256
  `707FAE18FB1BC8CE0966E7F11DD2C4FD076F7276BE8188D26384E8A5E2B87502`;
- audit report SHA-256
  `10E8B341308525B658873D9F5FA6E5764BD7DD4E09FA46CF0A8C734EB5D040D5`.

The superseded v1 artifacts used `2*h` in `Q` and are explicitly withdrawn in
`RANK8_LOW_HIGH_TERMINAL_COMPRESSION_B67_V1_WITHDRAWAL_2026-08-20.md`.
This theorem eliminates only `b6,b7`; the simultaneous `b3,b4,b5` payment and
its interaction with all low-side slacks must still be closed separately.
