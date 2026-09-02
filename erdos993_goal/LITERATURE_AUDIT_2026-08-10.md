# Literature audit for Erdős Problem #993

Audit date: 2026-08-12 (America/New_York; refreshed from the 2026-08-10 audit)

Target statement: the independent-set sequence of every tree or forest is
unimodal (Alavi--Malde--Schwenk--Erdős, 1987).

## Current public status

- The Erdős Problems entry still labels #993 `FALSIFIABLE Open`.  Its page
  was last edited 2026-02-01 and its discussion contains no incorporated
  proof or counterexample:
  https://www.erdosproblems.com/993
- The active public repository of Reynolds explicitly says, under
  "Current public targets, August 2026", that it does not contain a proof
  of #993 and that its remaining targets are partial routes rather than a
  general-tree reduction:
  https://github.com/BrettRey/erdos-problem-993

## Recent directly relevant literature

- Li, *Unimodality of independence polynomials of two family of trees*,
  arXiv:2603.03025 (submitted 2026-03-03), proves unimodality for the two
  Kadrawi--Levit infinite families, not for all trees:
  https://arxiv.org/abs/2603.03025
- Hibi, Kara, Vien, *Symmetric and unimodal independence polynomials of
  trees*, arXiv:2604.18824 (submitted 2026-04-20), studies which degrees and
  orders admit symmetric unimodal tree independence polynomials; its
  abstract does not claim the universal conjecture:
  https://arxiv.org/abs/2604.18824
- Heilman, *Independent Sets of Random Trees* (2026 manuscript), explicitly
  records the deterministic tree/forest question as open and proves partial
  initial-segment unimodality with high probability for random trees, not a
  universal theorem:
  https://www.stevenheilman.org/~heilman/papers/unimodalityC.pdf
- *Linear Recurrences for Non-Log-Concave Independence Polynomials of
  Trees*, Graphs and Combinatorics (published 2026-06-22), develops
  recurrences and new families with log-concavity violations.  It treats
  the weaker universal unimodality statement as a conjecture, not a solved
  theorem:
  https://link.springer.com/article/10.1007/s00373-026-03054-4

## Current finite verification claims

- Reynolds' public repository reports exhaustive verification of the tree
  case through 29 vertices (including 5,469,566,585 trees at order 29) and
  no non-unimodal tree.  This is public computational evidence rather than
  an all-order proof:
  https://github.com/BrettRey/erdos-problem-993
- A SciNet research object posted in early August 2026 claims an exact
  exhaustive forest census through 30 total vertices and, using classical
  strong-unimodality closure, a theorem that any forest counterexample must
  contain a tree component of order at least 31.  The object itself says the
  conjecture remains open.  Because this is a very recent web research
  object rather than an established peer-reviewed source, its code and
  classical-dependency chain should be independently replayed before citing
  the numerical bound as certified:
  https://api.scinet.pub/f/25b8f9a4-efab-4707-9b77-18d3702ecbb3

## Conclusion

The 2026-08-12 refresh again found no universal proof and no finite
counterexample.  The Erdős Problems discussion still reports no incorporated
partial or complete solution, and the March--August 2026 papers and research
objects found in the refresh continue to describe the conjecture as open.
The strongest new public items are special-family theorems, partial random
tree results, and finite/exhaustive computations.  Therefore #993 remains
an appropriate open target as of 2026-08-12.

This audit cannot exclude an uncatalogued manuscript or private result.  A
completed proof from this workspace must still receive an independent
literature search and expert mathematical review before any novelty claim.
