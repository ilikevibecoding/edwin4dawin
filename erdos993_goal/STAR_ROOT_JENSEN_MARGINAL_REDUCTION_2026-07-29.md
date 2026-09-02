# Star-Root Jensen–Marginal Reduction

## Status

This note gives a probabilistic lower bound for the diagonal
coefficient in the star-root obstruction.  The required
\(\ell_2\) bound for switchable-block marginals is now proved in full
in `STAR_MARGINAL_SQUARE_THEOREM_2026-07-29.md`.  Consequently the
missing diagonal-reserve inequality has been reduced to one explicit
coefficient/debt inequality, (QRD) below.

## 1. Weighted leaf model

Let the star branches have leaf counts \(a_1,\ldots,a_s\), and put

\[
M=\sum_i a_i,\qquad
S_a(x)=(1+x)^a+x,\qquad
K(x)=\prod_iS_{a_i}(x).
\]

Choose one canonical leaf in every branch.  For a \(k\)-subset \(S\)
of the \(M\) leaves, let \(m(S)\) be the number of branches in which
\(S\) consists of exactly the canonical singleton.  Replacing that
singleton either by itself or by the centre gives

\[
K_k=\sum_{\substack{S\subseteq[M]\\|S|=k}}2^{m(S)}.
\tag{1}
\]

Let \(\mu_k\) be the probability measure on leaf \(k\)-subsets with
mass

\[
\mu_k(S)=\frac{2^{m(S)}}{K_k}.
\tag{2}
\]

Write \(E_i\) for the event that block \(i\) is the canonical
singleton, and put

\[
p_i=\mu_k(E_i)
=\frac{2[x^{k-1}]\prod_{j\ne i}S_{a_j}(x)}{K_k}.
\tag{3}
\]

## 2. A Jensen lower bound for compatible pairs

Take independent \(S,T\sim\mu_k\), and let

\[
C(S,T)=\#\{i:E_i(S)\text{ and }E_i(T)\}.
\]

For every common switchable block there are four choices of the two
preimages in (1), and exactly three avoid selecting the same centre
twice.  Therefore the diagonal compatible-pair coefficient from the
intersection reduction satisfies the exact identity

\[
\boxed{
\frac{G_{k,k}}{K_k^2}
=
\mathbb E_{\mu_k\otimes\mu_k}
\left(\frac34\right)^{C(S,T)}.
}
\tag{4}
\]

Since \(c\mapsto(3/4)^c\) is convex, Jensen gives

\[
\frac{G_{k,k}}{K_k^2}
\ge
\left(\frac34\right)^{\mathbb E C}
=
\left(\frac34\right)^{\sum_i p_i^2}.
\tag{5}
\]

Thus no inclusion–exclusion truncation is required.

## 3. The marginal-square theorem

The following sharp statement is now proved.

> **Marginal-square lemma.** For every star forest and every
> \(1\le k\le M\),
> \[
> \boxed{
> \sum_{i=1}^s p_i^2\le\frac{k^2}{M}.
> }
> \tag{MS}
> \]

The proof uses a universal coefficientwise inequality for every pair
of star factors, converts it into a pairwise block-incidence
inequality, and sums those inequalities.  The complete argument is in
`STAR_MARGINAL_SQUARE_THEOREM_2026-07-29.md`.

The all-unit family has
\(p_i=k/M\), so equality holds:

\[
\sum_{i=1}^M p_i^2=M(k/M)^2=k^2/M.
\]

Combining (5) with (MS) gives the explicit diagonal lower bound

\[
\boxed{
G_{k,k}
\ge
K_k^2\left(\frac34\right)^{k^2/M}.
}
\tag{6}
\]

For an integer-only sufficient bound one may weaken (6) to

\[
G_{k,k}
\ge
K_k^2\left(\frac34\right)^{\lceil k^2/M\rceil}.
\tag{7}
\]

## 4. Reduction of the star-root obstruction

Recall the adverse debt

\[
D_k=
K_{k+1}(L_{k-1}+L_{k-2})
-K_k(L_k+L_{k-1}),
\qquad L_j=\binom Mj.
\tag{8}
\]

The diagonal-reserve reduction proved that it is enough to show

\[
G_{k,k}\ge(k+1)D_k
\tag{9}
\]

whenever \(D_k>0\).  By (7), (9) follows from the purely univariate
coefficient inequality

\[
\boxed{
K_k^2\,3^{\lceil k^2/M\rceil}
\ge
4^{\lceil k^2/M\rceil}(k+1)D_k.
}
\tag{QRD}
\]

Consequently, (MS) plus (QRD) would prove the entire star-root PIRD
inequality.  A later exact search found that the coarse substitution
used in (QRD) is false at larger parameters, even though the PIRD
minor remains positive.  The corrected adaptive condition is recorded
in `STAR_ROOT_ADAPTIVE_JENSEN_DEBT_2026-07-29.md`.

## 5. An alternative tensorization of the marginal lemma

Before the direct proof of (MS) was found, the following useful
one-dimensional induction was obtained.  Let \(R\) be
the star-forest polynomial for old branches with \(M>0\) leaves.
Assume (MS) holds for \(R\) at every rank.  Add a new branch with
\(a\) leaves:

\[
S_a(x)=(1+x)^a+x,\qquad K(x)=R(x)S_a(x).
\]

Write \(s_t=[x^t]S_a(x)\), and for fixed \(k\) define

\[
A_k=\sum_t s_t(k-t)R_{k-t},
\qquad h_k=R_{k-1}.
\tag{10}
\]

For every old centre, its new rank-\(k\) marginal is a mixture of its
old rank-\((k-t)\) marginals.  Minkowski's inequality and the
inductive hypothesis give

\[
\left\|p_{\rm old}^{(k)}\right\|_2
\le
\frac{A_k}{\sqrt M\,K_k}.
\tag{11}
\]

The new centre has marginal

\[
p_{\rm new}^{(k)}=\frac{2h_k}{K_k}.
\tag{12}
\]

It follows that (MS) for the enlarged forest is implied by the scalar
condition

\[
\boxed{
(M+a)\bigl(A_k^2+4Mh_k^2\bigr)
\le
Mk^2K_k^2.
}
\tag{SC}
\]

Every branch list can be built in nondecreasing order.  Hence a proof
of (SC) under

\[
a\ge\max\{\text{old branch sizes}\}
\tag{13}
\]

would prove (MS) for every star forest.

### Ranks one and two are proved

Let the old forest have \(s\) branches and put \(e=M-s\ge0\).
At \(k=1\),

\[
R_1=M+s,\qquad K_1=M+s+a+1,\qquad A_1=M+s,\qquad h_1=1.
\]

Using \(a\ge\max a_i\), so \(M\le as\), direct expansion of the
difference between the right and left sides of (SC) gives

\[
(a-1)^2(s+e)+2(a-1)se+(a-2)e^2\ge0
\tag{14}
\]

for \(a\ge2\).  The case \(a=1\) forces all old branches to be unit
branches and gives equality.  Thus (SC) is proved at rank one.

At rank two, the first two coefficients of every old star forest
depend only on \(M\) and \(s\):

\[
R_1=M+s,
\qquad
R_2=\binom M2+M(s-1)+\binom s2.
\tag{15}
\]

Put again \(e=M-s\), and for \(a\ge2\) put \(v=a-2\).  Direct
substitution in (SC) shows that its right side minus its left side is

\[
P_0+P_1v+P_2v^2+P_3v^3+P_4v^4,
\tag{16}
\]

where

\[
\begin{aligned}
P_4={}&e+s,\\
P_3={}&3e^2+8es+6e+4s^2+6s,\\
P_2={}&3e^3+13e^2s+16e^2+16es^2+46es+13e\\
&\quad+4s^3+24s^2+13s,\\
P_1={}&e^4+6e^3s+10e^3+12e^2s^2+46e^2s+26e^2\\
&\quad+8es^3+60es^2+82es+12e\\
&\quad+16s^3+44s^2+12s,\\
P_0={}&2e^3s+5e^3+8e^2s^2+29e^2s+12e^2\\
&\quad+8es^3+44es^2+44es+4e\\
&\quad+12s^3+24s^2+4s.
\end{aligned}
\tag{17}
\]

Every coefficient in (17) is nonnegative.  If \(a=1\), condition
(13) again forces \(e=0\), and equality holds.  Hence (SC), and
therefore (MS), is proved through rank two for arbitrary star
forests.

At rank three the only additional old-forest statistic is

\[
T_2=\sum_i\binom{a_i}{2}.
\tag{18}
\]

Writing \(a_i=1+b_i\), the largest-branch assumption gives the sharp
interval

\[
\frac{e(e+s)}{2s}
\le T_2\le
\frac{ae}{2}.
\tag{19}
\]

The rank-three scalar slack is a concave quadratic in \(T_2\).
Its second derivative with respect to \(T_2\) is exactly

\[
-18a<0.
\tag{20}
\]

Consequently it is enough to check the two endpoints in (19).  For
\(a\ge2\), make the substitutions

\[
a=v+2,\qquad s=t+1,\qquad
e=s(a-1)x,
\tag{21}
\]

where \(v,t\ge0\) and \(0\le x\le1\).  At either endpoint in (19), the
slack is a polynomial of degree six in \(x\).  Expand it in the
Bernstein basis

\[
\sum_{j=0}^6 b_j(v,t)
\binom6j x^j(1-x)^{6-j}.
\tag{22}
\]

Exact expansion shows that every \(b_j(v,t)\) has nonnegative
coefficients in the ordinary monomial basis.  Hence every term in
(22) is nonnegative on the stated domain.  The case \(a=1\) again
forces all branches to be unit branches and gives equality.

`verify_star_marginal_scalar_rank3_symbolic.py` constructs (20)--(22)
from the definitions using exact rational symbolic arithmetic.  It
checks fourteen Bernstein coefficients containing \(666\) monomial
terms in total, with zero negative terms, and records SHA-256 hashes
of the canonical coefficient lists.

Thus (SC), and therefore (MS), is proved through rank three for
arbitrary star forests.

## 6. Exact verification

`verify_star_root_jensen_marginal.py` checks (MS) and (QRD) using
integer arithmetic.  Through rooted order \(50\):

- star-branch multisets: \(173{,}525\);
- marginal inequalities: \(6{,}151{,}128\);
- adverse debt cases: \(129{,}276\);
- failures of (MS): \(0\);
- failures of (QRD): \(0\).

The smallest exact rational reserve in (QRD) is still greater than
\(2\).

`verify_star_marginal_tensor_scalar.py` checks (SC) when the new
branch is no smaller than every old branch.  Through old branch cost
\(30\) and new branch size \(30\), it checks more than \(4.8\)
million rank instances with no failure.

`verify_star_marginal_scalar_rank3_symbolic.py` is an all-parameter
symbolic certificate, not a bounded search.

## 7. Corrected next proof obligation

The coarse univariate reserve inequality (QRD) is false beyond the
range of the initial scan.  For example, it fails on the increasing
prefix for the mixed branch list \((1^{11},37)\) at \(k=25\).
This is a failure only of the sufficient bound, not of PIRD.

The correct target retains the exact rational statistic
\[
\sigma_k=\sum_i p_i^2,\qquad e_k=\lceil\sigma_k\rceil,
\]
and asks for
\[
K_k^2\,3^{e_k}\ge4^{e_k}(k+1)D_k.
\]
See `STAR_ROOT_ADAPTIVE_JENSEN_DEBT_2026-07-29.md` for the exact
witness, the corrected reduction, and verification.

One possible route is to combine the star-factor compression identity
   \[
   S_{a-1}S_{b+1}-S_aS_b
   =
   x^2\bigl((1+x)^b-(1+x)^{a-1}\bigr)
   \]
with the exact marginal formulas.  The remaining obstruction is an
explicit coupling between a one-step coefficient debt and the
concentration of the switchable-block marginals.
