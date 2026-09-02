# Affine bridge: matched source-degree certificate at the least-curvature window

This note retains the literal path relation between the affine source `Q`
and the positive reserve source `R`.  It gives a new exact symbolic
certificate at the member of the 953 required reflection windows having the
least direct-curvature quotient.  The certificate is finite: it is not an
all-parameter proof of the affine bridge.

## 1. The source-coupled target

Put

\[
 a_j={n\choose j}\rho_j,
 \qquad \bar e_j={n\choose j}e_j,
\]

where

\[
 \rho_j=[z^Dw^D](z+w)^jXR,
 \qquad
 e_j=[z^Dw^D](z+w)^jX\{Q+jR\}.
\]

The stronger direct target is equivalent, after clearing positive factors,
to

\[
\begin{split}
 \Gamma_h={}&hn,a_{h+2}
   \{a_h^3a_{h+2}-a_{h-1}a_{h+1}^3\}\\
 &+\bar e_{h+2}a_{h-1}a_{h+1}^3\ge0.             \tag{1}
\end{split}
\]

This is the exact target from the Euler-coupled reduction.  No generic
PF-infinity, proper-position, or differential-interlacing implication is
used; those implications have exact counterexamples.

## 2. Matched total-source-degree polarization

Split both literal evaluated sources by total source degree:

\[
 Q=\sum_d Q_d,\qquad R=\sum_d R_d.
\]

Introduce formal nonnegative multipliers using the *same* multiplier on the
matched pair:

\[
 Q(\lambda)=\sum_d\lambda_dQ_d,
 \qquad R(\lambda)=\sum_d\lambda_dR_d.             \tag{2}
\]

Thus (2) does not separate `Q` from `R`; it preserves their exact coupling
at every total source degree.  Every `a_j(lambda)` and `ebar_j(lambda)` is
linear in the `lambda_d`, so (1) is one homogeneous polynomial of degree
five.  Coefficientwise nonnegativity of this polynomial is a sufficient
symbolic certificate for every `lambda_d>=0`, including the required
specialization `lambda_d=1`.

The useful expansion is

\[
 \Gamma_h(\lambda)
 =hn,a_h^3a_{h+2}^2
 +(\bar e_{h+2}-hn,a_{h+2})a_{h-1}a_{h+1}^3.     \tag{3}
\]

## 3. Exact certificate at the least direct-curvature window

The least direct-curvature quotient in the complete existing 953-window
census is the bottom/odd path point

\[
 (m,x,n,h,D)=(30,60,50,11,84).
\]

At this point the specialized full sources have total-degree support
`14,...,35`.  Exact expansion of (3) has

```text
nonzero coefficients:        63,756
strictly positive:           63,756
negative:                         0
```

Therefore

\[
 \boxed{\Gamma_{11}(\lambda)>0}
\]

for every nonzero nonnegative matched degree vector `lambda`.  In
particular, the original exact path specialization `lambda_d=1` is proved
at the least direct-curvature audited window by a symbolic coefficient certificate, not
only by evaluating one large integer.

The replay reconstructs the outer polynomial `A^a T^b`, independently
aggregates every `Q_d` and `R_d` layer, and checks their sums against the
stored literal `q_j,rho_j,e_j` values before expanding (3).  It also hashes
the complete sorted stream of 63,756 exact coefficients, so the certificate
is reproducible without embedding a multi-megabyte coefficient list in the
report.

## 4. Why the joint expansion matters

A natural termwise injection would compare the five positive linear factors
against the negative part of the second product in (3) by the minimum
component ratios

\[
 {a_h\over a_{h-1}},\quad
 \left({a_h\over a_{h+1}}\right)^2,\quad
 {a_{h+2}\over a_{h+1}},\quad
 {a_{h+2}\over hn,a_{h+2}-\bar e_{h+2}}.
\]

After the outer factor `hn` is included, this sufficient bound is only
approximately `0.45812225<1`.  It fails even though every coefficient of
the full polynomial (3) is positive.  The certificate therefore records a
genuine cross-degree cancellation.  A proof that replaces the coupled
polynomial by independent worst-factor bounds loses more than half of the
available payment at this point.

## 5. Exact status

The replay also rechecks all 953 required windows at `lambda_d=1` and finds
zero failures of either the direct curvature inequality or the stronger
Euler-coupled inequality.  No genuine allowed path-window counterexample is
found.

The following distinctions are essential:

* **All-order reduction:** equations (1)--(3) and the sufficiency of
  coefficientwise positivity.
* **Exact symbolic theorem at one path window:** all 63,756 coefficients are
  strictly positive at `(m,x,n,h)=(30,60,50,11)`.
* **Finite evidence:** the unspecialized 953-window census at
  `lambda_d=1`.
* **Still open:** coefficientwise positivity uniformly in all path
  parameters and reflection windows, or another all-order proof of (1).
* **No-go shield:** PF-infinity, Euler sign, generic proper position, and
  strict differential interlacing remain insufficient without the literal
  finite path-source relation.

Run:

```text
python verify_affine_bridge_source_degree_coupled_certificate.py
```

It writes
`affine_bridge_source_degree_coupled_tight_window_exact_20260813.json` and
reports

```text
PASS_EXACT_TIGHT_WINDOW_SOURCE_DEGREE_COUPLED_CERTIFICATE
```
