# The Star-Forest Entropy Inequality

## Status

This note proves the entropy statement left open in
`STAR_ROOT_ENTROPY_SCALAR_CLOSURE_2026-07-29.md`.  In fact it proves
the stronger estimate

\[
\boxed{\displaystyle
\log_2\frac{K_k}{\binom Mk}
\ge \frac89\sum_i p_i^2 ,
}
\tag{E8/9}
\]

where

\[
K(x)=\prod_i S_{a_i}(x),\qquad
S_a(x)=(1+x)^a+x,\qquad
M=\sum_i a_i,
\]

and

\[
p_i=
\frac{2[x^{k-1}]K/S_{a_i}}{K_k}.
\tag{1}
\]

Since \(8/9>5/6\), this proves (E5/6), and hence closes the pure
star-root PIRD case by the scalar theorem in the earlier note.

## 1. The weighted leaf model

In each block of \(a_i\) leaves, designate one canonical leaf.  If
\(S\) is a leaf \(k\)-subset, let \(E_i(S)\) be the event that the
intersection of \(S\) with block \(i\) is exactly its canonical leaf.
Put

\[
C(S)=\sum_i 1_{E_i(S)}.
\]

The coefficient identity

\[
[x^t]S_a(x)=\binom at+1_{\{t=1\}}
\]

shows that

\[
K_k=\sum_{\substack{S\subseteq[M]\\|S|=k}}2^{C(S)}.
\tag{2}
\]

Let \(\nu_k\) be the uniform law on leaf \(k\)-subsets and let
\(\mu_k\) be its tilt by \(2^{C(S)}\).  Then

\[
q_k:=\frac{K_k}{\binom Mk}
=\mathbb E_{\nu_k}2^{C(S)}
\tag{3}
\]

and

\[
p_i=\Pr_{\mu_k}(E_i).
\tag{4}
\]

Write

\[
r_i:=\Pr_{\nu_k}(E_i)
=\frac{\binom{M-a_i}{k-1}}{\binom Mk}.
\tag{5}
\]

Jensen's inequality immediately gives

\[
\log_2q_k
\ge \mathbb E_{\nu_k}C(S)
=\sum_i r_i.
\tag{6}
\]

It therefore remains to prove the following branchwise estimate:

\[
\boxed{\displaystyle
p_i^2\le\frac98r_i.
}
\tag{7}
\]

## 2. A normalized-ratio lemma

Let \(F(x)\) be a product of star factors with total leaf degree
\(N\), and put

\[
u_j=\frac{F_j}{\binom Nj}.
\]

Then, whenever both sides exist,

\[
\boxed{\displaystyle
\frac23\le\frac{u_j}{u_{j-1}}\le2.
}
\tag{8}
\]

For one factor \(S_b\), its binomially normalized coefficient
sequence is

\[
1,\quad 1+\frac1b,\quad 1,\quad\ldots,\quad1.
\]

Every adjacent ratio is therefore in \([2/3,2]\).

The interval is preserved by products.  Indeed, if \(f_i\) and
\(g_j\) are the normalized coefficient sequences of degrees \(m\)
and \(n\), the normalized coefficient of their product at rank \(k\)
is

\[
\mathbb E\bigl[f_Xg_{k-X}\bigr],
\]

where \(X\) is the number of elements from the first part in a
uniform \(k\)-subset of an \((m+n)\)-set.  Couple a uniform
\((k-1)\)-subset with a uniform choice of one element from its
complement.  The resulting \(k\)-subset is uniform, and its weight is
between \(2/3\) and \(2\) times the old weight, according to which
part receives the added element.  Taking expectations proves (8)
and hence the product claim.

## 3. Reduction of (7) to a hypergeometric inequality

Fix block \(i\), write

\[
a=a_i,\qquad N=M-a,\qquad
H(x)=K(x)/S_a(x),\qquad h=H_{k-1}.
\]

If \(h=0\), then \(p_i=0\) and there is nothing to prove.  Assume
\(h>0\).

By (8),

\[
\frac{H_k}{h}
\ge
\frac23\frac{\binom Nk}{\binom N{k-1}},
\tag{9}
\]

and, for \(t\ge2\),

\[
\frac{H_{k-t}}h
\ge
2^{-(t-1)}
\frac{\binom N{k-t}}{\binom N{k-1}}.
\tag{10}
\]

Terms with invalid binomial indices are simply zero.  Consequently

\[
\frac{K_k}{h}\ge B,
\tag{11}
\]

where

\[
B=
(a+1)
+\frac23\frac{\binom Nk}{\binom N{k-1}}
+\sum_{t\ge2}
2^{1-t}\binom at
\frac{\binom N{k-t}}{\binom N{k-1}}.
\tag{12}
\]

Let \(T\) have the hypergeometric law

\[
\pi_t=\Pr(T=t)
=\frac{\binom at\binom N{k-t}}{\binom{N+a}k}.
\tag{13}
\]

Since

\[
r_i=\frac{\binom N{k-1}}{\binom{N+a}k}
=\frac{\pi_1}{a},
\tag{14}
\]

multiplication of (12) by \(r_i\) gives

\[
r_iB=
\frac23\pi_0
+\left(1+\frac1a\right)\pi_1
+\sum_{t\ge2}2^{1-t}\pi_t.
\tag{15}
\]

The next lemma proves

\[
B^2r_i\ge\frac{32}{9}.
\tag{16}
\]

Using (1), (11), and (16),

\[
p_i^2
=\frac{4h^2}{K_k^2}
\le\frac4{B^2}
\le\frac98r_i,
\]

which is (7).

## 4. The Poisson-binomial lemma

### Lemma

Let \(T\) be a sum of \(a\ge1\) independent Bernoulli variables, with
probabilities \(\pi_t=\Pr(T=t)\).  Then

\[
\boxed{\displaystyle
\left[
\frac23\pi_0+
\left(1+\frac1a\right)\pi_1+
\sum_{t\ge2}2^{1-t}\pi_t
\right]^2
\ge\frac{32}{9a}\pi_1.
}
\tag{PB}
\]

### Proof

First suppose all Bernoulli parameters are below \(1\).  Write their
odds as \(x_1,\ldots,x_a\ge0\), and put

\[
s=\sum_jx_j,\qquad
u=\frac sa,\qquad
A=\prod_j\left(1+\frac{x_j}{2}\right),\qquad
D=\prod_j(1+x_j).
\]

The probability generating function is

\[
\mathbb E z^T
=\frac{\prod_j(1+x_jz)}D.
\]

Hence the left side before squaring in (PB) is \(F/D\), where

\[
F=2A-\frac43+u,
\tag{17}
\]

and

\[
\frac{\pi_1}{a}=\frac uD.
\tag{18}
\]

Thus (PB) is equivalent to

\[
\frac{F^2}{uD}\ge\frac{32}{9}.
\tag{19}
\]

We first record

\[
\begin{aligned}
\frac{A^2}{D}
&=
\prod_j\left(1+\frac{x_j^2}{4(1+x_j)}\right)\\
&\ge
1+\frac14\sum_j\frac{x_j^2}{1+x_j}\\
&\ge
1+\frac{s^2}{4(a+s)}
=
1+\frac{au^2}{4(1+u)}.
\end{aligned}
\tag{20}
\]

The second inequality is Cauchy--Schwarz.  Also,

\[
D\ge1+s=1+au.
\tag{21}
\]

If \(0<u\le4/3\), (20)--(21) give

\[
\frac F{\sqrt D}
\ge
2\sqrt{1+\frac{au^2}{4(1+u)}}
-\frac{4/3-u}{\sqrt{1+au}}.
\]

The right side increases with \(a\), so it is at least its value at
\(a=1\), namely

\[
\frac{2u+2/3}{\sqrt{1+u}}.
\]

Finally,

\[
9(2u+2/3)^2-32u(1+u)=4(u-1)^2\ge0,
\]

which proves (19) in this range.

If \(u\ge4/3\), then (20) yields

\[
\frac F{\sqrt D}
\ge
2\sqrt{1+\frac{au^2}{4(1+u)}}.
\]

For \(a\ge4\), the square of this lower bound minus \(32u/9\)
has numerator

\[
36+4u+(9a-32)u^2\ge0
\]

after multiplication by \(9(1+u)\).  This proves (19) for \(a\ge4\).

It remains to check \(a=1,2,3\).  These checks work for every
\(u>0\), not just \(u\ge4/3\).

For \(a=1\), \(u=x_1\), and

\[
\frac{F^2}{uD}
=
\frac{(2/3+2u)^2}{u(1+u)}
\ge\frac{32}{9},
\]

again because the cleared difference is \(4(u-1)^2\).

For \(a=2\), put

\[
s=x_1+x_2,\qquad p=x_1x_2.
\]

Then

\[
F=\frac23+\frac32s+\frac12p,\qquad D=1+s+p.
\]

The desired inequality is \(9F^2-16sD\ge0\), and

\[
9F^2-16sD
=
\frac{
9p^2-10ps+24p+17s^2+8s+16
}{4}.
\]

As a quadratic in \(p\), its unrestricted minimum occurs at
\(p=(5s-12)/9\) and equals

\[
\frac{16s(2s+3)}9\ge0.
\]

For \(a=3\), put

\[
s=x_1+x_2+x_3,\quad
p=x_1x_2+x_1x_3+x_2x_3,\quad
r=x_1x_2x_3.
\]

Then

\[
F=\frac23+\frac43s+\frac12p+\frac14r,\qquad
D=1+s+p+r.
\]

We need \(27F^2-32sD\ge0\).  Sixteen times this expression is

\[
\begin{aligned}
Q={}&108p^2+108pr+64ps+288p+27r^2\\
&-224rs+144r+256s^2+256s+192.
\end{aligned}
\tag{22}
\]

As a quadratic in \(r\), its vertex is

\[
r_0=-2p+\frac{112}{27}s-\frac83.
\]

At the vertex, \(27F^2-32sD\) equals

\[
\frac{32s(27p-11s+45)}{27}.
\]

If \(27p-11s+45\ge0\), this proves the claim.  Otherwise
\(11s>27p+45\).  The elementary inequality

\[
p^2\ge3sr
\tag{23}
\]

gives \(r\le p^2/(3s)\).  Moreover \(r_0>p^2/(3s)\): after
clearing denominators this is

\[
s(112s-54p-72)>9p^2,
\]

whose left side minus right side is already positive at
\(s=(27p+45)/11\) and is increasing thereafter.  Thus (22) is
decreasing throughout the feasible interval for \(r\), and its
minimum occurs no later than \(r=p^2/(3s)\).  Direct substitution
gives

\[
\begin{aligned}
27F^2-32sD
=\frac1{48s^2}\bigl(&9p^4+108p^3s+100p^2s^2+144p^2s\\
&+192ps^3+864ps^2+768s^4\\
&+768s^3+576s^2\bigr)\ge0.
\end{aligned}
\]

This proves (19).  Parameters equal to \(1\), as well as degenerate
laws with \(\pi_1=0\), follow by continuity.  The lemma is proved.

## 5. Why the hypergeometric law is covered

The probability generating polynomial in (13) is

\[
\sum_t\pi_tz^t
=
\frac1{\binom{N+a}k}
\sum_t\binom at\binom N{k-t}z^t.
\tag{24}
\]

This polynomial has only real nonpositive zeros.  One concise proof
is to write its numerator as

\[
e_k(\underbrace{z,\ldots,z}_{a},
\underbrace{1,\ldots,1}_{N}),
\]

and use real stability of the elementary symmetric polynomial
\(e_k\); diagonalization and real specialization preserve stability,
and a univariate real stable polynomial with nonnegative
coefficients has only real nonpositive zeros.

After normalization at \(z=1\), any such probability generating
polynomial factors as

\[
\prod_{j=1}^a(1-\lambda_j+\lambda_jz),
\qquad 0\le\lambda_j\le1,
\]

with zero or deterministic factors added if necessary.  Thus the
hypergeometric law is a Poisson-binomial law and Lemma (PB) applies.

## 6. Completion of the entropy theorem

Summing (7) gives

\[
\sum_i p_i^2\le\frac98\sum_i r_i.
\]

Together with Jensen's bound (6),

\[
\log_2q_k
\ge\sum_i r_i
\ge\frac89\sum_i p_i^2.
\]

This is (E8/9), and therefore also (E5/6).

