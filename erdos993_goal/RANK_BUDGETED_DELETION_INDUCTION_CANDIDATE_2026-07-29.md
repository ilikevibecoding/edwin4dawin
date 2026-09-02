# Rank-budgeted deletion induction candidate

Date: 2026-07-29

## Status

The identities and induction implication below are proved.  The
strong compatibility inequality (DI) is a candidate: it survives the
exact audits listed below but does not yet have an arbitrary-order
proof.

## Aggregate vectors

For a forest \(F\), let

\[
X_q(F)=(S_q,H_{2,q},H_{3,q},C_{0,q},C_{1,q})
\]

be the aggregate residual vector over independent \(q\)-sets, and
write

\[
Q(X)=H_2^2+4H_2C_0-SH_3-3SC_1-S^2.
\]

The denominator-free payment is

\[
P_q(F)=Q(X_q(F))+qS_q^2.
\]

Define its one-unit residual

\[
R_q(F)=P_q(F)-S_q^2
=Q(X_q(F))+(q-1)S_q^2.
\]

The sharp rank-three theorem proves \(R_1(F)\ge0\) for every forest.

## Exact deletion identity

For each vertex \(v\), put

\[
X_v=X_{q-1}(F-N[v]),\qquad S_v=(X_v)_1.
\]

Every independent \(q\)-set has \(q\) choices of a distinguished
selected vertex, and its residual forest is unchanged after that
vertex is deleted first.  Therefore

\[
\boxed{\sum_{v\in V(F)}X_v=qX_q(F).}
\tag{1}
\]

## Compatibility candidate

The strong deletion-induction candidate is

\[
\boxed{
q^2R_q(F)-\sum_vR_{q-1}(F-N[v])
\ge(qS_q)^2.
}
\tag{DI}
\]

The weaker inequality obtained by replacing the right side by zero
would already suffice for induction.  The full one-square version
above is what every exact test currently satisfies.

If (DI) holds, then \(R_1\ge0\) and induction give

\[
R_q(F)\ge S_q^2\qquad(q\ge2),
\]

or equivalently

\[
\boxed{P_q(F)\ge2S_q^2\qquad(q\ge2).}
\]

This is stronger than the denominator-free target \(P_q\ge0\).

## Exact surplus decomposition

Let

\[
p_v=\frac{S_v}{qS_q},\quad
a_v=\frac{H_{2,v}}{S_v},\quad
d_v=\frac{C_{0,v}}{S_v},\quad
r_v=\frac{R_{q-1}(F-N[v])}{S_v^2}.
\]

Zero-mass fibers are omitted.  Expanding the quadratic form and using
\(\sum_vp_v=1\) gives the exact identity

\[
\boxed{
\frac{q^2R_q-\sum_vR_{q-1,v}}{(qS_q)^2}
=1+\sum_vp_v(1-p_v)r_v
-\operatorname{Var}_p(a_v)
-4\operatorname{Cov}_p(a_v,d_v).
}
\tag{2}
\]

Thus (DI) is equivalent to the Poincaré-type inequality

\[
\boxed{
\operatorname{Var}_p(a_v)+4\operatorname{Cov}_p(a_v,d_v)
\le\sum_vp_v(1-p_v)r_v.
}
\tag{3}
\]

This explains the Galvin phase-separated examples.  The bare shortcut
with the right side removed is false: their between-fiber loss can
be much larger than one.  Their lower-rank payment surplus is also
large, and (3) retains exactly that compensation.

## Evidence

`scan_rank_budgeted_deletion_induction.py` verifies (1), (2), and
(DI) with exact integer or rational arithmetic.  It audits all
unlabeled trees through a requested order, random disconnected
forests, and symmetry-reduced Galvin trees up to order \(1641\).
The replay is
`rank_budgeted_deletion_induction_certificate_20260729.json`.

## Proof target

Prove (3) by a weighted Poincaré or switching argument on the
distinguished selected vertex.  Unlike the false conditional-mean
shortcut, (3) keeps the complete lower-rank surplus \(r_v\), which is
exactly the resource that pays for phase separation.
