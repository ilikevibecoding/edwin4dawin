# Erdős Problem 993 public-status refresh — 2026-08-20

Status: **LITERATURE/PUBLIC-RECORD AUDIT, NOT A PROOF CLAIM.**

The public record still lists the Alavi--Malde--Schwenk--Erdős tree/forest
independence-sequence unimodality conjecture as open.  The search was refreshed
on 2026-08-20 against the problem catalogue, the current deposited manuscript,
the newest directly relevant arXiv result found, and the recent computational
records described below.

## Sources checked

1. T. F. Bloom, [Erdős Problem 993](https://www.erdosproblems.com/993) and its
   [discussion thread](https://www.erdosproblems.com/forum/thread/993?embed=1).
   The catalogue labels the problem `Open`/`Falsifiable`, records no claimed
   complete or partial solution in the comments, and says the page was last
   edited 2026-02-01.  Later comments report computations, not a proof.

2. B. Reynolds,
   [*Mean bounds, structural reductions, and exhaustive verification for tree
   independence polynomial unimodality*](https://doi.org/10.5281/zenodo.19100781),
   Zenodo v3, updated 2026-03-18.  Its deposited description reports exact
   verification of all 8,691,747,673 trees through order 29 and explicitly says
   the conjecture remains open.

3. T. Hibi, S. Kara, and D. Vien,
   [*Symmetric and unimodal independence polynomials of
   trees*](https://arxiv.org/abs/2604.18824), 2026-04-20.  This proves existence
   and classification results for symmetric/unimodal tree independence
   polynomials; its abstract does not claim unimodality for every tree.

4. The recent SciNet records report an exact tree verification through order 30
   and an exact all-forest verification through order 30, together with a
   closure result for forests whose components all have order at most 30:
   [forest finding 25b8f9a4](https://api.scinet.pub/f/25b8f9a4-efab-4707-9b77-18d3702ecbb3).
   That record explicitly says the conjecture remains open because it does not
   decide trees of order at least 31.  This is useful computational progress,
   not a substitute for an all-order theorem.

5. The 2026-07 formal-proof fidelity page for problem 993 records no hosted
   machine-audited proof and no signed statement-fidelity verdict:
   [fidelity finding](https://erdos.constellate.science/finding.html?n=993).
   Absence of a hosted formal proof is not itself evidence that no informal
   proof exists, so this is only a corroborating status check.

## Conclusion

No source found in this refresh claims or supplies a complete proof or a
verified counterexample to Problem 993.  The strongest new public finite record
found is through order 30 (trees and forests), while the conjecture remains
listed open.  Therefore the present workspace must continue to label every
finite census, rank-local certificate, and conditional lift by its exact scope;
none may be presented as a resolution until the all-rank dependency chain is
closed.
