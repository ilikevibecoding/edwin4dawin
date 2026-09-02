# The first two shifted predecessors of the affine bridge

This note proves the exact two off-central coefficients needed by the first
Pascal propagation step.  It is an all-parameter theorem, not a finite scan.

## Theorem

Let `B_epsilon` be either the group or bottom affine kernel, and put

\[
 F_0(i,j)=[z^iw^j]A^aS^bB_\epsilon^\vee.
\]

With the fixed reciprocal target `N` from the single-Newton-sequence
reduction, for both parities and throughout the full domains

\[
 c\ge1,\quad m\ge3,\quad x\ge0 \qquad\hbox{(group)},
\]

\[
 m\ge3,\quad x\ge0 \qquad\hbox{(bottom)},
\]

one has

\[
 \boxed{F_0(N-1,N)>0,\qquad F_0(N-1,N-1)>0.}
\]

In original coordinates these are the coefficients at the shifted targets
`(m+6,m+5)` and `(m+6,m+6)` respectively.

## Bounded extraction

Write the original target as `(L+u,L+v)`, where `L=m+5` and
`(u,v)` is `(1,0)` or `(1,1)`.  For a kernel monomial `z^p w^q`, expansion
of `T^b` gives

\[
 [z^{L+u}w^{L+v}]A^aT^bz^pw^q
 =\sum_k {b\choose k}
 {a+b-k\choose L+v-q-b+k}
 {a+k\choose L+u-p-k}.                         \tag{1}
\]

Put `k=m+delta`.  The two lower binomial indices are as follows.

| package | parity | left index | right index | normalization |
|---|---:|---|---|---|
| group | 0 | `9+v-q+delta` | `5+u-p-delta` | `C(2m-4,m-2)` |
| group | 1 | `8+v-q+delta` | `5+u-p-delta` | `C(2m-3,m-2)` |
| bottom | 0 | `10+v-q+delta` | `5+u-p-delta` | `C(2m-5,m-2)` |
| bottom | 1 | `9+v-q+delta` | `5+u-p-delta` | `C(2m-4,m-2)` |

Thus (1) is a bounded hypergeometric sum.  Divide by the displayed positive
central binomial and make the natural shifts `c=C+1`, `m=M+3`.  Exact
expansion gives, in each of the eight cases,

\[
 \frac{F_0(N-1,N)}{\text{normalization}}
 =\frac{P_{10}}{D_{10}},\qquad
 \frac{F_0(N-1,N-1)}{\text{normalization}}
 =\frac{P_{11}}{D_{11}},                            \tag{2}
\]

where every coefficient of each numerator `P` is strictly positive and
every denominator is a positive product of `M+i`.  The replay record stores
the degrees, number of terms, smallest coefficient, gcd, and canonical hash
of all eight numerator polynomials.  Hence (2) is strictly positive for all
allowed parameters.

## Exact replay

Run

```text
python prove_affine_bridge_r0_shifted_predecessors.py
```

The output is
`affine_bridge_r0_shifted_predecessors_exact_20260810.json`.

This closes the complete `r=0` boundary triple, and therefore proves the
order-one affine coefficient again by the spatial recurrence.  It does not
yet propagate automatically: applying Pascal to either shifted predecessor
introduces further shifted states.  An all-order proof still needs a closed
weighted boundary cone (or an equivalent Newton inequality).
