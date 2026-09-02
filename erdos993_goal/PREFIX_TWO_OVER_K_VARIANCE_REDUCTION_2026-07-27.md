# The false prefix \(2/k\) variance target for Erdős Problem 993

Date: 2026-07-27

Status: **the proposed inequality is false**.  All algebraic equivalences
and the size-biased coupling below are exact, but Section 7 gives a
25-vertex tree counterexample to the boxed variance inequality.  This is
not a counterexample to Erdős Problem 993: the tree's independence
sequence is unimodal and is ordered log-concave at the failing rank.

Let \(F\) be a forest and write

\[
I(F;x)=\sum_{j=0}^{\alpha}p_jx^j,
\qquad
L=\left\lfloor\frac{2\alpha+1}{3}\right\rfloor .
\]

The known decreasing-tail theorem for bipartite graphs gives

\[
p_L\ge p_{L+1}\ge\cdots\ge p_\alpha .
\]

Thus it is enough to control adjacent coefficient ratios through the rank
\(L-1\) to \(L\) transition.

## 1. The proposed prefix inequality

For \(1\le k\le\alpha\), define

\[
G_k
=kp_k^2+p_{k-1}p_k-(k+1)p_{k-1}p_{k+1}
\]

and

\[
\sigma_k=\frac{G_k}{p_{k-1}p_k}.
\]

The proposed proof target was

\[
\boxed{\qquad k\sigma_k\ge 2(k-1)\qquad}
\tag{V2/k}
\]

for every forest and every

\[
2\le k<L.
\]

Equivalently,

\[
\sigma_k\ge 2-\frac2k .
\tag{1}
\]

In coefficient form this is

\[
\boxed{\quad
k^2p_k^2-(k-2)p_{k-1}p_k
-k(k+1)p_{k-1}p_{k+1}\ge0 .
\quad}
\tag{2}
\]

This is stronger than the prefix ordered-log-concavity target.  It is
false, as shown in Section 7.

## 2. Extension-mean form

Let

\[
\mu_j=(j+1)\frac{p_{j+1}}{p_j}.
\]

This is the mean number of vertices that extend a uniformly chosen
independent \(j\)-set.  Direct division of \(G_k\) gives

\[
\sigma_k=1+\mu_{k-1}-\mu_k.
\tag{3}
\]

Consequently (V2/k) is equivalent to the drift inequality

\[
\boxed{\quad
\mu_k\le\mu_{k-1}-1+\frac2k .
\quad}
\tag{4}
\]

The interpretation is concrete: before the tail begins, passing up one
rank should reduce the mean number of extensions by at least
\(1-2/k\).

## 3. Exact residual-forest form

Choose \(S\) uniformly from the independent \((k-1)\)-sets of \(F\), and
let

\[
R_S=F-N[S],\qquad
e(S)=|V(R_S)|,\qquad
q(S)=|E(R_S)|.
\]

Double counting one- and two-vertex extensions gives

\[
\mathbb E e=\frac{kp_k}{p_{k-1}}=\mu_{k-1}
\tag{5}
\]

and

\[
\mathbb E\!\left[e(e-1)-2q\right]
=\frac{k(k+1)p_{k+1}}{p_{k-1}}.
\tag{6}
\]

Substitution into the definition of \(G_k\) yields the exact identity

\[
\frac{kG_k}{p_{k-1}^2}
=2\mathbb E e+2\mathbb E q-\operatorname{Var}(e).
\tag{7}
\]

Dividing (7) by (5) gives

\[
\sigma_k
=2+\frac{2\mathbb E q-\operatorname{Var}(e)}{\mathbb E e}.
\tag{8}
\]

Therefore (V2/k) is exactly

\[
\boxed{\quad
\operatorname{Var}(e)
\le 2\mathbb E q+\frac2k\mathbb E e .
\quad}
\tag{RV2/k}
\]

There is no approximation in this reduction.  The term \(2\mathbb E q\)
charges fluctuations in the extension count against adjacency inside the
residual forest; the remaining allowed variance is only \(2\mathbb E e/k\).

## 4. The size-biased extension-edge identity

Consider all ordered extension edges

\[
\mathcal E_k
=\{(S,v):S\in\mathcal I_{k-1},\ v\in V(R_S)\}.
\]

Choose \((S,v)\) uniformly from \(\mathcal E_k\).

* The first coordinate \(S\) has the \(e\)-size-biased distribution:
  its probability is proportional to \(e(S)\).
* The set \(T=S\cup\{v\}\) is uniform on \(\mathcal I_k\), because every
  independent \(k\)-set has exactly \(k\) parents.
* Pointwise,

  \[
  e(T)=e(S)-1-\deg_{R_S}(v).
  \tag{9}
  \]

Averaging (9) over \(\mathcal E_k\), using

\[
\mathbb E_{\mathcal E_k}e(S)
=\frac{\mathbb E e^2}{\mathbb E e}
=\mathbb E e+\frac{\operatorname{Var}(e)}{\mathbb E e}
\]

and

\[
\mathbb E_{\mathcal E_k}\deg_{R_S}(v)
=\frac{2\mathbb E q}{\mathbb E e},
\]

gives

\[
\boxed{\quad
\mu_k
=\mu_{k-1}-1+
\frac{\operatorname{Var}(e)-2\mathbb E q}{\mu_{k-1}} .
\quad}
\tag{10}
\]

Thus (RV2/k) says precisely that the excess caused by size-biasing the
parent set, after paying the average residual degree of the added vertex,
is at most \(2/k\).

This coupling is the most promising proof lens presently known.  A proof
must compare a uniform rank-\((k-1)\) set with its \(e\)-size-biased
version while exploiting that symmetric differences and residual graphs
inside a forest are themselves forests.

## 5. Why (V2/k) proves the original conjecture

Ordered log-concavity at rank \(k\) is

\[
kp_k^2\ge(k+1)p_{k-1}p_{k+1}.
\tag{11}
\]

By (3), (11) is equivalent to \(\sigma_k\ge1\).  For \(k\ge2\),

\[
2-\frac2k\ge1,
\]

with strict inequality for \(k\ge3\).  Hence (V2/k) implies ordered
log-concavity at every required rank \(2,\ldots,L-1\).

Rank \(1\) is automatic for every graph: if \(F\) has \(n\) vertices and
\(m\) edges, then

\[
p_1^2-2p_0p_2=n+2m\ge0.
\]

It follows that the adjacent ratios \(p_k/p_{k-1}\) are nonincreasing
through the whole prefix ending at \(p_L\).  They cross \(1\) at most
once.  The known decreasing-tail theorem takes over at \(p_L\), proving
that the entire independent-set sequence is unimodal.

Therefore:

> If (V2/k), equivalently (RV2/k), holds for every forest at
> \(2\le k<L\), then the Alavi--Malde--Schwenk--Erdős conjecture is true.

## 6. A universal companion bound

For a forest, every residual graph \(R_S\) is a forest, so

\[
q(S)=e(S)-c(S),
\]

where \(c(S)\) is the number of nonempty components of \(R_S\).  Thus the
proposed bound has the further exact form

\[
\operatorname{Var}(e)+2\mathbb E c
\le 2\left(1+\frac1k\right)\mathbb E e.
\tag{12}
\]

Also \(q(S)\le e(S)\).  Since variance is nonnegative, (8) immediately
gives the unconditional upper bound

\[
\boxed{\quad \sigma_k\le4 \quad}
\tag{13}
\]

at every internal rank with positive adjacent coefficients.  The open
content of (V2/k) is a lower bound approaching \(2\), not control of
arbitrarily large positive curvature.

This also explains why the inequality is compatible with known trees
whose independence polynomials fail ordinary or ordered log-concavity
late in the sequence: the assertion is restricted to the prefix needed
for unimodality.

## 7. Exact counterexample

Let \(T_{6,3}\) consist of a central vertex joined to six support
vertices, with three leaves joined to every support.  It is a tree on
25 vertices with independence polynomial

\[
\begin{aligned}
(&1,25,276,1799,7791,23934,54499,95136,130803,144638,\\
 &130568,97080,59588,30042,12273,3966,975,171,19,1).
\end{aligned}
\]

Its independence number is \(19\), so

\[
L=\left\lfloor\frac{2(19)+1}{3}\right\rfloor=13.
\]

At the genuine prefix rank \(k=11<L\), exact calculation gives

\[
\sigma_{11}
=\frac{119697396}{66018445}
=1.8130902053\ldots
<\frac{20}{11}.
\]

Equivalently, the two integer sides of (V2/k) are

\[
252800900352<253510828800,
\]

with gap \(-709928448\).

The residual-statistic failure is also exact.  For a uniform independent
10-set,

\[
\mathbb E e=\frac{133485}{16321},\qquad
\mathbb E q=\frac{23373}{32642},
\]

\[
\operatorname{Var}(e)
=\frac{788674035}{266375041}
>
\frac{47643}{16321}
=2\mathbb E q+\frac2{11}\mathbb E e.
\]

Nevertheless the ordinary ordered-log-concavity reserve is positive:

\[
11p_{11}^2-12p_{10}p_{12}=10306358592>0.
\]

The sequence is unimodal, with its unique mode at rank \(9\).  Hence this
tree kills only the proposed strengthening, not the original conjecture
and not even the older prefix ordered-log-concavity route.

The polynomial has the independent closed-form reconstruction

\[
I(T_{6,3};x)
=\bigl((1+x)^3+x\bigr)^6+x(1+x)^{18},
\]

obtained by conditioning on the central vertex.  It was also recomputed
directly by an unrelated bitmask tree engine.

## 8. How the counterexample was found

All comparisons used integer cross-products.

1. Every distinct forest independence polynomial through order \(15\)
   had passed (V2/k): 28,044 polynomials in total, representing all forest
   products through that order.  The closest ratio

   \[
   \frac{k\sigma_k}{2(k-1)}
   =1.0702105263157895
   \]

   occurs at order \(13\), \(\alpha=10\), \(k=6\), for

   \[
   (1,13,66,175,279,300,228,123,45,10,1).
   \]

   The exact two sides are \(732024\) and \(684000\), leaving gap \(48024\).

2. All 43,595 exact 60-vertex PatternBoost tree polynomials passed at all
   824,691 prefix ranks checked.  The closest ratio is approximately
   \(1.4223754547\), at rank \(20\).

3. A random Prüfer scan of 5,000 trees of orders \(16\) through \(500\)
   checked 479,404 prefix ranks without a failure.  Its closest ratio is
   approximately \(1.1158987875\), at order \(90\), rank \(36\).

4. The published tree with parameters
   \((k,n,\ell,m)=(3,10,7,214)\), constructed to have five consecutive
   log-concavity failures, passes all required ranks.  Its closest ratio
   is approximately \(1.4712624348\).

5. The large Galvin-family tree that falsifies the full scaled-curvature
   cascade has \(\sigma_k\) close to \(3\) at the offending rank and hence
   passes (V2/k) with a large margin.

The missed structure was a small member of the same two-level family:

\[
I(T_{m,t};x)
=\bigl((1+x)^t+x\bigr)^m+x(1+x)^{mt}.
\]

An exact boundary-directed scan found the first retained failure at
\((m,t,k)=(6,3,11)\).  The earlier generic corpora did not contain this
25-vertex tree, and the exhaustive census stopped at order 15.  This is
a useful warning that large random tests can be less incisive than a
small parameterized family aimed at the observed extremizer.

## 9. What survives

The following parts remain valid and useful:

1. identities (3), (7), (8), (10), and (12);
2. the size-biased extension-edge coupling;
3. the unconditional forest upper bound \(\sigma_k\le4\);
4. the older and weaker ordered-log-concavity target
   \(\sigma_k\ge1\).

The counterexample shows that a successful variance charge must allow
more than \(2\mathbb E e/k\) of uncharged variance.  The exact remaining
target is

\[
\operatorname{Var}(e)\le2\mathbb E q+\mathbb E e,
\]

equivalently prefix ordered log-concavity.  The pendant curvature cascade
and component-switching routes remain active fallbacks.
