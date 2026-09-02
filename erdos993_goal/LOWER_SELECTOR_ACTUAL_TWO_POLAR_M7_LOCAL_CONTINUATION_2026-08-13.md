# Actual-selector two-polar local continuation at the first unresolved order

Date: 2026-08-13

Status: rigorous path-specific local theorem for the complete order `m=7`.
This is a genuine but bounded repair of the refuted automatic second-polar
step.  It proves continuation through a uniform nonzero opening angle; it
does **not** prove continuation through the complete rotating semicircle and
does not close any order `m>=8`.

## 1. Failure shield and exact scope

Write

```text
F_r(d;z)=16 P_B[(q+u/4)(q+v/4)(4q-d)^r],     r=m-2.       (1)
```

The classical Laguerre polar theorem cannot be used here: the polar points
are inside, rather than outside, the desired rotating half-plane.  More
strongly, the exact counterexample

```text
k=2, B=31, R=21/20, s=(1+i)/sqrt(2),
u=1/8, v=3/25                                             (2)
```

has a safe first polar polynomial but a second-polar zero with

```text
Im(d)-Re(d)=-52321997/613547880<0.                         (3)
```

The other exact no-go from the safe-core reduction has

```text
m=7, r=5, B=27, R^2=55/2, u=v=1/32.                       (4)
```

All five anchor roots are positive, yet the smallest branch has negative
initial rotating height.  Therefore neither strip membership nor positive
anchor roots can replace the actual path relation between `u` and `v`.
Both counterexamples are replayed and retained below.

In this note `u=1/rho_1` and `v=1/rho_2`, where `rho_1<rho_2` are precisely
the two positive roots of the corrected lower-selector polynomial.  No
independent enlargement of the `(u,v)` chamber is asserted.

## 2. Local continuation criterion

Put

```text
z(psi)=R exp(2i psi),
h(psi)=Im(exp(-i psi)d(psi)),                               (5)
```

where `d(psi)` is a zero branch of (1).  At a simple positive anchor zero
`d_0` of `F_r(d;R)`, implicit differentiation gives

```text
h'(0)=-{2R F_z(d_0,R)+d_0 F_d(d_0,R)}/F_d(d_0,R).           (6)
```

Consequently, if every anchor root is simple and positive and every quantity
in (6) is positive, analytic continuation and continuity give an
`epsilon>0` for which every zero remains in `h>0` for `0<psi<epsilon`.
This is a theorem, not a mesh assertion.  For a finite family, the minimum
of its finitely many branch neighborhoods supplies a common positive
`epsilon`.

## 3. Complete `m=7` theorem

**Theorem.**  There is a number `epsilon_7>0` such that, for every actual
corrected lower-selector near-sector cell with `m=7`, every zero of (1)
satisfies

```text
Im(exp(-i psi)d)>0,       0<psi<epsilon_7.                  (7)
```

There are exactly 52 such cells.  The near-sector coordinates force
`e=2m-d` to be `0,1,2`, hence `d=12,13,14`; direct enumeration from the
integer selector definitions gives all four parity charts

```text
(e,sigma)=(0,0),(1,0),(1,1),(2,1).                         (8)
```

For every one of the 52 exact integer selector polynomials, rational Sturm
counting gives exactly two positive and five negative roots.  Certified Arb
root balls, starting from these exact integer polynomials, isolate the two
positive roots and hence enclose their actual reciprocals `(u,v)`.  The exact
Meixner recurrence then constructs `F_5` and `F_z` with certified balls.
After imposing the algebraically exact degree drop from seven to five, the
replay isolates all 260 anchor roots.  Every root is simple and strictly
positive, and interval evaluation of (6) is strictly positive on every
isolating ball.  The smallest certified lower bound is positive.  The local
criterion and finiteness now prove (7).

The interval layer is not a floating root mesh: Arb balls are outward-rounded
certificates containing the exact quantities generated from the exact
integer selector input.  The separate Sturm count is over `QQ` exactly.

## 4. What this repairs and what remains

This theorem supplies a valid structured second-polar continuation on a
nonempty angular subregion for the complete first unresolved order `m=7`.
It is path-specific and retains both actual selector reciprocals.  Thus it
materially repairs the proof chain locally where the automatic Laguerre step
was false.

It does not supply an explicit optimized value of `epsilon_7`; existence is
all that follows from the strict certified signs and the implicit-function
argument.  More importantly, it does not exclude a later crossing before
`psi=pi/2`, and it proves nothing for `m>=8`.  Therefore Section 106.3 still
needs a global no-crossing or circular-domain/topological invariant retaining
the actual `(u,v)` pair.  Erdős Problem #993 remains open.

The companion replay is
`verify_lower_selector_two_polar_m7_local_continuation.py`; it writes
`lower_selector_two_polar_m7_local_continuation_exact_20260813.json` and
reports

```text
PASS_RIGOROUS_ACTUAL_SELECTOR_M7_TWO_POLAR_LOCAL_CONTINUATION.
```
