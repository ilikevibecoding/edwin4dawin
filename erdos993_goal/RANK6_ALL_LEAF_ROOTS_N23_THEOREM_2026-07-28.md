# Rank-6 reserve at every leaf of order 23

Date: 2026-07-28

Status: **proved theorem**.

## Theorem

Every 23-vertex tree \(T\), rooted at any leaf \(p\), satisfies

\[
S_6(T,p)=
i_4(T)(2i_5(T)+i_4(T))
-24\!\left(i_5(T)i_4(T-p)-i_4(T)i_5(T-p)\right)
>0.
\]

## The degree-capacity edge lemma

Put \(x_v=d_T(v)-1\) and retain the vertices with \(x_v>0\). They
induce a tree. Root it at a maximum-weight vertex \(r\).

The root has at most \(x_r+1\) children. Every other vertex \(v\)
uses one incident edge for its parent and therefore has at most
\(x_v\) children. Form a multiset of parent slots:

- \(x_r+1\) slots of weight \(x_r\);
- \(x_v\) slots of weight \(x_v\) for each \(v\ne r\).

Every nonroot weight is assigned to one such slot by its parent edge.
If incidence and ancestry restrictions are discarded, the
rearrangement inequality pairs the sorted child weights with the
largest sorted slots. Hence this sorted dot product is a rigorous
upper bound for

\[
\sum_{uv\in E(T)}x_ux_v.
\]

This is substantially sharper than the unrestricted weighted-star
bound when a high-weight vertex does not have enough degree capacity
to meet every other core vertex.

## Exact partition certificate

For order \(23\),

\[
\sum_vx_v=21.
\]

If \(q\) supports the rooted leaf, put \(t=x_q\). The other positive
weights form an integer partition of \(21-t\). For each partition the
verifier retains:

- the exact second and third moments;
- the degree-capacity edge upper bound above;
- the exact local connected-four loss upper bound;
- the path and retained-star lower bounds for surviving connected
  four-edge subtrees.

It also checks symbolically, at every finite state, that the normalized
margin decreases with the substituted edge and loss bounds and
increases with the surviving-subtree bound. Thus every one-sided
substitution is certified in the replay.

There are 627 partitions when \(t=1\). Their minimum exact lower
margin is

\[
42\,104\,715>0,
\]

attained when all 21 positive excesses are one.

There are 2087 support/partition pairs when \(t\ge2\). Their minimum is

\[
1\,327\,662>0,
\]

attained at

\[
t=8,\qquad
(2,2,2,2,1,1,1,1,1)
\]

for the remaining positive excesses. These strict minima prove the
theorem.

## Replay

```powershell
python .\verify_rank6_all_leaf_roots_n23.py
```
