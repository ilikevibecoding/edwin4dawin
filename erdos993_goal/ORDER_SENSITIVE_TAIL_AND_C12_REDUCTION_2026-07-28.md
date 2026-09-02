# Order-sensitive tail and C12 reduction for Erdős Problem 993

Date: 2026-07-28

Status: the tail refinement and the conditional reduction below are
proved.  C12 remains conjectural.  This is not yet a solution of Erdős
Problem 993.

## 1. The sharper tail cutoff

Let \(G\) be a graph of order \(n\), independence number \(\alpha\), and
independent-set numbers \(i_k\).  Define

\[
A(n,\alpha)=\frac{\alpha(n-1)}{\alpha+n},
\qquad
L_*(n,\alpha)=\left\lceil A(n,\alpha)\right\rceil.
\tag{1}
\]

Then

\[
\boxed{\qquad
i_{L_*}\ge i_{L_*+1}\ge\cdots\ge i_\alpha.
\qquad}
\tag{2}
\]

This is the order-sensitive form of the Fisher--Ryan--Zykov tail
argument recorded as Theorem 3 in Basit--Galvin (2021).

For completeness, suppose \(i_{k+1}>i_k\).  Fisher--Ryan gives

\[
\left(\frac{i_k}{\binom{\alpha}{k}}\right)^{1/k}
>
\left(\frac{i_{k+1}}{\binom{\alpha}{k+1}}\right)^{1/(k+1)}.
\]

Combining this with \(i_{k+1}>i_k\) yields

\[
i_{k+1}>
\binom{\alpha}{k+1}
\left(\frac{k+1}{\alpha-k}\right)^{k+1}.
\]

Zykov's coefficient bound gives

\[
i_{k+1}\le
\binom{\alpha}{k+1}
\left(\frac n\alpha\right)^{k+1}.
\]

Consequently

\[
\frac n\alpha>\frac{k+1}{\alpha-k},
\]

or equivalently

\[
k<A(n,\alpha).
\]

Thus every integer \(k\ge L_*(n,\alpha)\) lies in the decreasing tail,
proving (2).

For a forest, \(n\le2\alpha\), so

\[
L_*(n,\alpha)
\le
\left\lceil\frac{2\alpha-1}{3}\right\rceil.
\tag{3}
\]

The inequality can be much stronger.  For a star,
\(n=\alpha+1\), and

\[
L_*=\left\lceil\frac{\alpha^2}{2\alpha+1}\right\rceil
\sim\frac{\alpha}{2},
\]

instead of the coarser \(2\alpha/3\) cutoff.  Equality in the continuous
bound (3) occurs at the matching-dense endpoint \(n=2\alpha\).

## 2. Pendant deletion respects the sharper cutoff

Let \(\ell p\) be a pendant edge of a nontrivial forest \(G\), and put

\[
F=G-\{\ell,p\}.
\]

Write \(n=|G|\) and \(\alpha=\alpha(G)\).  Then

\[
|F|=n-2,\qquad \alpha(F)=\alpha-1.
\]

Put

\[
A_G=A(n,\alpha),\qquad
A_F=A(n-2,\alpha-1).
\]

Direct subtraction gives

\[
A_G-1-A_F
=
\frac{\alpha(\alpha-2n+3)}
     {(\alpha+n)(\alpha+n-3)}
\le0,
\tag{4}
\]

because a nontrivial forest satisfies \(n\ge\alpha+1\).
Therefore

\[
L_*(F)\ge L_*(G)-1.
\tag{5}
\]

In particular,

\[
\boxed{\qquad
k<L_*(G)\Longrightarrow k-1<L_*(F).
\qquad}
\tag{6}
\]

This is exactly the rank arithmetic needed by the pendant-pair
induction.

For the one-leaf deletion \(T=G-\ell\), the cutoff drops by at most one
in either possible independence-number case.  If
\(\alpha(T)=\alpha\), then

\[
A_G-A(T)
=
\frac{\alpha(\alpha+1)}
 {(\alpha+n)(\alpha+n-1)}
\in(0,1).
\tag{7}
\]

If \(\alpha(T)=\alpha-1\), then

\[
A_G-A(T)
=
\frac{\alpha^2+n^2-2n}
 {(\alpha+n)(\alpha+n-2)}
\in(0,1),
\tag{8}
\]

where the upper bound follows from

\[
1-\{A_G-A(T)\}
=
\frac{2\alpha(n-1)}
 {(\alpha+n)(\alpha+n-2)}>0.
\]

Hence the half-local route still has only one possible newly exposed
same-rank boundary, but it now asks for fewer ranks whenever
\(n<2\alpha\).

## 3. Sharper conditional solution theorem

Recall

\[
\tau_k(P)
=
k\left(
1+k\frac{p_k}{p_{k-1}}
 -(k+1)\frac{p_{k+1}}{p_k}
\right).
\]

Consider the half-curvature pendant cascade

\[
\tag{C12*}
2\tau_k(I(G))\ge\tau_{k-1}(I(F))
\qquad
\left(3\le k<L_*(G)\right).
\]

Ranks one and two have already been proved directly.  By (6), induction
supplies

\[
\tau_{k-1}(I(F))\ge0.
\]

C12* then gives

\[
\tau_k(I(G))\ge0.
\]

Thus the ordinary GSB reserve is nonnegative at every rank before the
order-sensitive tail.  If the coefficient sequence first descends
there, GSB propagates that descent forward; once rank \(L_*\) is
reached, (2) takes over.

Consequently:

> **Order-sensitive conditional solution theorem.** It is enough to
> prove C12 only for
> \[
> 3\le k<
> \left\lceil
> \frac{\alpha(G)(|G|-1)}
>      {\alpha(G)+|G|}
> \right\rceil.
> \]
> This proves unimodality for every tree and forest.

This strictly weakens the previous all-prefix C12 target except at the
matching-dense endpoint.  In the maximum-matching contraction, the hard
endpoint \(n\approx2\alpha\) is precisely the regime with few singleton
units; leaf-rich forests are handed to the tail theorem substantially
earlier.

## 4. Verification

`verify_order_sensitive_tail_c12_reduction.py` checks all rational
identities above symbolically and audits the ceiling arithmetic for
every admissible pair

\[
3\le n\le2000,\qquad
\lceil n/2\rceil\le\alpha<n.
\]

It prints `PASS`.

