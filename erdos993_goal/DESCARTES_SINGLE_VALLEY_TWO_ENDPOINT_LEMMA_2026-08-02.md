# Descartes single-valley two-endpoint lemma

Date: 2026-08-02

This is an unconditional elementary lemma.  It replaces the proposed
direct comparison between the two negative boundary blocks and the
positive middle block in the reaggregated affine increment.

## Lemma

Let

\[
f(y)=\sum_{j=0}^n a_jy^j\in\mathbb R[y]
\]

be nonzero.  Delete zero coefficients before reading signs.  Suppose the
positive coefficients form a single contiguous interval.  Equivalently,
the sign blocks of the coefficient sequence are contained in

\[
(-,+,-),
\]

with any of the three blocks allowed to be empty.  If `0<a<1<b` and

\[
f(a)>0\qquad\hbox{and}\qquad f(b)>0,
\]

then

\[
f(1)>0.
\]

## Proof

If every nonzero coefficient is positive, the conclusion is immediate.
If every nonzero coefficient is negative, the two endpoint hypotheses are
impossible.  It remains to consider one or two sign transitions.

By Descartes' rule of signs, the number of positive real zeros of `f`,
counted with multiplicity, is at most the number of coefficient sign
transitions.

First suppose there is one transition.  If `f(1)<0`, continuity gives a
zero in each of `(a,1)` and `(1,b)`, contradicting the Descartes bound
of one.  If `f(1)=0`, positivity on both sides forces either an even
positive multiplicity at 1 or an additional positive zero restoring the
sign; again there are at least two positive zeros counted with
multiplicity.  Hence `f(1)>0`.

Now suppose the signs are exactly `(-,+,-)`.  The first nonzero
coefficient is negative, so `f(y)<0` for all sufficiently small positive
`y`.  Since `f(a)>0`, there is a positive zero below `a`.  The leading
coefficient is negative, so `f(y)<0` for all sufficiently large positive
`y`; since `f(b)>0`, there is another positive zero above `b`.
If `f(1)<0`, continuity supplies two further zeros, one in `(a,1)` and
one in `(1,b)`, giving at least four positive zeros against the
Descartes bound of two.  If `f(1)=0`, the two exterior zeros together with
the zero at 1 give at least three distinct positive zeros, again against
that bound.  Therefore `f(1)>0`.  This proves the lemma.

## Application to the affine increment

For the exact reaggregation write

\[
K_j=(r+1)R_j(1-u_j),\qquad
u_j=-\frac{L_j}{(r+1)R_j},
\]

where the signed regime has `L_j<0` and `R_j>0`.  If `u_j` first
decreases and then increases, the index set on which `u_j<1` is a single
interval.  Hence the positive coefficients `K_j` form a single interval,
exactly the hypothesis of the lemma.

Thus the remaining affine positivity target can be split into three
uniform statements:

1. the utilization sequence has a single valley;
2. `K(a)>0` at one fixed `a<1`;
3. `K(b)>0` at one fixed `b>1`.

The pairs `(a,b)=(1/2,3/2)` and `(2/3,3/2)` are the current exact test
points; the latter has the useful reciprocal relation `ab=1`.

These imply the desired `K(1)>0`.  No real-rootedness, signed
ultra-log-concavity, or explicit boundary-mass comparison is needed for
this last implication.
