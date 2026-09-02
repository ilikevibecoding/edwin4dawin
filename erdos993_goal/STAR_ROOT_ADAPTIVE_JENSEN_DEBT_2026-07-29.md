# Adaptive Jensen Debt Reduction for the Star Root

## Status correction

The coarse rational debt condition

\[
K_k^2\left(\frac34\right)^{\lceil k^2/M\rceil}
\ge (k+1)D_k
\tag{CQRD}
\]

is not true for all star forests, even on the required increasing
prefix.  This does **not** give a counterexample to PIRD or to the
Erdős conjecture: (CQRD) was only a sufficient lower bound obtained
after replacing the actual marginal statistic by its worst possible
value.

The correct Jensen reduction retains that statistic.

## 1. Exact adaptive reserve

For

\[
K(x)=\prod_i\bigl((1+x)^{a_i}+x\bigr)
\]

and fixed rank \(k\), put

\[
h_i=[x^{k-1}]\frac{K(x)}{S_{a_i}(x)},\qquad
p_i=\frac{2h_i}{K_k},\qquad
\sigma_k=\sum_i p_i^2.
\tag{1}
\]

The weighted-leaf compatible-pair identity and Jensen's inequality
give

\[
G_{k,k}\ge K_k^2\left(\frac34\right)^{\sigma_k}.
\tag{2}
\]

The marginal-square theorem proves

\[
\sigma_k\le \frac{k^2}{M},
\tag{3}
\]

but (3) can be very loose when there are a few small branches and one
large branch.  Since \(\sigma_k\) is an explicitly computable rational
number, define

\[
e_k=\lceil\sigma_k\rceil.
\tag{4}
\]

As \(0<3/4<1\), equations (2)--(4) imply the exact rational bound

\[
\boxed{\displaystyle
G_{k,k}\ge K_k^2\left(\frac34\right)^{e_k}.}
\tag{5}
\]

Thus the corrected sufficient debt condition is

\[
\boxed{\displaystyle
K_k^2\,3^{e_k}
\ge
4^{e_k}(k+1)D_k.
}
\tag{AJD}
\]

Unlike (CQRD), (AJD) retains the actual distribution of switchable
blocks.

## 2. Exact failure of the coarse condition

Take the mixed branch list

\[
(1^{11},37),
\qquad M=48,
\qquad k=25.
\tag{6}
\]

The corresponding rooted tree has order

\[
1+11(1+1)+(37+1)=61.
\]

The prefix difference is strictly positive:

\[
B_{26}-B_{25}=381576307183884.
\tag{7}
\]

The adverse debt is

\[
D_{25}
=5416986373226086430569897008>0.
\tag{8}
\]

Since

\[
\left\lceil\frac{25^2}{48}\right\rceil=14,
\]

the ratio of the two sides of (CQRD) is exactly

\[
\frac{
8337380524470060183727227
}{
8788644179289545306537984
}
\approx0.9486537803<1.
\tag{9}
\]

Hence (CQRD) fails on the required prefix.

For the same example, all eleven unit-block marginals are equal to

\[
p_i=\frac{1493952350}{2286791957},
\]

while the large-block marginal is zero.  Consequently

\[
\sigma_{25}
=
\frac{
24550829864775747500
}{
5229417454599889849
}
\approx4.694754259,
\qquad e_{25}=5.
\tag{10}
\]

The adaptive ratio in (AJD) is then

\[
\frac{
423582813822591077769
}{
33526016919286900736
}
\approx12.63445088>1.
\tag{11}
\]

The actual PIRD minor is also very far from failure:

\[
\Delta_{25}
=595453724509156782021957430368>0.
\tag{12}
\]

Thus (9) diagnoses only the loss in the uniform substitution
\(\sigma_k\mapsto k^2/M\).

## 3. Exact and exploratory evidence

`verify_star_root_adaptive_jensen_mixed.py` uses integer and rational
arithmetic.  It:

1. reconstructs the witness (6)--(12);
2. scans a user-specified rectangle of mixed families
   \((1^s,a)\);
3. checks the prefix, adverse debt, (CQRD), and (AJD) independently.

A wider exploratory scan over

\[
1\le s\le300,\qquad 2\le a\le500
\]

tested \(32{,}646{,}531\) prefix/adverse rank instances.  It found
many failures of (CQRD) and no failure of (AJD).  That wide scan used
floating-point arithmetic to locate stress cases; the recorded
61-vertex witness and the bounded verifier use exact arithmetic.

## 4. Remaining star-root obligation

`STAR_ROOT_ENTROPY_SCALAR_CLOSURE_2026-07-29.md` proves that (AJD)
follows from the single entropy inequality

\[
\log_2(K_k/\binom Mk)\ge\frac56\sum_i p_i^2.
\]

Thus the current star-root target is this entropy inequality.  The
stronger coefficient \(1\) in place of \(5/6\) passes all current
tests.  Precisely where \(k^2/M\) is too large, the true marginal
concentration is much smaller and the entropy inequality retains that
information.
