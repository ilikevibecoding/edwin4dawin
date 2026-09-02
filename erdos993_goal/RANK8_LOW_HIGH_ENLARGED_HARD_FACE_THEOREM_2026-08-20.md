# Rank-eight low/high enlarged hard-face theorem

Date: 2026-08-20

Status: **exact theorem on the enlarged signed face; not yet the complete
low/high convolution-cone theorem.**

## Statement

For the rank-eight factorial convolution margin

```text
M=c8^2-c7*c9-h*c7*c8,
```

take the low factor on the endpoint

```text
delta1=0,
delta2=2h,
d0=d2=0,
```

and retain arbitrary nonnegative low slacks `d3,...,d7`, arbitrary terminal
ratios, and the high-factor slacks `b0,b1,b2`, while setting
`b3=...=b7=0`.  Then `M>=0`.

## Exact certificate

The literal face margin has `3,303,115` nonzero integer coefficients, of
which `4,813` are negative in the raw monomial basis.  It has the positive
factor

```text
A0=9h+ta+a3+a4+a5+a6+a7.
```

The quotient has `2,135,750` nonzero terms and `1,622` negative terms.
Every negative term is paid by one exact midpoint AM-GM block.  The
allocation has:

```text
blocks                         1,622
minimum quadratic slack           0
smallest positive-source remainder 25,632
```

Zero quadratic slack means that some blocks attain equality; no block is
negative and no positive source coefficient is overdrawn.

## Independent audit

The independent auditor reconstructs the two factor rows and the convolution
from the gap definitions, divides by `A0`, and verifies all `1,622`
allocation rows.  For every row it checks the exact midpoint identity,
quadratic AM-GM inequality, negative demand, and cumulative positive-source
usage.  It obtains the same margin and quotient statistics and passes.

## Scope

This theorem closes exactly the enlarged signed face above.  Separate exact
one-variable probes show why `b2` must be retained, but those probes do not
by themselves prove that simultaneous positive exponents in the remaining
off-face variables are coefficientwise nonnegative.  That no-gap scan is
still required before promoting this result to the full low/high cone.

It does not prove the low/low cone, forest `Q8`, rank-eight PGC, or Problem
993.

## Replay

```powershell
python .\verify_rank8_low_high_enlarged_hard_face.py
python .\audit_rank8_low_high_enlarged_hard_face.py
```

Primary report:

```text
rank8_low_high_enlarged_hard_face_exact_20260820.json
SHA-256 76FBB5C10259CAEA52924E4A70D14DC7B019D24C2C5BE3085438ECBDDC05B522
```

Independent audit report:

```text
rank8_low_high_enlarged_hard_face_independent_audit_exact_20260820.json
SHA-256 6E3F220E851D54C4FF552988F5983B3A731D7845B6F984A685334A29C438FF82
```
