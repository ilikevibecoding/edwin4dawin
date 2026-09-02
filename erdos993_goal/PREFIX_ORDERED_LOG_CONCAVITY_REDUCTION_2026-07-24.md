# Prefix ordered log-concavity: a direct reduction for Erdős 993

Date: 2026-07-24

Status: **conjectural reduction, not a solution**.

Let \(F\) be a forest and write

\[
I(F;x)=\sum_{k=0}^{\alpha} a_kx^k,
\qquad
\alpha=\alpha(F).
\]

Define

\[
L=\left\lceil\frac{2\alpha-1}{3}\right\rceil
  =\left\lfloor\frac{2\alpha+1}{3}\right\rfloor .
\]

The known decreasing-tail theorem for bipartite graphs gives

\[
a_L\ge a_{L+1}\ge\cdots\ge a_\alpha .
\]

The following strengthening on only the complementary prefix would therefore
settle the Alavi--Malde--Schwenk--Erdős conjecture.

## Prefix ordered-log-concavity conjecture

For every forest \(F\),

\[
\boxed{\quad
(k+2)a_ka_{k+2}\le (k+1)a_{k+1}^{\,2}
\quad}
\tag{POLC}
\]

for every

\[
0\le k\le L-2.
\]

This is weaker than ordered log-concavity at all ranks.  The all-rank
statement is false for trees, beginning at order 26; all currently known
failures are beyond the prefix required in (POLC).

## 1. Why (POLC) proves unimodality

Put

\[
\mu_k=\frac{(k+1)a_{k+1}}{a_k}.
\]

The number \(\mu_k\) is the average number of vertices by which a uniformly
chosen independent \(k\)-set can be extended.

Inequality (POLC) is exactly

\[
\mu_{k+1}\le\mu_k.
\]

Thus \(\mu_0,\ldots,\mu_{L-1}\) is nonincreasing.  Since

\[
\frac{a_{k+1}}{a_k}=\frac{\mu_k}{k+1},
\]

the adjacent coefficient ratios are also nonincreasing through the prefix.
Consequently they cross \(1\) at most once there.  The known theorem already
makes the coefficients nonincreasing from \(a_L\) onward.  Hence the entire
coefficient sequence is unimodal.

Notice the endpoint: inequalities at \(k=0,\ldots,L-2\) compare the ratios
\(a_{k+1}/a_k\) and \(a_{k+2}/a_{k+1}\), up to the ratio
\(a_L/a_{L-1}\).  No inequality at \(k=L-1\) is needed.

## 2. Exact residual-forest formulation

Fix \(k\), and choose an independent \(k\)-set \(S\) uniformly.  Let

\[
R_S=F-N[S]
\]

be the subforest induced by vertices that can still be added to \(S\).  Set

\[
e(S)=|V(R_S)|,\qquad m(S)=|E(R_S)|.
\]

Double counting one-vertex extensions gives

\[
\sum_{|S|=k}e(S)=(k+1)a_{k+1}.
\tag{1}
\]

An ordered pair of distinct addable vertices extends \(S\) by two vertices
precisely when the pair is not an edge of \(R_S\).  Therefore

\[
\sum_{|S|=k}
\bigl(e(S)(e(S)-1)-2m(S)\bigr)
=(k+1)(k+2)a_{k+2}.
\tag{2}
\]

After dividing by \(a_k\), (POLC) is equivalent to

\[
\mathbb E\!\left[e(e-1)-2m\right]\le(\mathbb Ee)^2,
\]

or, equivalently,

\[
\boxed{\quad
\operatorname{Var}(e(S))
\le \mathbb E e(S)+2\mathbb E m(S).
\quad}
\tag{RV}
\]

Thus Erdős 993 follows from (RV) for a uniformly random independent \(k\)-set
whenever \(k\le L-2\).

This formulation is exact: no asymptotics, floating-point comparison, or
unproved probabilistic approximation is involved.

## 3. A tempting stronger lemma is false

Writing

\[
e(S)=\sum_v Y_v,
\]

where \(Y_v\) indicates that \(v\notin N[S]\), might suggest proving
pairwise negative correlation for nonadjacent vertices.  That statement is
false even for a five-vertex tree.

Take the tree with edges

\[
\{10,12,03,04\}.
\]

At rank \(k=1\), the two sibling leaves \(3,4\) are simultaneously addable
for two of the five singleton choices, while each is individually addable
for three:

\[
\Pr(Y_3=Y_4=1)=\frac25>\frac35\frac35.
\]

Any proof of (RV) must therefore use aggregate cancellation or a more
structured charge; pairwise negative association is unavailable.

## 4. The star calculation

For the star \(K_{1,r}\),

\[
I(K_{1,r};x)=(1+x)^r+x.
\]

At rank \(1\),

\[
\mu_1=\frac{r(r-1)}{r+1},
\qquad
\mu_2=r-2,
\]

so

\[
\mu_2-\mu_1=-\frac{2}{r+1}.
\]

For every \(k\ge2\), \(\mu_k=r-k\), so successive drops equal \(1\).
Stars explain the closest prefix examples in exhaustive small-tree tests:
the prefix inequality can have arbitrarily small, but still strictly
positive, slack.

## 5. Exact evidence as of 2026-07-24

All comparisons below used integer cross-products.

1. Every one of the 205,004 unlabeled trees of orders at most 18 satisfies
   (POLC).  The closest case is the star at \(k=1\), with
   \(\mu_2-\mu_1=-2/n\).
2. A free-form evolutionary search over 3,900 trees of order 120 found no
   failure.  Its closest nontrivial candidate had
   \(\alpha=90\), \(L=60\), \(k=58\), and
   \(\mu_{59}-\mu_{58}=-0.8994106762\).
3. Every NetworkX graph-atlas graph with \(|E|\le|V|-1\), plus 300 sampled
   sparse graphs of orders at most 20, passed.  This is only exploratory
   evidence; no theorem for sparse nonforests is asserted.
4. Fixing the strong order-32 non-log-concave tree and multiplying by every
   multiset of at most six components drawn from all 22 archived
   non-log-concave tree types (orders 26, 28, and 32) gives 376,740 exact
   forest products.  Every product passed (POLC).
5. Multiplying the strong order-32 witness by up to 300 isolated vertices,
   by a star with up to 300 leaves, or by up to 150 disjoint edges also
   produced no prefix failure.

The evidence does **not** prove (POLC).  It identifies (RV) as a sharply
testable proof target whose truth, together with the known tail theorem,
would prove the original conjecture.

## 6. Current proof target

The remaining task is to exploit that:

* \(F\) is acyclic;
* \(R_S\) is an induced subforest;
* \(S\) is uniform on one rank of the independence complex; and
* \(k\le L-2\), equivalently \(3k\le2\alpha-5\) after accounting for
  integer endpoints,

to prove the residual variance bound (RV).  Any local claim used in that
argument must survive the sibling-leaf positive-correlation example above.

