# Rank-6 reserve at every leaf of order 24

Date: 2026-07-28

Status: **proved theorem**.

## Theorem

Let \(T\) be a tree of order \(24\), rooted at any leaf \(p\). Then

\[
\boxed{
S_6(T,p)=
i_4(T)(2i_5(T)+i_4(T))
-24\!\left(i_5(T)i_4(T-p)-i_4(T)i_5(T-p)\right)
>0.
}
\]

Thus the exact rank-6 rooted-cross reserve is positive at every leaf
of every 24-vertex tree.

## The weighted-tree lemma

Give the vertices of a tree positive weights
\(w_1,\ldots,w_j\), with total \(W\) and maximum \(M\). Then

\[
\sum_{uv\in E}w_uw_v\le M(W-M).
\]

Indeed, root the weighted tree at a vertex \(r\) of weight \(M\).
Every nonroot vertex \(v\) contributes exactly one parent edge, whose
weight is at most \(w_vM\). Summing over all \(v\ne r\) gives
\(M(W-M)\). Equality is attained by the star centered at \(r\).

For a tree \(T\), put \(x_v=d_T(v)-1\) and discard vertices with
\(x_v=0\). The remaining induced graph is connected: every internal
vertex on the path between two vertices of degree at least two also
has degree at least two. It is therefore a tree, so the lemma applies
to the exact degree-excess edge correlation.

## Integral excess-degree certificate

For a 24-vertex tree,

\[
\sum_v x_v=22.
\]

If \(q\) supports the rooted leaf, write
\(t=d_T(q)-1\). The other positive excesses form an integer partition
of \(22-t\). The verifier retains, for every such partition, the exact
values

\[
\sum x_v^2,\qquad
\sum x_v^3,\qquad
M(22-M).
\]

When \(t=1\), the connected-four loss bound is

\[
L=\frac12\sum_{\text{far }v}x_v^2+21.
\]

When \(t\ge2\), it is

\[
L=\binom t3+
\frac12\sum_{\text{far }v}x_v^2+
(t-1)(22-t).
\]

After deletion of the rooted leaf, the surviving tree has order \(23\)
and hence at least \(19\) connected four-edge subtrees. Retained
four-edge stars give the additional exact lower bound

\[
V_{\rm survive}\ge
\max\!\left(
19,\,
\mathbf 1_{t\ge2}\binom t4+
\sum_{\text{far }v}\binom{x_v+1}{4}
\right).
\]

Substitution in the exact normalized motif identity produces an
18-term integer polynomial for \(t=1\) and a 30-term integer
polynomial for \(t\ge2\). The verifier derives both symbolically and
evaluates them using rational arithmetic.

## Finite exact minima

There are \(792\) partitions in the \(t=1\) case. Their minimum is

\[
65\,472\,928>0,
\]

attained when the far excesses are \(4,1,\ldots,1\).

There are \(2714\) support/partition pairs with \(t\ge2\). Their
minimum is

\[
8\,404\,050>0,
\]

attained at \(t=7\) with fifteen remaining unit excesses. These strict
positive minima prove the theorem.

## Replay

```powershell
python .\verify_rank6_all_leaf_roots_n24.py
```
