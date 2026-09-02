# Toeplitz-pair convolution lemma for Erdős Problem 993

Date: 2026-07-26

Status: the convolution lemma below is proved.  The pendant-cherry closure
statement at the end remains a conjectural proof obligation.  This note is
not a proof of Erdős Problem 993.

## Occupied-root formulation

For a planted rooted state, write

\[
T=E+xJ
\]

and put

\[
D=xJ=T-E.
\]

Thus \(D\) is the contribution from independent sets containing the planted
root.  For a polynomial \(P=\sum_kp_kx^k\), with zero extension outside its
support, define

\[
M_P(m,n)=p_mp_n-p_{m+1}p_{n-1}\qquad(m\geq n).
\]

The live primary invariant (MD) has the simpler equivalent form

\[
\tag{P}
M_T(m,n)\geq M_D(m,n)\qquad(m\geq n).
\]

Indeed, \(D_k=j_{k-1}\), so \(M_D(m,n)=M_J(m-1,n-1)\).

## Every Toeplitz 2-minor is a sum of ordered adjacent minors

Let \(U(P)\) be the bi-infinite upper Toeplitz matrix

\[
U(P)_{i,j}=p_{j-i}.
\]

Choose rows \(r_0<r_1\) and columns \(c_0<c_1\).  Put

\[
\delta=r_1-r_0,\qquad g=c_1-c_0,\qquad
m=c_1-r_1,\qquad n=c_0-r_0.
\]

Direct expansion gives

\[
\det U(P)[r_0,r_1;c_0,c_1]
=p_mp_n-p_{m+\delta}p_{n-\delta}.
\]

Telescoping gives

\[
p_mp_n-p_{m+\delta}p_{n-\delta}
=\sum_{t=0}^{\delta-1}M_P(m+t,n-t).
\]

If \(\delta\leq g\), then \(m\geq n\), so every summand already has ordered
indices.  If \(\delta>g\), put \(h=\delta-g=n-m\).  For
\(0\leq t<h\), the involution \(t\mapsto h-1-t\) pairs summands using

\[
M_P(a,b)=-M_P(b-1,a+1).
\]

Those first \(h\) terms cancel (with a zero middle term when needed), leaving

\[
\tag{1}
\det U(P)[r_0,r_1;c_0,c_1]
=\sum_{t=\max(0,\delta-g)}^{\delta-1}M_P(m+t,n-t).
\]

Every surviving pair satisfies \(m+t\geq n-t\).  Consequently, (P) implies
the entrywise inequality

\[
\tag{2}
C_2(U(T))\geq C_2(U(D))
\]

for **every** \(2\times2\) Toeplitz minor, not only adjacent-row minors.

## Common-convolution preservation

Let \(K=\sum k_ix^i\) be a nonnegative log-concave polynomial with no
internal zeros.  Equivalently, \(U(K)\) is totally positive of order two:
all its \(2\times2\) minors are nonnegative.

Since

\[
U(KT)=U(K)U(T),\qquad U(KD)=U(K)U(D),
\]

Cauchy--Binet gives, for every fixed pair of output rows and columns,

\[
\det U(KT)[R;C]-\det U(KD)[R;C]
=\sum_I \det U(K)[R;I]\,
\left(\det U(T)[I;C]-\det U(D)[I;C]\right).
\]

Every factor in each summand is nonnegative: the first by total positivity
of \(U(K)\), and the parenthesized difference by (1)--(2).  Hence:

> **Common-convolution lemma.** If \((T,D)\) satisfies (P), and \(K\) is a
> nonnegative log-concave coefficient sequence with no internal zeros, then
> \((KT,KD)\) also satisfies (P).

The proof applies to every Toeplitz \(2\)-minor; the adjacent case is the
one needed for (P).

The executable `toeplitz_pair_closure_search.py` independently checks
identity (1) on random exact inputs and checks the common-convolution
conclusion on generated exact pairs.

## Equivalent two-variable Schur-positivity formulation

There is a shorter structural interpretation of the same lemma.  Define the
symmetric bivariate polynomial

\[
\Phi_{T,D}(x,y)=T(x)T(y)-D(x)D(y).
\]

Fix a homogeneous degree \(N\).  If

\[
\Phi_{T,D}^{(N)}(x,y)=\sum_{m+n=N}f_{m,n}x^my^n,
\]

then \(f_{m,n}=t_mt_n-d_md_n\).  In two variables,

\[
s_{(m,n)}(x,y)
=(xy)^n(x^{m-n}+x^{m-n-1}y+\cdots+y^{m-n})
\qquad(m\geq n).
\]

Triangular inversion along a homogeneous slice shows that the coefficient
of \(s_{(m,n)}\) in \(\Phi_{T,D}^{(m+n)}\) is

\[
f_{m,n}-f_{m+1,n-1}
=M_T(m,n)-M_D(m,n).
\]

Therefore (P) is **equivalent** to Schur-positivity of every homogeneous
component of \(\Phi_{T,D}\).

If \(K\) is log-concave, then \(K(x)K(y)\) is Schur-positive by the same
two-variable calculation.  Since products of Schur-positive symmetric
polynomials are Schur-positive, the identity

\[
\Phi_{KT,KD}(x,y)
=K(x)K(y)\Phi_{T,D}(x,y)
\]

gives a second proof of the common-convolution lemma.  This formulation is
also the natural bridge to a coefficient-pairing or
Littlewood--Richardson proof of rooted-tree closure.

## Pendant-cherry proof obligation

Suppose an old planted state has total part \(A\), occupied part \(D\), and
excluded part

\[
B=A-D.
\]

Attach a new root to that old root and also to \(r\geq2\) new leaves.  With
\(K=(1+x)^r\), the new pair is

\[
\tag{3}
T'=KA+xB,\qquad D'=xB.
\]

Thus the exact remaining closure statement is:

> **Pendant-cherry closure conjecture.** If \(A,D,B=A-D\) are nonnegative
> rooted-state polynomials and \((A,D)\) satisfies (P), then the pair in
> (3) satisfies (P) for every \(r\geq2\).

For fixed \(m\geq n\), polarizing the Toeplitz minor shows that its reserve is

\[
\tag{4}
M_{T'}(m,n)-M_{D'}(m,n)
=M_{KA}(m,n)+\mathcal B_{m,n}(KA,xB),
\]

where

\[
\mathcal B_{m,n}(P,Q)
=p_mq_n+q_mp_n-p_{m+1}q_{n-1}-q_{m+1}p_{n-1}.
\]

The common-convolution lemma controls

\[
M_{KA}(m,n)-M_{KD}(m,n)\geq0,
\]

but this bound alone is sometimes insufficient term by term: the residual
\(M_{KD}+\mathcal B(KA,xB)\) can be negative even when the full expression
(4) is positive.  A proof therefore has to retain enough of the individual
Cauchy--Binet weights instead of discarding the common-convolution reserve
wholesale.

In bivariate form, the exact identity is

\[
\begin{aligned}
\Phi_{T',D'}(x,y)
={}&K(x)K(y)\Phi_{A,D}(x,y)\\
&+K(x)y\,A(x)B(y)
+xK(y)\,B(x)A(y)
+K(x)K(y)D(x)D(y).
\end{aligned}
\]

The first summand is Schur-positive by the proved common-convolution lemma.
The remaining three summands form a symmetric polynomial, but they are not
Schur-positive in isolation for every accepted exact input pair; the common
reserve can be essential.  A valid Schur proof must therefore pair part of
the remaining terms with individual Schur coefficients of the first
summand, rather than replacing that first summand by the coarse statement
that it is nonnegative.

The exact randomized search currently records:

* `toeplitz_pair_closure_50k_20260726.json`: 50,000 generated pairs,
  20,697 accepted input pairs, and 19,424,016 pendant-cherry minor checks for
  \(r\in\{2,3,4,5,8,12\}\), with no failure;
* `toeplitz_pair_closure_r1_100k_20260726.json`: an exact abstract failure
  for \(r=1\), confirming that the two-leaf hypothesis is substantive.

These computations are falsification evidence only.

## Partial-synchronization coordinates

Put

\[
U=A-D,\qquad V=A+D.
\]

Then

\[
\Phi_{A,D}(x,y)
=\frac12\bigl(U(x)V(y)+V(x)U(y)\bigr).
\]

Consequently, (P) is exactly the partial-synchronization relation
\(U\sim_{\mathrm p}V\) of Hu--Wang--Zhao--Zhao, once \(U\) and \(V\) are
known to be log-concave.  The rooted normalization is much stronger than
an arbitrary partially synchronized pair:

\[
U(0)=V(0)=1,\qquad [x]V-[x]U=2,\qquad
V-U=2xJ\geq0.
\]

Exact minimally padded HIT states through core order 12 satisfy all of
these conditions in 59,870 rooted orientations.  Ordinary synchronicity
already fails in that census, so partial synchronicity is the sharp
literature-level relation presently supported by the data.

For the pendant transform, let \(S=x\).  Direct expansion gives the useful
three-piece identity

\[
\tag{5}
\begin{aligned}
4\Phi_{T',D'}={}&(KV)(x)(KV)(y)\\
&+\frac12\bigl((KU)(x)((K+4S)U)(y)
((K+4S)U)(x)(KU)(y)\bigr)\\
&+\bigl(((K+2S)U)(x)(KV)(y)
(KV)(x)((K+2S)U)(y)\bigr).
\end{aligned}
\]

The first line is Schur-positive when \(V\) is log-concave.  The second is
Schur-positive because \(K\) and \(K+4x\) are partially synchronized for
\(K=(1+x)^r,\ r\ge2\), and common convolution preserves partial
synchronicity.  Thus (5) reduces the full pendant statement to the
normalized paired-binomial assertion

\[
\tag{6}
(K+2x)U\sim_{\mathrm p}KV.
\]

Assertion (6) is false for arbitrary partially synchronized pairs, and
also false if one merely adds \(U\le V\).  The first exact ordered
counterexample found has \([x]V-[x]U=100\).  With the rooted normalization
\([x]V-[x]U=2\), however, one million adversarial random trials at \(r=2\)
and a further 400,000 trials spread over \(r=3,4,8,12\) found no failure.
An exhaustive bounded search through degree three and coefficients at most
10 also found no failure.  This remains evidence, not a proof of (6).

## Why the prefix cutoff is now part of the invariant

Full (P) is stronger than the unimodality problem requires.  If
\(\alpha=\deg A\), the already-proved decreasing-tail theorem starts at

\[
L(A)=\left\lceil\frac{2\alpha-1}{3}\right\rceil.
\]

Therefore only the diagonal inequalities

\[
\tag{P-prefix}
M_A(k,k)\ge M_D(k,k)\qquad(0\le k<L(A))
\]

are needed to deduce prefix log-concavity of \(A\) from that of \(D\).

This distinction is not cosmetic.  Synthetic child states satisfying
log-concavity, (P), \(A\sim_{\mathrm p}(A-D)\), the exact forest edge
identity, the triangle-free \(i_3\) identity

\[
i_3=\binom n3-e(n-2)+\sum_v\binom{d(v)}2,
\]

the handshake identity, the component bound on isolated vertices, and the
universal bounds
\(\binom{\alpha}{k}\le i_k\le\binom nk\) can lose full (P) after branching.
The first loss occurs at \(k=19\) for a degree-20 parent, while
\(L=13\): it lies strictly inside the already-decreasing tail.

The exact certificate
`synthetic_branching_identity_prefix_100k_20260726.json` tested 100,000
such branching instances and 9,509,766 ordered minors.  It found full
minor and full partial-synchronization failures in the tail, but **no**
failure of (P-prefix).  The next proof target is consequently a
cutoff-aware branching lemma, not universal Schur-positivity.
