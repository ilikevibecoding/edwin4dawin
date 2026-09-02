# Withdrawal: rank-8 low/high terminal-compression v1

The artifacts

- `verify_rank8_low_high_base_payment_terminal_compression_b67.py` at SHA-256
  `521DBD79CF23D3CF01C1A003E0BFE5B5413B5F0FD6A774E0FF5269A60AB017F2`, and
- `rank8_low_high_base_payment_terminal_compression_b67_exact_20260820.json`
  at SHA-256 `CFD5026BF00B8F8E194FB9AEC11AE9D64BDB8F759A95ECBC7DFC5562BFB3DCC8`

are withdrawn and must not be used.  Their stated b6 linear correction used
`2*h`; exact expansion gives `h`:

`Q = c7*(2*tb + h + 9*a1) - 2*c8`.

The corrected producer is
`verify_rank8_low_high_base_payment_terminal_compression_b67.py` at SHA-256
`F428BF4B0B27D0099041EF630937E7E95114E0674121A620F115AFC9B7C9F557`, with
report `rank8_low_high_base_payment_terminal_compression_b67_corrected_exact_20260820.json`
at SHA-256 `A5648D9EEBCE43C6D8CFFB7A52C790710FB85ACB91302511886D27D85E9B77C1`.
The corrected coefficient scan passes.  A separate independent audit also
passes (source SHA-256
`707FAE18FB1BC8CE0966E7F11DD2C4FD076F7276BE8188D26384E8A5E2B87502`,
report SHA-256
`10E8B341308525B658873D9F5FA6E5764BD7DD4E09FA46CF0A8C734EB5D040D5`).

This correction affects only this intermediate terminal-compression artifact.
It does not alter the prior rank-7 theorem, the rank-8 finite censuses, or any
other sealed result.
