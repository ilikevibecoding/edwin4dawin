# Rank-6 reserve at every leaf of order 25

Date: 2026-07-28

Status: **proved theorem**. This closes the last rooted geometry at
order 25.

## Theorem

Let \(T\) be a tree of order \(25\), rooted at any leaf \(p\). Then

\[
\boxed{
S_6(T,p)=
i_4(T)(2i_5(T)+i_4(T))
-24\!\left(i_5(T)i_4(T-p)-i_4(T)i_5(T-p)\right)
>0.
}
\]

Hence the exact rank-6 rooted-cross reserve is nonnegative at every
leaf.

## Integral excess-degree moments

Put \(x_v=d(v)-1\). For a 25-vertex tree,

\[
\sum_v x_v=23.
\]

The earlier order-26 proof relaxed the second and third moments of
these positive integral weights over continuous boxes. That relaxation
is slightly too broad at order 25. Here the complete integer partition
is retained instead.

Let \(q\) be the support of the rooted leaf and put

\[
t=d_T(q)-1.
\]

The remaining positive weights form an integer partition of \(23-t\).
There are only:

- \(1002\) partitions when \(t=1\);
- \(3506\) pairs \((t,\lambda)\) for \(2\le t\le23\).

## Exact bounds retained for each partition

For positive weights \(w_1,\ldots,w_j\), the positive-excess support
is a forest and therefore bipartite. If its bipartition has weight
s\) on one side, its weighted edge correlation is at most

\[
s(23-s).
\]

The verifier takes the maximum over the exact subset sums of the
partition, rather than replacing this by \(23^2/4\).

It also retains the exact moments

\[
\sum w_i^2,\qquad \sum w_i^3.
\]

Let \(L\) be the upper bound on the number of connected four-edge
subtrees lost with the rooted leaf edge, in the normalized local
expansion.

For \(t=1\), with far weights \(\lambda_i\),

\[
L=\frac12\sum_i\lambda_i^2+22.
\]

For \(t\ge2\),

\[
L=\binom t3+
\frac12\sum_i\lambda_i^2+
(t-1)(23-t).
\]

After deleting the rooted leaf, the surviving 24-vertex tree has at
least \(20\) connected four-edge subtrees. It also contains every
four-edge star centered at a retained vertex, so the verifier uses

\[
V_{\rm survive}\ge
\max\!\left(
20,\,
\binom t4+\sum_i\binom{\lambda_i+1}{4}
\right),
\]

with the support-star term omitted when \(t=1\).

## Exact finite certificates

Substitution into the exact normalized motif identity produces:

- an 18-term integral polynomial for \(t=1\);
- a 30-term integral polynomial for \(t\ge2\).

No floating-point comparison is used. Exhausting the integer
partitions gives

\[
\min_{t=1}S_6^{\rm lower}=64\,742\,359,
\]

attained at the partition \(1+\cdots+1\) of \(22\), and

\[
\min_{t\ge2}S_6^{\rm lower}=22\,712\,391,
\]

attained at \(t=5\) with eighteen remaining unit weights.

Both lower bounds are strictly positive, proving the theorem.

## Replay

```powershell
python .\verify_rank6_all_leaf_roots_n25.py
```
