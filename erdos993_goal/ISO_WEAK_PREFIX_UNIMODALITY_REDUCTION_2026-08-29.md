# ISO plus a weak prefix ratio forbids every forest valley

Date: 2026-08-29

Status: the implication in this note is proved.  Its two forest inputs remain
conjectural.  This is not a solution of Erdos Problem 993.

Let

\[
I(F;x)=\sum_{j=0}^{\alpha}p_jx^j,
\qquad
L=\left\lfloor\frac{2\alpha+1}{3}\right\rfloor
 =\left\lceil\frac{2\alpha-1}{3}\right\rceil .
\]

The Levit--Mandrescu theorem gives the nonincreasing tail

\[
p_L\ge p_{L+1}\ge\cdots\ge p_\alpha
\]

for every forest (indeed, every bipartite graph).  Consider the following two
strict-prefix inequalities, for `2 <= r < L`:

\[
\tag{ISO}
r p_r^2+p_{r-1}^2-(r+1)p_{r-1}p_{r+1}\ge0,
\]

\[
\tag{WR}
p_{r-1}\le r p_r.
\]

## Exact implication

Put

\[
u=r\frac{p_r}{p_{r-1}},
\qquad
w=(r+1)\frac{p_{r+1}}{p_r}.
\]

After multiplication by `r/p_{r-1}^2`, (ISO) is exactly

\[
r+u^2-uw\ge0,
\qquad\hbox{hence}\qquad
w\le u+\frac r u.
\]

Suppose the coefficient sequence were not unimodal.  Since the tail starting
at `L` is nonincreasing, some `2 <= r < L` would satisfy

\[
p_{r-1}\ge p_r<p_{r+1}.
\]

(Rank one cannot be such a valley because `p_1=|V(F)|>=p_0=1`.)  The left
inequality and (WR) give `1 <= u <= r`.  Therefore

\[
u+\frac r u\le r+1,
\]

because

\[
(r+1)-\left(u+\frac r u\right)
=\frac{(u-1)(r-u)}u\ge0.
\]

But the strict rise `p_{r+1}>p_r` says `w>r+1`, a contradiction.  Thus
(ISO), (WR), and the known tail together imply unimodality.

## Scope and evidence

The ISO inequality already has extensive exact finite evidence in the existing
proof program, but no all-order forest proof.  The weak ratio (WR) is much weaker
than the still-conjectural scaled-three inequality: for `r>=3`, the latter would
imply it immediately.  A new exact probe checks (WR) on all generated trees
through the selected order and on large random forests; this is evidence only.

`verify_iso_weak_prefix_unimodality_reduction_root.py` independently checks the
normalization, cutoff identity through alpha 10,000, and the complete logical
implication on all positive integer sequences with alpha at most seven and
coefficients at most five.

The remaining obligations on this route are exactly all-order proofs of (ISO)
and (WR) for forests in the strict prefix.
