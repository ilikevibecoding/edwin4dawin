# Complete all-rank full-factor convolution theorem

Date: 2026-08-28

## Theorem

Fix an integer `k>=8` and `h>=0`.  Let `a=(a_i)` and `b=(b_i)` be
positive rows through index `k+1`.  Write

```text
A_i=a_(i+1)/a_i,        B_i=b_(i+1)/b_i,
delta_i=A_i-A_(i+1),    epsilon_i=B_i-B_(i+1),
c_r=sum_(i=0)^r binom(r,i)a_i b_(r-i).
```

Assume that each row satisfies the complete full-factor gap conditions

```text
delta_0 >= 2h,
delta_1 >= 0,
delta_2 >= h,
delta_1+delta_2 >= 2h,
delta_i >= h                 (3<=i<k),
```

and likewise with `delta` replaced by `epsilon`.  Then

```text
c_k^2-c_(k-1)c_(k+1)-h c_(k-1)c_k >= 0.             (1)
```

Thus the complete abstract full-factor cone is closed under binomial
convolution, uniformly for every rank `k>=8`.

## Exhaustive proof

For either factor there are exactly two cases.

* If `delta_1>=h`, then every adjacent ratio gap is at least `h`; the
  factor is **high**.
* If `0<=delta_1<h`, then the coupled condition gives
  `delta_2>=2h-delta_1`; the factor is **low**.

The equality face `delta_1=h` may be assigned to the high sector.  Hence
the two sectors are exhaustive and leave no gap.  For an unordered pair of
factors there are exactly three possibilities:

```text
high/high,    low/high,    low/low.
```

The hash-pinned high/high theorem proves (1) in the first sector for every
`k>=1`.  The hash-pinned full low/high theorem proves it in the second
sector for every `k>=8`, symmetrically in the factors.  The independently
audited matched-pair theorem proves it in the third sector for every
`k>=8`.  These three cases exhaust the Cartesian square of the full-factor
cone, proving (1).

No coordinatewise-composition inference is used: each cited theorem allows
all of the other gap slacks in its sector simultaneously.  In particular,
the low/high theorem uses its integrated tail theorem, and the low/low
theorem pays both adverse `(1,2)` pairs with disjoint side-labelled
reserves.

## Scope

This theorem is an abstract closure theorem for positive coefficient rows.
It does **not** prove that every connected tree has the required rank-`k`
reserve, classify exceptional connected components uniformly in `k`, prove
the all-forest lift, prove the pendant cascade, or resolve Erdős Problem
#993.  Those are separate obligations.

## Replay

Run

```powershell
python .\assemble_uniform_complete_full_convolution_cone_root_20260828.py
```

The replay fails closed on every dependency hash and status, checks the
sector partition symbolically, and reconstructs exact examples from all
three sectors.  Its expected marker is

```text
PASS_HASH_PINNED_EXACT_ALL_RANK_COMPLETE_FULL_CONVOLUTION_CONE_ASSEMBLY
```
