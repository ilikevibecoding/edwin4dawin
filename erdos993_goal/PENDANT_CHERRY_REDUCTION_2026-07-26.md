# Pendant-cherry reduction for Erdős Problem 993

Date: 2026-07-26

Status: the polynomial identity and structural reduction are proved.  The
coefficient-shape lemma isolated below is conjectural, so this note is not a
proof of Erdős 993.

## The operation

Let \(R\) be a tree with a distinguished vertex \(w\).  Add a new vertex
\(v\) adjacent to \(w\), and then add \(r\) new leaves adjacent to \(v\).
Call the resulting tree \(C_r(R,w)\).

Splitting independent sets according to whether \(v\) is selected gives

\[
\tag{1}
I(C_r(R,w);x)=(1+x)^r I(R;x)+xI(R-w;x).
\]

If \(v\) is excluded, the \(r\) leaves are free and the contribution is
\((1+x)^rI(R)\).  If \(v\) is included, its leaves and \(w\) are excluded,
giving \(xI(R-w)\).

## Why \(r\ge2\) captures no-degree-two trees

Let \(T\) be a nonstar tree with no vertex of degree two.  Take an endpoint
of a longest path, and let \(v\) be its neighbor.  Every neighbor of \(v\)
except the next vertex \(w\) on the path is a leaf.  Since
\(\deg_T(v)\ne2\), there are at least two such leaves.  Removing \(v\) and
those leaves leaves a tree \(R\), and \(T=C_r(R,w)\) for some \(r\ge2\).
Stars are the immediate base case

\[
I(K_{1,r})=(1+x)^r+x.
\]

Thus the following statement would eliminate every no-degree-two tree as a
minimal counterexample.

> **Pendant-cherry lemma.** For every tree \(R\), vertex \(w\), and
> \(r\ge2\), the polynomial
> \[
> (1+x)^rI(R)+xI(R-w)
> \]
> is unimodal whenever the smaller polynomials needed by the induction
> satisfy the forest conjecture.

The qualification about forests matters: \(R-w\) can be disconnected, and
the convolution of arbitrary unimodal sequences need not be unimodal.
A complete induction must either retain the forest statement or prove a
stronger tree-only version of the lemma.

## What elementary sequence facts do and do not prove

The first summand in (1) is a binomial smoothing of \(I(R)\).  Since a
binomial row is log-concave, it is strongly unimodal: convolving it with a
unimodal sequence produces a unimodal sequence.  The second summand is a
shift of \(I(R-w)\).

Their modes need not be adjacent.  In the exact census below their distance
reaches six, yet the first summand has enough coefficient slope to prevent a
valley.  Therefore the missing statement is a quantitative slope-dominance
or one-crossing lemma, not the elementary adjacent-mode sum lemma.

Nor do abstract coefficient conditions suffice.  The unimodal sequences

\[
A=(1,1,1,1,2),\qquad B=(1,1)
\]

satisfy \(B\le A\) coefficientwise, but

\[
(1+x)^2A+xB=(1,4,5,4,5,5,2)
\]

is not unimodal.  A proof must use the fact that \(A=I(R)\) and
\(B=I(R-w)\) are a genuine tree/deletion pair.

## Exact evidence

`verify_pendant_cherry_reduction.py` checks (1) in coefficient form for
every rooted unlabeled tree \(R\) through the selected order and every
selected leaf multiplicity, using exact integer arithmetic.  It records any
valley and the maximum distance between the summand modes.

Reproduction command:

```powershell
python .\verify_pendant_cherry_reduction.py `
  --max-base-order 14 `
  --r-min 2 `
  --r-max 12 `
  --output .\pendant_cherry_n14_r2-12_exact_20260726.json
```

This finite check is evidence only.  The live proof obligation is a
tree-realizable one-crossing inequality for the coefficient differences of
\((1+x)^rI(R)\) and \(xI(R-w)\).

The order-14 run checked 72,145 rooted tree states and 793,595
\((R,w,r)\) instances, with no valley.  The maximum summand-mode distance
was six.  Certificate SHA-256:
`2DA5C65F14A2C7B66732058757B95A77309A35473BF4875836000C9FE0C1E2FE`.
