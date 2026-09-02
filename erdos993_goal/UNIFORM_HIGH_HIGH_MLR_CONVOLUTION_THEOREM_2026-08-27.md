# Uniform all-rank high/high factorial-convolution theorem

## Theorem

Let `k>=1`, `h>=0`, and let `a=(a_i)` and `b=(b_i)` be positive rows through
index `k+1`.  Put

```text
A_i=a_(i+1)/a_i,    B_i=b_(i+1)/b_i,
c_r=sum_(i=0)^r C(r,i)a_i b_(r-i).
```

Assume

```text
A_i-A_(i+1)>=h,    B_i-B_(i+1)>=h    (0<=i<k).
```

Then

```text
c_k^2-c_(k-1)c_(k+1)-h c_(k-1)c_k >= 0.             (1)
```

Thus the complete high/high factorial-convolution cone is closed uniformly
in rank.  The stronger first gap used in the forest high cone is unnecessary
for this theorem.

## Proof

Factorially de-scale the two rows:

```text
p_i=a_i/i!,    q_i=b_i/i!.
```

Their adjacent ratios are `A_i/(i+1)` and `B_i/(i+1)`, respectively.  They
are nonincreasing, so both finite rows are log-concave.

Let `X,Y` be independent with masses proportional to `p,q`.  Conditional on
`X+Y=z`, the mass at `X=i` is proportional to

```text
p_i q_(z-i) = C(z,i)a_i b_(z-i)/z!.
```

On the common support, the likelihood ratio for changing the conditioned
sum from `z` to `z+1` is proportional to

```text
q_(z+1-i)/q_(z-i).
```

This is nondecreasing in `i`; each adjacent cross-difference is exactly a
positive factor times the log-concavity minor

```text
q_j^2-q_(j-1)q_(j+1).
```

The new right endpoint only strengthens the order.  Therefore
`X | X+Y=z+1` dominates `X | X+Y=z` in monotone likelihood-ratio order.
Exchanging the two factors gives the same statement for `Y`.

Now define

```text
F_i=A_i+i h,    G_i=B_i+i h.
```

Both are nonincreasing because their adjacent drops are the assumed ratio
gaps minus `h`.  Monotone likelihood-ratio order implies expectation order
for decreasing functions.  A self-contained proof is the pairwise covariance
identity

```text
2 Cov(f,L)=sum_(i,j) pi_i pi_j (f_i-f_j)(L_i-L_j),
```

whose summands are nonpositive when `f` decreases and `L` increases.

The binomial-convolution projection identity is

```text
c_(z+1)/c_z = E[A_X+B_Y | X+Y=z].
```

Since `X+Y=z`, this becomes

```text
c_(z+1)/c_z+h z = E[F_X+G_Y | X+Y=z].               (2)
```

Apply both conditional MLR comparisons to (2), from `z=k-1` to `z=k`:

```text
c_k/c_(k-1)+h(k-1) >= c_(k+1)/c_k+h k.
```

Hence

```text
c_k/c_(k-1)-c_(k+1)/c_k >= h.
```

Clearing the positive denominator `c_(k-1)c_k` gives (1).  Rows with a zero
terminal tail follow by truncation or continuity.

## Exact replay and independent audit

The producer checks the projection and cross-multiplication identities with
independent symbolic rows through rank 12, verifies the generic indexed gap
forms, and performs 2,048 exact rational diagnostics across ranks 1 through
32.  The separately written auditor imports no producer code, reconstructs
the indexed MLR/covariance scheme, and performs 4,128 different exact grid
checks across ranks 1 through 12.  These finite checks audit the algebraic
scheme; the all-rank conclusion is the indexed proof above, not sampling.

```text
prove_uniform_high_high_mlr_convolution_root.py
818B2EFA16AEC2FA12A398697D3C1CC59E6EE057E73063238E1C62259E4867EB

uniform_high_high_mlr_convolution_exact_root_20260827.json
2B8AA7A6BDA968889C6700207C74FC9F41448C7FCEB389425C4B9938405315EA

audit_uniform_high_high_mlr_convolution_independent_root.py
153740ABFE8FA3FE9632F2BE5100A724EC73D561CB192E90CD378A426BCF46B3

uniform_high_high_mlr_convolution_independent_audit_root_20260827.json
42318EA4CB73DC4E60B6FA6837D9259DDEACFD5E230E0DC21601504C565BA509
```

Producer status:

```text
PASS_EXACT_ANALYTIC_ALL_RANK_HIGH_HIGH_CONVOLUTION_MARGIN
```

Independent-audit status:

```text
PASS_INDEPENDENT_EXACT_ANALYTIC_ALL_RANK_HIGH_HIGH_CONVOLUTION_MARGIN_AUDIT
```

## Scope

This theorem closes one infinite convolution cone.  It does not prove the
low/high or low/low cones, connected `Q_k`, the pendant cascade, independence-
sequence unimodality, or Erdős Problem 993.
