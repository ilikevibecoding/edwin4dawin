# Consecutive-path Christoffel--Darboux positivity

Date: 2026-08-29

Status: **exact all-order coefficientwise theorem.**  This is a path-kernel
lemma, not a proof of the double-broom four-minor, all-forest ISO, or Erdős
Problem 993.

Let the path independence polynomials be

\[
P_0(x)=1,\qquad P_1(x)=1+x,\qquad
P_m(x)=P_{m-1}(x)+xP_{m-2}(x).
\]

For `m>=1`, define

\[
H_m(z,w)=
\frac{P_m(z)P_{m-1}(w)-P_m(w)P_{m-1}(z)}{z-w}.
\]

Then `H_m` has nonnegative integer coefficients for every `m`.  More
precisely,

\[
H_1=H_2=1,
\qquad
H_m=P_{m-2}(z)P_{m-2}(w)+zwH_{m-2}\quad(m\ge3).
\]

The recurrence follows by substituting the path recurrence twice and dividing
the resulting alternating numerator by `z-w`.  Every summand on its right is
coefficientwise nonnegative, which proves the theorem by induction.

The exact quotient appearing in the two-ended-broom calculation is the same
kernel one index later:

\[
\frac{wP_m(z)P_{m-1}(w)-zP_m(w)P_{m-1}(z)}{w-z}=H_{m+1}(z,w).
\]

`prove_path_consecutive_cd_positivity_agent.py` checks the generic symbolic
derivation and independently constructs and divides the literal path
polynomials through order 80.  The finite replay is a sanity check; the
displayed recurrence is the all-order proof.

## Scope

This lemma supplies a nonnegative exact carrier for the antisymmetric
consecutive-path factor in the double-broom Newton expansion.  The remaining
signed diagonal kernel still has to be paid before the double-broom theorem
can be claimed.
