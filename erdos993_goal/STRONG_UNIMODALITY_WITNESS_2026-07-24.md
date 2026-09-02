# Exact strong-unimodality witness from the 102-vertex tree

Let

\[
P(x)=\sum_{i=0}^{51}a_i x^i
\]

be the independence polynomial certified by
`verify_perfect_matching_lc_failure.py`.  Its only log-concavity failure is

\[
D:=a_{49}a_{51}-a_{50}^2
  =217118746959920758784>0.
\]

This failure gives an exact (abstract) unimodal convolution witness.

## Local jump lemma

Suppose a finite nonnegative sequence \(a\) satisfies

\[
a_j^2<a_{j-1}a_{j+1}.
\]

Put

\[
A=a_{j-1}+a_j,\qquad B=a_j+a_{j+1}.
\]

Then

\[
\frac{a_j}{a_{j-1}}<\frac BA<
\frac{a_{j+1}}{a_j}.
\]

Let \(b\) be any nonnegative unimodal integer sequence whose first
difference has, in a window of width at least \(\deg a+1\), exactly the two
nonzero entries

\[
\Delta b_r=A,\qquad \Delta b_{r+1}=-B.
\]

(The sequence can be ramped up before this window and down after it, so such
an abstract sequence with \(b_0=1\) always exists.)  If \(c=a*b\), then

\[
\begin{aligned}
c_{r+j}-c_{r+j-1}
 &=Aa_j-Ba_{j-1}\\
 &=a_j^2-a_{j-1}a_{j+1}<0,\\
c_{r+j+1}-c_{r+j}
 &=Aa_{j+1}-Ba_j\\
 &=a_{j-1}a_{j+1}-a_j^2>0.
\end{aligned}
\]

Thus \(c\) has a strict valley at \(r+j\).

For the certified tree, \(j=50\), and the two slopes are exactly \(-D\) and
\(+D\).

## Why this is not yet a forest counterexample

The most economical witness begins with a descending shelf:

\[
(A,A-B,A-B,\ldots,A-B).
\]

After normalization its constant coefficient is \(1\), but all later shelf
coefficients are strictly between \(0\) and \(1\).  It therefore cannot be
an independence polynomial, since every graph independence polynomial has
constant coefficient \(1\) and nonnegative integer coefficients.

Embedding the two jumps later produces an integer unimodal sequence starting
at \(1\).  One completely explicit choice is obtained by putting
\(r=53\) and taking

\[
b_0=\cdots=b_{r-1}=1,\qquad
b_r=1+A,\qquad
b_{r+1}=\cdots=b_{r+53}=1+A-B.
\]

The convolution \(c=a*b\) has its strict valley at index \(r+50=103\),
with exact consecutive slopes \(-D,+D\).  This particular witness cannot be
the independence polynomial of any graph: \(b_1=1\) would force the graph to
have exactly one vertex, whereas \(\deg b=106\).

No realization of a suitable witness as a forest independence polynomial is
known.
The realization problem is now concrete: find a forest polynomial having,
over a 52-rank window around its mode, an upward jump \(A\), immediately
followed by a downward jump \(B\), with

\[
\frac BA\in
\left(
\frac{a_{50}}{a_{49}},
\frac{a_{51}}{a_{50}}
\right),
\]

while all other slope contributions in that window are small enough not to
destroy the two strict signs.

This exact lemma explains both facts observed computationally:

1. non-log-concavity guarantees an abstract unimodal convolution witness;
2. ordinary small tree factors do not automatically convert it into a
   forest counterexample, because independence polynomials obey much stronger
   integrality and initial-growth constraints than arbitrary unimodal
   sequences.

The exact replay is

`C:\Users\chris\erdos993_goal\verify_strong_unimodality_witness.py`.
