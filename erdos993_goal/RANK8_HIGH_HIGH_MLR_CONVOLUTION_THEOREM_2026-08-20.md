# Rank-eight high/high full-convolution theorem by conditional MLR

Date: 2026-08-20

Status: **exact all-order theorem for the complete rank-eight high/high
full/full cone.**

## Theorem

Let two positive factorial rows `a=(a_i)` and `b=(b_i)` have next-ratios

```text
A_i=a_(i+1)/a_i,    B_i=b_(i+1)/b_i,
```

and suppose, through index seven,

```text
A_i-A_(i+1) >= h,    B_i-B_(i+1) >= h.
```

The actual high cone is stronger at index zero (`delta0>=2h`).  For the
factorial convolution

```text
c_k=sum_i C(k,i)a_i b_(k-i),
```

one has

```text
c8^2-c7*c9-h*c7*c8 >= 0.
```

Thus the complete rank-eight high/high full-convolution cone is closed.

## Self-contained proof

Factorially de-scale and normalize the finite rows:

```text
p_i proportional to a_i/i!,    q_j proportional to b_j/j!.
```

They are log-concave.  Indeed,

```text
p_(i+1)/p_i=A_i/(i+1),
```

and this ratio is nonincreasing because `A_i>=A_(i+1)>=0`; the same holds
for `q`.

Let independent `X,Y` have these rows.  Conditional on `X+Y=z`, the weight
of `X=i` is proportional to

```text
C(z,i)a_i b_(z-i).
```

For the move from `z=7` to `z=8`, the likelihood ratio of the two
conditional `X` laws is proportional to

```text
q_(8-i)/q_(7-i).
```

This is nondecreasing in `i`: every adjacent comparison is exactly a
log-concavity minor of `q`.  The new endpoint `i=8` only strengthens the
order.  Hence `X | X+Y=8` dominates `X | X+Y=7` in monotone likelihood-ratio
order.  The symmetric statement holds for `Y`.

For completeness, monotone-likelihood-ratio order implies the needed
expectation order by the elementary covariance identity

```text
2 Cov(f,L)=sum_(i,j) pi_i pi_j (f_i-f_j)(L_i-L_j).
```

It is nonpositive when `f` is decreasing and the likelihood ratio `L` is
increasing.

Now put

```text
F_i=A_i+i*h,    G_j=B_j+j*h.
```

Both are nonincreasing on indices zero through eight, because

```text
F_i-F_(i+1)=A_i-A_(i+1)-h >= 0,
```

and likewise for `G`.  The factorial convolution identity gives

```text
c_(z+1)/c_z+h*z
  = E[F_X+G_Y | X+Y=z].
```

The two conditional MLR comparisons therefore imply

```text
c8/c7+7h >= c9/c8+8h,
```

or `c8/c7-c9/c8>=h`.  Multiplying by the positive `c7*c8` gives the claimed
margin.

Only indices at most eight occur in the two conditional laws, so no
unstated terminal gap is required.  Zero terminal ratios follow by the same
argument after deleting the zero tail, or by continuity.

## Exact replay

`verify_rank8_high_high_mlr_convolution.py` checks the two projection
identities, the margin conversion, every local MLR minor index, every
factor-log-concavity reduction, and the exact adjusted-ratio gaps.  It also
performs 2,048 deterministic rational replays as a diagnostic; the proof is
the symbolic and order-theoretic argument above, not the sample.

This theorem closes high/high only.  The low/high and low/low cones retain
their coupled rank-one/rank-two exceptional gaps and remain separate.
