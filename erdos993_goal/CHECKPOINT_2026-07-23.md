# Erdős Problem 993 research checkpoint

Date: 2026-07-23  
Status: **open; no proof or counterexample claimed**

## Target

For a forest \(F\), let \(i_k(F)\) be the number of independent vertex sets
of size \(k\).  Alavi, Malde, Schwenk, and Erdős asked in 1987 whether

\[
  i_0(F),i_1(F),\ldots,i_{\alpha(F)}(F)
\]

is always unimodal.

The current Erdős Problems entry still lists Problem 993 as open:
<https://www.erdosproblems.com/993>.  The July 2026 public project and its
companion manuscript likewise state that the conjecture remains open:
<https://github.com/BrettRey/erdos-problem-993> and
<https://zenodo.org/records/19100781>.

## Literature and prior-computation audit

The public project was cloned at commit
`e04e0f7` (2026-07-22).  Its exact handoff self-test passed locally.
The strongest closed frontier found there is:

- all 8,691,747,673 unlabeled trees through order 29 were checked exactly;
- exactly two order-26 trees and 19 order-28 trees fail log-concavity, but
  all remain unimodal;
- known counterexample searches total roughly 1.4 million exact tree
  evaluations, with no valley;
- every known log-concavity defect is harmlessly deep in the decreasing
  tail, while the strongest genuine-descent near misses never recover.

Primary recent sources checked include the 2023 order-26 counterexamples
<https://arxiv.org/abs/2305.01784>, Galvin's asymptotic non-log-concavity
families <https://arxiv.org/abs/2502.10654>, and Li's 2026 unimodality
proofs for the two original non-log-concave families
<https://arxiv.org/abs/2603.03025>.

## New work in this checkpoint

### 1. High-branch hard-core phase constructions

Complete \(b\)-ary rooted trees and joins of opposite-height trees were
computed with exact integer coefficient arithmetic for branchings 2 through
8, at accessible orders up to about 3,000.  No non-unimodal sequence
occurred.  The apparent two-phase mechanism fails quantitatively: changing
the root condition moves the conditional mean by only \(O(1)\), while the
coefficient width grows like \(\sqrt n\).  Replicating the gadget either
fails to separate the peaks or exponentially suppresses one phase.

`phase_edge_search.py` records a more general decorated-central-edge family
and materializes an explicit edge list if an exact witness is ever found.

### 2. Irregular depth-two spine trees

`caterpillar_evolution.py` searches lobsters whose spine vertices carry both
leaves and length-two arms.  Floating point is used only to rank shapes.
The stored order-1,000 champion was recomputed with exact integers:

- 1,000 vertices and 999 edges;
- independence number 797;
- mode 414;
- no coefficient-ratio rebound after the first descent;
- no valley.

This rules out the numerical possibility that normalization error hid a
crossing in the strongest candidate.

### 3. Exact ratio-rebound evolution from known LC failures

`bouquet_ratio_evolution.py` begins with the order-26 log-concavity failures
and evolves spider-bouquet trees.  Unlike a flat-mode objective, it rewards
the actual missing mechanism: a coefficient ratio that rises after an
earlier post-mode ratio trough, migrates into the region before the universal
tail boundary, and approaches one.

The deterministic `seed=998` campaign evaluated 440,000+ distinct bouquet
specifications with exact integer coefficients.  It found no legal rebound
and no valley.  The best log-concavity bump remained exactly five ratio
ranks beyond the start of the proved decreasing-tail region; it never moved
closer.

## Exact replay

From `C:\Users\chris\erdos993_goal` run:

```powershell
python verify_checkpoint.py
```

The script reconstructs both stored champions, verifies tree size and edge
count for the order-1,000 lobster, recomputes every coefficient with Python
integers, and asserts that neither polynomial contains a descent followed by
a rise.  Expected final field:

```text
"certificate": "passed"
```

## Mathematical conclusion

These computations are negative evidence, not a resolution.  More
importantly, they eliminate three plausible disproof mechanisms:

1. balanced high-branch phase coexistence;
2. irregular one-dimensional depth-two reservoirs;
3. migration of the known log-concavity bump toward the mode inside the
   broad spider-bouquet grammar.

The credible proof target remains **prefix log-concavity**:

\[
 i_k(T)^2\ge i_{k-1}(T)i_{k+1}(T)
 \quad\text{for }k<\left\lceil\frac{2\alpha(T)-1}{3}\right\rceil.
\]

Together with the proved strict decrease from that boundary onward, this
would resolve Problem 993.  It is verified on the public exact frontier but
is not proved.  The equivalent extension-count variance inequality is

\[
 \operatorname{Var}(e)
 \le \frac{\mu^2}{k}+\mu+2\eta,
\]

for a uniform independent \((k-1)\)-set, where \(e\) is its number of
one-vertex extensions, \(\mu=\mathbb E e\), and \(\eta\) is the expected
number of residual edges.  This is now the narrowest theorem-strength
obligation; claiming more would overstate the result.
