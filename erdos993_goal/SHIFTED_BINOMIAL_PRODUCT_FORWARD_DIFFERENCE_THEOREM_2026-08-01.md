# Shifted binomial-product forward-difference theorem

For nonnegative integers \(\alpha,\beta,u,v,r\), define

\[
D_r(\alpha,\beta;u,v)
=\left.\Delta_n^r
\left\{\binom{n+\alpha}{u}\binom{n+\beta}{v}\right\}
\right|_{n=0}.
\]

Then

\[
\boxed{
D_r(\alpha,\beta;u,v)
=\sum_{\substack{p,q\ge0\\\max(p,q)\le r\le p+q}}
\binom{\alpha}{u-p}\binom{\beta}{v-q}
\frac{r!}{(p+q-r)!(r-p)!(r-q)!}.}
\tag{1}
\]

In particular,

\[
D_r(\alpha,\beta;u,v)\ge0.                         \tag{2}
\]

## Proof

Put \(A=(1+z)(1+w)\) and \(W=A-1=z+w+zw\). Coefficient extraction
and the definition of a forward difference give

\[
D_r(\alpha,\beta;u,v)
=[z^uw^v](1+z)^\alpha(1+w)^\beta W^r.             \tag{3}
\]

If a term in \(W^r=(z+w+zw)^r\) uses \(r-q\) copies of \(z\),
\(r-p\) copies of \(w\), and \(p+q-r\) copies of \(zw\), then its
coefficient at \(z^pw^q\) is

\[
\frac{r!}{(p+q-r)!(r-p)!(r-q)!},
\]

with exactly the support condition in (1). Multiplying by the two
binomial expansions in (3) proves (1). Every factor in every summand is
nonnegative, proving (2).

## Stable-P4 specialization

In the reciprocal affine bridge, write

\[
a=2c+m+x-3,\qquad b=2m+\epsilon-4,
\]

and

\[
N=2c+4m+x+2\epsilon+8
=a+\frac{3b+\epsilon+34}{2}.
\]

Since

\[
S^b
=\sum_{t=0}^b\binom bt
z^{2t}w^{2b-2t}(1+z)^{b-t}(1+w)^t,
\]

the contribution of a reciprocal-kernel monomial \(z^iw^j\) to

\[
[z^Nw^N]A^aS^bW^r
\]

is the explicit positive sum

\[
\sum_{t=0}^b\binom bt
D_r\left(
a+b-t,a+t;
N-i-2t,N-j-2b+2t
\right).                                             \tag{4}
\]

Thus every remaining positive-intersection affine coefficient is a
finite signed combination of known nonnegative hypergeometric atoms.
The unresolved step is to prove that the signed \(B_\epsilon\) atoms
are dominated by the \(rP\) atoms. Formula (4) removes all generating
functions and infinite series from that question.

The exact identity was independently replayed in 63,700 integer cases
by `verify_shifted_binomial_product_forward_difference.py`; the record
is `shifted_binomial_product_forward_difference_20260801.json`.

The complete stable-P4 specialization (4), including reciprocity,
the target \(N\), the affine kernels, and the \(r\)-indexing, was then
compared against direct bivariate polynomial convolution at three
parameter points, both parities, and orders \(0\le r\le6\). All 42 exact
integer comparisons agree. The independent replay is
`verify_path_isolate_p4_affine_forward_difference_bridge.py`, with record
`path_isolate_p4_affine_forward_difference_bridge_20260801.json`.
