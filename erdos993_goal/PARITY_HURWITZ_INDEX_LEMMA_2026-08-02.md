# Parity--Hurwitz index lemma

Date: 2026-08-02

This note gives a self-contained root-index lemma for the original affine
coefficient polynomial.  The lemma itself is proved below.  Its hypotheses
have been certified on saved and focused finite cases, but have not yet been
proved uniformly for the ten unbounded parameter families.

## 1. First chamber: equal positive-root counts

Let

\[
C(t)=E(t^2)+tO(t^2)
\]

be a real polynomial of degree `d`, with the displayed degrees forced by
this decomposition.  Assume that `E` and `O` have nonzero leading
coefficients of the same sign, no zero roots, and only real roots.  Suppose
each of `E` and `O` has exactly `p` positive roots, counted with
multiplicity.

Assume their negative roots are simple and have the following strict
Hurwitz-oriented interlacing.

* If `d=2n`, write the negative roots in increasing order as

  \[
  e_1<o_1<e_2<\cdots<o_{n-p-1}<e_{n-p}<0.
  \]

* If `d=2n+1`, write them in increasing order as

  \[
  o_1<e_1<o_2<e_2<\cdots<o_{n-p}<e_{n-p}<0.
  \]

Then `C` has no root on the imaginary axis and has exactly `p` roots in
the open right half-plane, counted with multiplicity.

In particular, if `p<=2`, then `C` has right-half-plane index at most two.

## 2. Proof

Factor the two parity parts over the reals as

\[
E(u)=a_E\prod_i(u-e_i)\prod_{j=1}^p(u-\alpha_j),
\qquad
O(u)=a_O\prod_i(u-o_i)\prod_{j=1}^p(u-\beta_j),
\]

where the `e_i,o_i` are negative and the `alpha_j,beta_j` are positive.
The assumptions say `a_E a_O>0` and put the negative roots in one of the
two open interlacing chambers displayed above.

These data form a connected parameter space: ordered points in either
open interlacing chamber can be moved continuously to any other ordered
points in that chamber; positive roots can be moved continuously within
the positive half-line; and the two nonzero leading coefficients can be
moved continuously while their ratio remains positive.  Positive roots
of `E` and `O` are allowed to meet each other during this deformation.

No polynomial along such a deformation can acquire a root on the
imaginary axis.  Indeed, for real `x`,

\[
C(ix)=E(-x^2)+ixO(-x^2).
\]

At `x=0`, this is nonzero because `E(0)\ne0`.  At `x\ne0`, it can vanish
only if `E(-x^2)=O(-x^2)=0`, which would be a common negative root.  Strict
interlacing excludes that.  The degree also stays fixed because neither
leading coefficient vanishes.  Hence the number of roots of `C` in the
open right half-plane is constant throughout the connected parameter
space.

It remains to evaluate that constant at one convenient point.  Put

\[
N=d-2p,
\qquad H(t)=(1+t)^N=E_0(t^2)+tO_0(t^2),
\]

and choose a degree-`p` polynomial `Q` with simple positive roots and
positive leading coefficient.  The classical parity parts `E_0,O_0`
have simple negative roots in precisely the required orientation.  This
can be seen directly from

\[
(1+ix)^N=(1+x^2)^{N/2}
  \exp\!\bigl(iN\arctan x\bigr):
\]

the zeros of its real and imaginary parts alternate as `x` runs from
zero to infinity.  Thus the pair

\[
E(u)=Q(u)E_0(u),\qquad O(u)=Q(u)O_0(u)
\]

lies in the same connected parameter space (common positive roots are
harmless).  At this point,

\[
C(t)=Q(t^2)(1+t)^N.
\]

Every positive root of `Q` contributes the two real roots
`+sqrt(alpha)` and `-sqrt(alpha)` to `Q(t^2)`, while all roots of
`(1+t)^N` lie in the open left half-plane.  Therefore this representative
has exactly `p` right-half-plane roots.  Constancy under the deformation
proves the claim.  QED.

## 3. Second chamber: one extra even-part positive root

There is a second connected chamber needed by one of the wider stress
cases.  Let `d=2n`, so that `deg E=n` and `deg O=n-1`.  Suppose `E` and
`O` have only real nonzero roots, their negative roots are simple, and
for some `q>=0`:

* `E` has `q+1` positive roots and `O` has `q` positive roots, counted
  with multiplicity;
* their leading coefficients have opposite signs; and
* writing `m=n-q-1`, their negative roots have the strict order

  \[
  o_1<e_1<o_2<e_2<\cdots<o_m<e_m<0.
  \]

Then `C` has no root on the imaginary axis and has exactly `q+1` roots
in the open right half-plane, counted with multiplicity.

The chamber is connected for the same reason as in Section 2, and no
imaginary-axis crossing is possible: for nonzero real `x`, a crossing
would require a common negative root of `E` and `O`, while at `x=0` it
would require `E(0)=0`.  Both are excluded.  It therefore suffices to
compute the index at one representative.

Choose a degree-`q` polynomial `Q` with simple positive roots and positive
leading coefficient, put

\[
D=d-2q=2m+2,
\qquad
H(t)=(1+t)^{D-1}=E_0(t^2)+tO_0(t^2),
\]

and take a sufficiently large positive number `b`.  Set

\[
C_b(t)=(b-t)H(t)=E_b(t^2)+tO_b(t^2).
\]

Direct multiplication gives

\[
E_b(u)=bE_0(u)-uO_0(u),
\qquad
O_b(u)=bO_0(u)-E_0(u).
\]

The odd-degree stable polynomial `H` has simple negative parity roots in
the order

\[
o^{(0)}_1<e^{(0)}_1<\cdots<o^{(0)}_m<e^{(0)}_m<0.
\]

As `b` tends to infinity, the `m` finite roots of `E_b` approach the
roots of `E_0`, all `m` roots of `O_b` approach the roots of `O_0`, and
the remaining root of `E_b` tends to positive infinity.  The latter
claim also follows by balancing the two leading terms of
`bE_0(u)-uO_0(u)`: its scale is a positive constant times `b`.  Thus,
for all sufficiently large `b`, `E_b` has one positive root, `O_b` has
none, their negative roots have the displayed strict order, and their
leading coefficients have opposite signs.

Now take

\[
E(u)=Q(u)E_b(u),
\qquad
O(u)=Q(u)O_b(u).
\]

This pair belongs to the required chamber, and

\[
C(t)=Q(t^2)(b-t)(1+t)^{D-1}.
\]

The factor `Q(t^2)` supplies exactly `q` positive real roots, `b-t`
supplies one, and all remaining roots are negative.  Hence this
representative has exactly `q+1` right-half-plane roots.  Constancy of
the index throughout the chamber proves the second statement.  QED.

## 4. Consequence for the coefficient-shape target

If the ten original affine families satisfy the parity hypotheses with
`p<=2`, their coefficient polynomials have at most two roots in the open
right half-plane.  Factoring the left-half-plane roots produces a
positive-coefficient factor; the remaining factor has degree at most
two.  Variation diminution then limits the coefficient sequence to at
most two sign changes.  Together with the required boundary orientation,
this makes the positive coefficients one contiguous block.

The remaining uniform work is therefore concrete:

1. prove `E` and `O` are real-rooted;
2. prove their negative roots have the stated strict orientation;
3. prove either the equal-count/same-leading-sign conditions of the first
   chamber or the one-extra-even-root/opposite-leading-sign conditions of
   the second chamber;
4. prove the relevant count is at most two.

The exact diagnostic falsifier
`probe_generalized_hb_parity_root_bound.py` confirms that omitting the
orientation or common-positive-count hypotheses is invalid.  It also
found no counterexample to the stated index conclusion in 5,000 exact
oriented trials.  That computation is supporting evidence only; the
argument above is the proof of the lemma.

## 5. Exact focused-family certificate

The consolidated exact audit
`path_isolate_p4_affine_parameter_monotonicity_full_grid_parity_hurwitz_certificate_20260802.json`
contains 26 focused hard cases and has zero failures.  In every case:

* both parity parts are Arb-certified real-rooted;
* the negative roots have the required strict orientation;
* both parts have the same positive-root count `p<=2`;
* their leading coefficients have the same nonzero sign;
* the index predicted by this lemma equals the independently isolated
  right-half-plane index;
* the coefficient-positive block and both endpoint evaluations pass.

The histogram is `p=0` in 2 cases, `p=1` in 18 cases, and `p=2` in 6
cases.  This is finite exact evidence, not the missing uniform proof.

For a potentially simpler orientation certificate, define

\[
M(u)=E(u)O(u)-2u(E'(u)O(u)-E(u)O'(u)).
\]

Then

\[
\frac{d}{d\omega}\arg C(i\omega)
=\frac{M(-\omega^2)}{|C(i\omega)|^2}.
\]

Every coefficient of `M(-x)` is strictly positive in all 26 focused
cases.  This proves monotone imaginary-axis phase and excludes imaginary
roots on each audited instance.  It does not alone bound the index:
the uniform proof still needs real-rootedness and the `p<=2` statement,
or an equivalent replacement.

## 6. Wider extreme-ratio certificate

The 72-case extreme-ratio stress grid contains 71 instances in the first
chamber and one instance in the second chamber.  In all 72 instances both
parity parts are real-rooted, the relevant strict negative-root orientation
holds, the parity-root index predicted by the corresponding theorem agrees
with the independently isolated right-half-plane index, every parity
coefficient sequence has at most two sign changes, the original positive
coefficient block is contiguous, and both endpoint tests pass.  This is
finite evidence for the remaining uniform hypotheses, not their proof.
