# Star-Root Diagonal Reserve Reduction

## Status

This note strengthens the nonempty-intersection reduction by proving a
quantitative central surplus for the disjoint-centre product

\[
G(x,y)=\prod_i F_{a_i}(x,y).
\]

It reduces the remaining oriented bivariate inequality to one lower
bound for the diagonal coefficient \(G_{k,k}\).  The diagonal lower
bound is strongly supported computationally but is not yet proved in
full generality.

## 1. The local factor

Recall

\[
F_a(x,y)
=(1+x)^a(1+y)^a+x(1+y)^a+y(1+x)^a.
\tag{1}
\]

Fix total degree \(d\), and let

\[
u_i=[x^iy^{d-i}]F_a.
\]

Then

\[
u_i=
\binom ai\binom a{d-i}
+\mathbf1_{i=1}\binom a{d-1}
+\mathbf1_{d-i=1}\binom ai.
\tag{2}
\]

The sequence \((u_i)_{i=0}^d\) is symmetric.

## 2. Every local homogeneous slice is ULC

Define the binomially normalized slice

\[
v_i=\frac{u_i}{\binom di}.
\tag{3}
\]

We claim that \((v_i)\) is log-concave.

First omit the two exceptional terms in (2).  The normalized base is

\[
\begin{aligned}
b_i
&=
\frac{\binom ai\binom a{d-i}}{\binom di}
\\
&=
\frac{(a!)^2}{d!(a-i)!(a-d+i)!}.
\end{aligned}
\tag{4}
\]

Up to a factor independent of \(i\), this is

\[
\binom{2a-d}{a-i},
\]

so the base sequence is log-concave.

For \(d\ge5\), the added terms affect only \(v_1\) and
\(v_{d-1}\).  By symmetry, the only log-concavity comparison that can
become harder is

\[
v_2^2\ge v_1v_3.
\tag{5}
\]

Put

\[
e=\frac1d\binom a{d-1},
\]

so \(v_1=b_1+e\), while \(v_2=b_2\) and \(v_3=b_3\).  A direct ratio
calculation from (4) gives

\[
b_2^2-b_1b_3
=
b_2b_3
\frac{2a-d+1}{(a-2)(a-1)}.
\tag{6}
\]

Thus (5) follows if

\[
e\le
b_2\frac{2a-d+1}{(a-2)(a-1)}.
\tag{7}
\]

Using

\[
b_2=
\frac{a(a-1)}{d(d-1)}\binom a{d-2}
\]

and

\[
\binom a{d-1}
=
\binom a{d-2}\frac{a-d+2}{d-1},
\]

inequality (7) reduces to

\[
(a-d+2)(a-2)\le a(2a-d+1),
\tag{8}
\]

which is immediate for \(a\ge d-1\).  If \(a<d-1\), the exceptional
term is zero.

The small total degrees are direct:

- \(d=4\): the only new condition is
  \[
  \frac{\binom a2^2}{\binom42}
  \ge
  \frac{(a+1)\binom a3}{\binom41},
  \]
  which reduces to
  \(a(a-1)\ge(a+1)(a-2)\);
- \(d=3\): the condition reduces to \(a+1\ge a-2\);
- \(d=2\): it reduces to \(a^2+2a\ge a(a-1)\);
- \(d\le1\): it is immediate.

Therefore:

> **Local-slice theorem.** Every homogeneous coefficient slice of
> \(F_a(x,y)\) is symmetric and ultra-log-concave.

## 3. Products have a quantitative central surplus

Let

\[
G(x,y)=\prod_{i=1}^sF_{a_i}(x,y).
\tag{9}
\]

Fix its homogeneous slice of total degree \(2k\).  Decompose this
slice according to the degrees

\[
d_1+\cdots+d_s=2k
\]

contributed by the individual factors.

For a fixed degree vector \((d_1,\dots,d_s)\), the resulting
coefficient sequence is the convolution of symmetric ULC sequences
of orders \(d_1,\dots,d_s\).  Binomial convolution preserves ULC, so
this sequence is symmetric ULC of order \(2k\).

If \((h_i)_{i=0}^{2k}\) is symmetric ULC of order \(2k\), then

\[
\frac{h_{k-1}}{\binom{2k}{k-1}}
\le
\frac{h_k}{\binom{2k}k}.
\]

Consequently,

\[
h_{k-1}\le\frac{k}{k+1}h_k.
\tag{10}
\]

Inequality (10) is linear in the sequence.  Summing it over all degree
vectors gives the exact product bound

\[
\boxed{
G_{k,k}-G_{k-1,k+1}
\ge
\frac{G_{k,k}}{k+1}.
}
\tag{11}
\]

This conclusion does not require the complete degree-\(2k\) slice of
\(G\) itself to be ULC.

## 4. Reduction to one diagonal coefficient

The empty-intersection contribution to the PIRD minor is

\[
\begin{aligned}
E_k
&=
G_{k,k}-G_{k-1,k+1}
\\
&\quad+
K_k(L_k+L_{k-1})
-K_{k+1}(L_{k-1}+L_{k-2}).
\end{aligned}
\tag{12}
\]

Define the adverse linear debt

\[
D_k=
K_{k+1}(L_{k-1}+L_{k-2})
-K_k(L_k+L_{k-1}).
\tag{13}
\]

When \(D_k\le0\), (11) proves \(E_k\ge0\).  When \(D_k>0\), equations
(11)--(13) show that it is sufficient to prove

\[
\boxed{
G_{k,k}\ge(k+1)D_k.
}
\tag{DR}
\]

All nonempty-intersection groups were already proved nonnegative.
Therefore (DR) completes the entire star-root PIRD inequality.

The original obstruction was an oriented comparison in an odd
homogeneous slice of a bivariate product.  It has now been replaced by
the diagonal coefficient lower bound (DR).

## 5. Initial exact check

Direct bivariate enumeration through rooted-tree order \(24\) found
no failure of (DR) at any needed prefix rank.  Among the cases with
\(D_k>0\), the smallest diagonal/debt ratio was

\[
\frac{G_{k,k}}{(k+1)D_k}
=
\frac{84569}{12672}
\approx6.67369,
\]

at \(k=5\) for eleven one-leaf branches.

This finite check is not a proof.  It indicates that (DR) retains a
large reserve even after replacing the exact central difference by
the ULC lower bound (11).

## 6. Next proof obligation

Prove (DR) combinatorially or coefficientwise.  In the weighted leaf
model,

\[
G_{k,k}
=
\sum_{\substack{|S|=|T|=k}}
2^{m(S)+m(T)}
\left(\frac34\right)^{c(S,T)},
\tag{14}
\]

where \(c(S,T)\) counts blocks in which both \(S\) and \(T\) consist
of the canonical singleton.  Formula (14) gives a concrete route:
bound the overlap penalty jointly with the one-step coefficient debt
\(D_k\), rather than bounding either quantity separately.
