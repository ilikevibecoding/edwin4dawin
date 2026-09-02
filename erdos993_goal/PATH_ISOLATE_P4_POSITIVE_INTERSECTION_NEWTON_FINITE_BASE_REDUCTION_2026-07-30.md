# Stable path P4: \(h\ge1\) Newton finite-base reduction

For the internal fixed-intersection group, put

\[
D_\epsilon(c,m,s,x)
=G(c,m+1,s,x,\epsilon)-G(c,m,s,x,\epsilon).
\]

The all-\(c\) inequality is false at \(c=0\), but the stable-P4
replacement route only needs this lift for \(c=h\ge1\).

Form

\[
F_\epsilon(c,m,x;z)=
\sum_{r\ge0}
\left.\Delta_s^rD_\epsilon(c,m,s,x)\right|_{s=-1}z^r.
\]

## Sufficient uniform statements

It is enough to prove, for \(c\ge1,\ c+m\ge4\),

\[
F_\epsilon(c,m,x;z)
=(1+z)^{2c+2m+x-1}z^\epsilon
P_\epsilon(c,m,x;z),
\tag{1}
\]

and the three coefficientwise recurrences

\[
\begin{aligned}
P(c+1,m,x;z)&\succeq P(c,m,x;z),\\
P(c,m+1,x;z)&\succeq P(c,m,x;z),\\
P(c,m,x+1;z)&\succeq P(c,m,x;z).
\end{aligned}
\tag{2}
\]

Every admissible \((c,m)\) coordinatewise dominates exactly one of

\[
(1,3),\quad(2,2),\quad(3,1),\quad(4,0).
\]

Thus (2) reduces every parameter choice to these four pairs at
\(x=0\).  For both parities, all eight corresponding base
polynomials were already computed exactly and proved
coefficientwise nonnegative as part of
`prove_path_isolate_p4_general_layer_lift_newton_quotient_bases.py`.

Consequently, (1)--(2) imply \(P_\epsilon\succeq0\), hence
\(F_\epsilon\succeq0\).  The Newton basis is nonnegative for
\(s\ge-1\), so

\[
G(c,m+1,s,x,\epsilon)\ge G(c,m,s,x,\epsilon)
\qquad(c\ge1).
\]

Repeated use of this lift reduces every \(H(j,h)\) with \(h\ge2\)
to the already proved \(h=j\) or \(h=j-1\) edge.

## Extended exact evidence

A stratified complete-polynomial audit at

\[
c\in\{1,2,4\},\quad m\in\{0,3,6\},\quad
x\in\{0,12,45\}
\]

made 3,138 Newton-coefficient checks, 1,296 exact factor divisions,
and 1,821 quotient-coefficient checks over 42 admissible
polynomials, with no failure.

The sharper danger-band audit used

\[
1\le c\le4,\quad0\le m\le6,\quad c+m\ge4,\quad
x\in\{44,45,46\},
\]

and both parities.  Its exact totals were:

- 132 complete polynomials;
- 16,692 Newton-coefficient checks;
- 7,488 exact divisions by \(1+z\);
- 9,138 quotient-coefficient checks;
- 20,083 coefficient comparisons for (2);
- zero failures.

This band contains the large-excess obstruction that refutes the
\(c=0\) lift.  The clean survival for every \(c\ge1\) is therefore
substantive evidence for the restricted theorem.

The replayable artifacts are
`path_isolate_p4_positive_intersection_newton_factor_stratified_20260730.json`
and
`path_isolate_p4_positive_intersection_newton_danger_band_20260730.json`.
The factorization and recurrences in (1)--(2) remain uniform proof
obligations; the finite-base implication is exact.

## Stronger path-extension recurrence

The observed recurrences have the sharper common form
\[
\begin{aligned}
P(c+1,m,x;z)&\succeq(1+2z)^2P(c,m,x;z),\\
P(c,m+1,x;z)&\succeq(1+2z)^2P(c,m,x;z),\\
P(c,m,x+1;z)&\succeq(1+2z)P(c,m,x;z).
\end{aligned}
\tag{3}
\]
Thus every added stable-path vertex contributes the same baseline
factor \(1+2z\).  An exact audit of 290 complete polynomials on
\[
1\le c\le5,\quad0\le m\le6,\quad c+m\ge4,\quad0\le x\le4
\]
made 19,680 coefficient comparisons for (3), with no failure.

More importantly, (3) is already proved uniformly through the first
four formal quotient orders.  After \(c=1+C\), all 24 rational
coefficient recurrences (three coordinates, two parities, four
orders) have nonnegative numerator and denominator coefficients for
all \(C,m,x\ge0\).  The exact records are
`path_isolate_p4_positive_intersection_quotient_multiplicative_stress_20260730.json`
and
`path_isolate_p4_positive_intersection_initial_multiplicative_recurrence_order0_to_3_20260730.json`.

The shared multiplier in this package and in the repaired bottom-pair
package suggests that the two uniform proof obligations should be
attacked by one path-extension operator identity rather than as
unrelated coefficient inequalities.
