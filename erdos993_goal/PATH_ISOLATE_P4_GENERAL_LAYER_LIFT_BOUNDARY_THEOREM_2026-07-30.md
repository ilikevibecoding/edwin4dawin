# Stable path P4: general two-layer lift boundary

> **Sharp stopping point.**  The seven diagonals proved here,
> \(s=-1,\ldots,5\), do not extend to all \(s\).  At \(s=6\),
> \((c,m,x,\epsilon)=(0,8,45,0)\) gives the exact negative residual
> \(-370\,223\,319\,778\,868\,094\,596\).  Thus this document is a
> valid boundary theorem, not the beginning of a globally monotone
> lift.  See
> `PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_COUNTEREXAMPLE_2026-07-30.md`.

Let \(Q_q^L(a,b)\) be the distinguished-isolate kernel and define

\[
G(c,m,s,x,\epsilon)=
\sum_{u=0}^{2m+\epsilon}
\binom{2m+\epsilon}{u}
Q_q^L(c+u,c+2m+\epsilon-u),
\]

where

\[
q=c+m+s+2,\qquad L=2q-4+x,
\]

\(c,m,x\ge0\), and \(\epsilon\in\{0,1\}\).  The corresponding
fixed-intersection group is

\[
H_q^L(c+2m+\epsilon,c)
=\binom{c+2m+\epsilon}{c}\,G(c,m,s,x,\epsilon).
\]

The desired two-layer lift is

\[
G(c,m+1,s,x,\epsilon)\ge G(c,m,s,x,\epsilon).
\tag{1}
\]

This note proves (1) for the first seven support diagonals
\(s=-1,0,1,2,3,4,5\) on the application domain \(c+m\ge4\);
the first six hold uniformly without that restriction.  For
\(s\le-2\), the group
vanishes.

## First support diagonal

At \(s=-1\), path-rank support leaves six summands in the even case
and five in the odd case.  Exact simplification gives

\[
\frac{G(c,m,-1,x,0)}{\binom{2m}{m}}
=
\frac{8c(2m+1)(cm+m^2+3m+3)}
{(m+1)(m+2)(m+3)}
\]

and

\[
G(c,m,-1,x,1)=0.
\]

The even formula is independent of \(x\).  Its unnormalized
two-layer difference is strictly positive when \(c>0\):

\[
G(c,m+1,-1,x,0)-G(c,m,-1,x,0)
=
\binom{2m}{m}\,
\frac{8c(3cm^2+6cm+6c+3m^3+19m^2+43m+30)}
{(m+1)(m+2)(m+3)(m+4)}.
\]

It is zero when \(c=0\), as required.

## The next four diagonals

For \(s=0,1,2,3\), the exact support windows have respectively
eight/seven, ten/nine, twelve/eleven, and fourteen/thirteen summands
in the even/odd cases.
After dividing
the lift residual by \(\binom{2m+\epsilon}{m}\), its numerator is a
polynomial in \(c,m,x\) with only nonnegative coefficients.

The eight certificates, plus the boundary certificate, are generated
by `prove_path_isolate_p4_general_layer_lift_boundary.py` and recorded
in
`path_isolate_p4_general_layer_lift_boundary_s3_20260730.json`.

## Sixth diagonal

At \(s=4\), the even/odd support windows have 16 and 15 summands.
Here an exact tensor-Newton certificate is substantially faster and
smaller than a fully expanded ordinary-monomial formula.  After
clearing the positive \(m\)-denominator products, the residual
polynomials have degree bounds \((12,19,10)\) and \((11,17,9)\).
Their tensor Newton expansions contain respectively 1,124 and 857
nonzero coefficients, all positive.

The full proof and replay details are in
`PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_S4_NEWTON_THEOREM_2026-07-30.md`.

## Seventh diagonal

At \(s=5\), exact tensor interpolation followed by the five-cone
partition proves the lift for every \(c+m\ge4\).  The exact grids
contain 9,666 points in total.  Although the even global Newton basis
has three negative coefficients in the irrelevant \(c+m<4\) region,
all ten admissible parity/cone expansions are nonnegative.  See
`PATH_ISOLATE_P4_S5_AND_QUOTIENT_ORDER6_THEOREM_2026-07-30.md`.

The unrestricted version of (1) remains a conjectural lemma.  If it
is proved, iteration reduces every stable fixed-intersection group to
\(2m+\epsilon=0\) or \(1\), exactly the already-proved full and
near-full intersection edges.
