# Rank-eight full/full split-variance reduction

Date: 2026-08-20

Status: **exact identity and exact symbolic replay; not yet a full/full cone
theorem.**

## Identity

Let two positive factorially scaled rows be `a=(a_j)` and `b=(b_j)`, and put

```text
c_k = sum_j C(k,j) a_j b_(k-j).
```

For the rank-seven split distribution define

```text
Pr(J=j) = C(7,j) a_j b_(7-j) / c_7,
A_j     = a_(j+1)/a_j,
B_r     = b_(r+1)/b_r,
S_j     = A_j+B_(7-j),
deltaA_j=A_j-A_(j+1),
deltaB_r=B_r-B_(r+1).
```

The two derivative identities for the binomial convolution are

```text
c_8/c_7 = E[S],
c_9/c_7 = E[S^2-A_J deltaA_J-B_(7-J) deltaB_(7-J)].
```

Therefore, for the homogenizing constant `h`, exact algebra gives

```text
c_8^2-c_7 c_9-h c_7 c_8
 = c_7^2 ( E[P] - Var(S) ),

P = A_J(deltaA_J-h)
    +B_(7-J)(deltaB_(7-J)-h).                     (1)
```

The left side is precisely the factorially scaled rank-eight full/full
margin.  Thus each full/full cone is equivalent to the one-dimensional
conditional split inequality

```text
Var(S) <= E[P].                                   (2)
```

## Why this is useful

The rejected direct high/high expansion materialized 12,813,915 terms in
its first slice and peaked at 7.553 GiB.  Identity (1) instead has only eight
split states.  It exposes the exact missing assertion rather than treating
the memory failure as mathematical evidence.

For high/high factors, every factor gap satisfies `delta>=h`, so `P` is
termwise nonnegative.  Positivity is not automatic: the expected slack must
still dominate the variance of the conditional next-extension rate `S`.
For low/high and low/low factors, the exceptional `delta1<h` payment can be
signed; the coupled constraint `delta1+delta2>=2h` must therefore be retained
without separating those two ranks.

This form points to a discrete Brascamp--Lieb/Poincare or allocation-coupling
proof.  Standard preservation of ordinary or ultra log-concavity is not, by
itself, the additive curvature statement (2), so no literature theorem is
silently promoted here.

## Exact replay

`verify_rank8_full_full_split_variance_identity.py` performs a generic SymPy
reduction of both derivative identities and of (1), with all remainders
exactly zero.  It also checks 512 deterministic positive rational instances
using `Fraction` arithmetic.  Sample signs are recorded only as diagnostics;
the symbolic identity is the theorem.

This reduction does not prove high/high, low/high, low/low, connected `Q8`,
forest `Q8`, PGC, or Problem 993.
