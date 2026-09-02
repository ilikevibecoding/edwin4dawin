# A matching-block reduction for Erdős Problem 993

This note gives a rank-preserving normal form for the independent sets of
a forest.  It is a rigorous reduction, not a proof of unimodality.

## 1. A maximum matching with only leaf defects

Let \(F\) be a forest with no isolated component temporarily, and let
\(\nu=\nu(F)\) be its matching number.

**Lemma 1.** There is a maximum matching \(Q\) such that every
\(Q\)-unmatched vertex is a leaf.

**Proof.** Start with any maximum matching.  Suppose that an unmatched
vertex \(v_0\) is not a leaf.  Choose a neighbor \(u_1\).  The vertex
\(u_1\) must be matched, or \(v_0u_1\) augments the matching; write its
matching edge as \(u_1v_1\).

If \(v_1\) is not a leaf, choose a neighbor \(u_2\ne u_1\).  The vertex
\(u_2\) must again be matched: otherwise

\[
v_0,u_1,v_1,u_2
\]

is an augmenting path.  Continue in this way.  Because \(F\) is acyclic,
the walk never repeats a vertex, and because \(F\) is finite it ends at a
leaf \(v_t\).  The resulting path

\[
v_0u_1v_1u_2v_2\cdots u_tv_t
\]

has even length; its edges alternate between absent and present matching
edges, beginning with an absent edge and ending with a present edge.
Flipping the path preserves the cardinality of the matching, matches
\(v_0\), and leaves only the leaf \(v_t\) unmatched.  Repeating removes
all unmatched nonleaves. \(\square\)

An isolated vertex is regarded separately as an unmatched singleton.

## 2. Matched edges become two-color blocks

Since a forest is bipartite, König's theorem gives a minimum vertex cover
\(C\) with

\[
|C|=\nu.
\]

Every edge of the maximum matching \(Q\) meets \(C\).  The matching edges
are disjoint and there are exactly \(|C|\) of them, so every matching edge
contains exactly one vertex of \(C\), every vertex of \(C\) lies on a
matching edge, and no unmatched vertex lies in \(C\).

Set

\[
M=V(F)\setminus C.
\]

Then \(M\) is a maximum independent set and

\[
|M|=\alpha(F)=|V(F)|-\nu.
\]

Partition \(V(F)\) into:

- one two-vertex block for every edge of \(Q\), with colors \(C\) and
  \(M\);
- one singleton \(M\)-color block for every unmatched vertex.

Contract every matching edge.  The resulting graph \(H\) is again a
forest, now on

\[
|V(H)|=|V(F)|-\nu=\alpha(F)
\]

blocks.  A remaining edge of \(F\) joins two blocks and forbids exactly
one pair of occupied colors.  There cannot be two remaining edges between
the same two blocks, since those edges together with the contracted
matching edges would create a cycle in \(F\).

Thus independent sets of \(F\) are in rank-preserving bijection with
partial colorings of \(H\) in which:

1. a block is empty or receives one of its one or two colors;
2. each edge forbids its single labelled color pair;
3. rank is the number of occupied blocks.

This bijection immediately explains the constant \(2\) in the known tail
argument: a rank-\(k\) configuration has \(\alpha-k\) empty blocks and at
most two available colors per block.  Hence its number of one-vertex
extensions is at most

\[
2(\alpha-k).
\]

Double-counting extensions gives

\[
(k+1)i_{k+1}(F)\le 2(\alpha-k)i_k(F),
\]

and therefore the coefficients decrease once
\(k\ge\lceil(2\alpha-1)/3\rceil\).

## 3. All singleton blocks can be made pendant

Use the matching \(Q\) from Lemma 1.  Every nonisolated unmatched vertex
is a leaf of \(F\), so every nonisolated singleton block is a leaf of
\(H\).  The number of singleton blocks is exactly

\[
u=|V(F)|-2\nu=2\alpha(F)-|V(F)|.
\]

Remove these singleton blocks from \(H\), leaving a (possibly
disconnected) core \(K\) on the \(\nu\) two-color blocks.  For a core
block \(v\), let \(r_v\) be its number of pendant singleton blocks.
Every such singleton belongs to \(M\), and its neighbor belongs to the
\(C\)-colored endpoint of \(v\), because \(M\) is independent.

For a valid partial coloring \(\sigma\) of \(K\), write:

- \(|\sigma|\) for the number of occupied core blocks;
- \(R_C(\sigma)=\sum_{\sigma(v)=C}r_v\).

If \(v\) is empty or has color \(M\), all its \(r_v\) singleton leaves
are independently optional.  If \(v\) has color \(C\), all of them are
forced empty.  Consequently the independence polynomial has the exact
binomial-mixture form

\[
\boxed{
I(F;x)=
\sum_{\substack{\sigma\text{ valid}\\\text{on }K}}
x^{|\sigma|}(1+x)^{u-R_C(\sigma)}.
}
\tag{MB}
\]

Isolated singleton blocks simply contribute to the exponent \(u\) and
are never subtracted by \(R_C\).

Formula (MB) reduces the full conjecture to a structured binomial mixture
on a forest of only \(\nu=|V(F)|-\alpha(F)\) two-color blocks.  In the
leaf-heavy regime \(\alpha>|V(F)|/2\), the exact amount of binomial
smoothing is \(u=2\alpha-|V(F)|\).  What remains is to prove that the
edge-labelled core mixture cannot acquire a descent followed by a later
ascent, or to use it to construct a counterexample.

There is a complementary refinement in
`BIPARTITION_ORIENTED_BLOCK_REDUCTION_2026-07-24.md`.  Coloring endpoints
by the two global bipartition classes orients every contracted edge and
makes its forbidden pair uniformly
\((X\text{ at tail},Y\text{ at head})\).  The present cover/complement
coloring is better for making the unmatched-leaf penalty one-sided; the
oriented coloring is better for retaining the consistency among all core
edge labels.

## 4. Independent verification

`C:\Users\chris\erdos993_goal\verify_matching_block_reduction.py`

constructs the matching, cover, labelled core, and the right side of
(MB), then compares it coefficient-by-coefficient with an unrelated
tree-DP computation of \(I(F;x)\).  It also checks the block count,
pendant-singleton property, and extension tail bound.
