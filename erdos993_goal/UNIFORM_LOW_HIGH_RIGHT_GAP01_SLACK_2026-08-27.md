# Simultaneous right gap-0 and gap-1 slack theorem

## Statement

For every integer `k >= 8` and all real `x,y,s,t >= 0`, take

- left ratios `(x+k+1, x+k-1, x+k-2, ..., x)`, and
- right ratios `(y+k+1+s+t, y+k-1+s, y+k-2, ..., y)`.

Then the complete strong auxiliary

`(x+k-2) M(c) + B(c,v)`

is strictly positive.

This is the translated low/high boundary with arbitrary simultaneous slack in
the first two right-row gaps.  It is an all-rank boundary theorem, not a proof
of the full Erdős Problem #993.

## Quadratic lift

Fix the gap-1 slack `s` and set

`rho = y+k+1+s`, `q=t/rho >= 0`.

Increasing the top right ratio scales every positive-degree right coefficient
by `1+q`.  If `A` is the right-degree-zero contribution, then

`C(q)=C+q(C-A)` and `V(q)=V+q(V-A)`.

The removed left vector has the form

`A=(a, a(r+1), ar(r+1))`,

so `M(A)=0`.  Exact expansion therefore gives

`H(q)=(1+q)H0 + q(1+q)H2`.

The independently audited right-gap-1 theorem gives `H0>0`.  It remains only
to prove `H2>0`.

## The new H2 payment

Factoring `rho` from both direction vectors gives

`H2=rho^2 (G0+s G1+s^2 G2)`.

- `G0>0` is the independently audited right-gap-0 payment over the zero-slack
  face.
- For `G1` and `G2`, the `T*R/R^2` block is exactly a positive multiple of the
  previously accepted `s^4` right-gap-1 payment.
- The remaining `T*L/L^2/L*R` block is split into `x>=y` and `y>=x`.

For `x>=y`, write `x=y+z`.  Use the cubic binomial lower bound for `T/L` and

`R/L <= ((y+k)/(x+k))^7`.

The four reduced numerator certificates have respectively 175, 727, 128, and
716 strictly positive coefficients; every minimum is 1.

For `y>=x`, write `y=x+z`.  The degree-1 `L^2` coefficient is negative and the
degree-2 coefficient is positive, each certified by 10 same-sign numerator
coefficients.  The two regional reserves each have 398 strictly positive
coefficients with minimum 1.

All denominator coefficients in these canonical fraction-field certificates
are strictly positive on the nonnegative orthant.

Hence `H2>0`, and therefore

`H(q)=(1+q)H0+q(1+q)H2>0`.

## Exact artifacts

- Structural lift source:
  `probe_uniform_low_high_right_gap01_normalized_lift_root.py`
  (`446CD87FB6D5EA9D84B2927FEE6E198A677FE01E4EDF8852B242481A42441CC8`)
- Structural lift report:
  `uniform_low_high_right_gap01_normalized_lift_probe_root_20260827.json`
  (`5C4AE307561634F6E583FEE6F2C3FC4C1333465E09C6BAB39235C2B202DC8501`)
- H2 payment source:
  `probe_uniform_low_high_right_gap01_h2_field_root.py`
  (`606EE39FED2325291825665C33CC947EB4CE0A70F7E68A771D8E0C35ED38C833`)
- H2 payment report:
  `uniform_low_high_right_gap01_h2_field_probe_root_20260827.json`
  (`BD1C1159462C6731B8C37228DA7B376C8D365F8EE5A417D9CECD8B31F38D4F4C`)
- Theorem assembler source:
  `prove_uniform_low_high_right_gap01_slack_root.py`
  (`57BDA0D6A2A1D4C713D66EEBA1EEF5706AB433B115D08DD8E5484B227B930BEC`)
- Theorem report:
  `uniform_low_high_right_gap01_slack_exact_root_20260827.json`
  (`F5864694119A2BE825AA25E5F54ACCB94C09BC6F263622A22FA7A50948F38723`)
- Independent audit source:
  `audit_uniform_low_high_right_gap01_slack_independent_root.py`
  (`867ECBB8F3207EB64ACEFAB37B7426787F7AB71B0E2BDF10664B0342B160C408`)
- Independent audit report:
  `uniform_low_high_right_gap01_slack_independent_audit_root_20260827.json`
  (`1143E497957696A02299E1DD7C2EA5B4355173D28DC48D0FA0B8968A2776F11D`)

The independent audit reconstructs the factored H2 rows directly from the
zero-slack `T/L/R` vectors, replays every ordered coefficient hash, checks the
right-payment scaling, verifies the abstract quadratic identity, and repeats
the direct integer convolution evaluations.
