# Final-route literature audit and normalized Schur lift for Erdos Problem 993

Date: 2026-08-13 (America/New_York)

Status: current-status/literature audit, exact reduction, and bounded exact
evidence.  This is **not** a proof of Erdos Problem 993 and not a forest
counterexample.  The master file was not edited.

## 1. Verdict

Erdos Problem 993 remains publicly open as of this audit.  I found no
universal proof and no finite counterexample.  The current primary literature
contains special-family theorems, exact recurrences producing failures of
log-concavity, probabilistic/finite evidence, and new positivity languages;
none proves the component-separated pendant cascade (PGC).

The most promising genuinely different import is the 2025
chromatic-symmetric-function method of Li--Li--Yang--Zhang.  It gives an exact
Schur interpretation of each log-concavity minor and an exact symmetric-
function deletion recurrence.  Applied to PGC, it yields the normalized
cross-rank Schur decomposition in Section 4 below.  The published theorem
controls same-polynomial minors, however, not the required normalized
cross-rank difference between a pendant forest and its two-vertex deletion.
Its deletion recurrence also contains an explicit error term with no general
2-Schur-positive sign.  Thus this route sharpens the missing forest-specific
statement but does not close it.

## 2. Public-status evidence, distinguished from proof

These are status/discovery sources, not mathematical proof that an
uncatalogued result cannot exist.

1. The Erdos Problems page still marks #993 **FALSIFIABLE Open**, reports no
   claimed partial or complete solution in its comments, and says it was last
   edited 2026-02-01:
   https://www.erdosproblems.com/993
2. The current public Reynolds repository says both that the tree case remains
   open and, under "Current public targets, August 2026", that the repository
   does not contain a proof.  Its stated routes all retain open steps:
   https://github.com/BrettRey/erdos-problem-993
3. For a date-stamped discovery check, the arXiv API feeds returned an update
   time of `2026-08-13T11:23:10Z` for the exact phrase `independence
   polynomial` and `2026-08-13T11:23:39Z` for `independent set sequence`.
   The relevant 2025--2026 records are audited below.  API query:
   https://export.arxiv.org/api/query?search_query=all:%22independence%20polynomial%22&start=0&max_results=100&sortBy=submittedDate&sortOrder=descending

This search cannot exclude a private manuscript, an unindexed preprint, or a
paper using unrelated terminology.  It supports only the stated public-status
verdict.

## 3. Primary-source audit

### Directly relevant 2025--2026 results

* Grace M. X. Li, *Unimodality of independence polynomials of two family of
  trees*, arXiv:2603.03025v1 (2026), Theorems 1.4--1.5.  It proves
  unimodality for `T_(3,m,n)` and `T*_(3,m,n)` for all `m,n>=1`, and continues
  to state the universal forest claim as Conjecture 1.1.  It does not cover
  arbitrary rooted components in (CS-PGC):
  https://arxiv.org/abs/2603.03025
* C. Bautista-Ramos, C. Guillen-Galvan, and P. Gomez-Salgado, *Linear
  recurrences for non-log-concave independence polynomials of trees*,
  arXiv:2603.14204v1 (2026), published in *Graphs and Combinatorics*, DOI
  10.1007/s00373-026-03054-4.  It gives pattern-graph recurrences and families
  with one through several consecutive log-concavity breaks.  Its recurrence
  (3) is family-specific and does not imply PGC:
  https://arxiv.org/abs/2603.14204
* T. Hibi, S. Kara, and D. Vien, *Symmetric and unimodal independence
  polynomials of trees*, arXiv:2604.18824v1 (2026), Theorem 0.1.  This is an
  existence/classification construction by order and degree, not a theorem
  for all trees:
  https://arxiv.org/abs/2604.18824
* E. Y. H. Li, G. M. X. Li, A. L. B. Yang, and Z.-X. Zhang, *A symmetric
  function approach to log-concavity of independence polynomials*,
  arXiv:2501.04245v1 (2025).  Theorem 1.3 identifies log-concavity with
  2-Schur-positivity; Theorem 3.1 proves all spiders strongly log-concave;
  Proposition 3.3 is the exact deletion recurrence with an extra clan-graph
  error term; the following remark explicitly warns that the two deletion
  rows do not directly give the parent sign:
  https://arxiv.org/abs/2501.04245
* A. Bendjeddou and L. Hardiman, *Lorentzian polynomials and the independence
  sequences of graphs*, *Bull. London Math. Soc.* 57 (2025), 1305--1323, DOI
  10.1112/blms.70031.  It proves log-concavity for graphs in the image of the
  specific edge-replacement operator `R_(W4)`, not arbitrary trees or the
  rooted product (RP):
  https://arxiv.org/abs/2405.00511
* E. Ramos and S. Sun, *An AI enhanced approach to the tree unimodality
  conjecture*, arXiv:2510.18826v2 (2025).  It produces many tree failures of
  log-concavity through order 101, all reported unimodal; it supplies search
  evidence, not an all-tree theorem:
  https://arxiv.org/abs/2510.18826

### Claw-free route

Chudnovsky--Seymour prove that every claw-free graph has a real-rooted
independence polynomial: M. Chudnovsky and P. Seymour, *The roots of the
independence polynomial of a clawfree graph*, JCTB 97 (2007), 350--357, DOI
10.1016/j.jctb.2006.06.001:
https://www.ias.edu/sites/default/files/math/csdm/03-04/mchudnovsky_the_roots_of_the_stable_set.pdf

This cannot be turned into a universal exact polynomial-preserving
transformation of trees to claw-free graphs.  The tree `K_(1,3)` has

```text
I(K_(1,3);x)=1+4x+3x^2+x^3,
disc(I)=-31,
```

so it is not real-rooted.  Any claw-free graph with exactly this polynomial
would contradict the Chudnovsky--Seymour theorem.  This no-go concerns exact
polynomial preservation only; it does not exclude transformations involving
extra factors or a new coefficient comparison.

## 4. Different attack: a normalized two-row Schur lift of PGC

For a positive row `r=(r_j)`, write

```text
Delta_k(r)=r_k^2-r_(k-1)r_(k+1),
G_k(r)=k r_k^2+r_(k-1)r_k-(k+1)r_(k-1)r_(k+1),
H_k(r)=k G_k(r)/r_(k-1).
```

Direct algebra gives the exact identity

```text
G_k(r)=k Delta_k(r)+r_(k-1)(r_k-r_(k+1)),
H_k(r)=k^2 Delta_k(r)/r_(k-1)+k(r_k-r_(k+1)).       (4.1)
```

By Li--Li--Yang--Zhang, `Delta_k(r)` is precisely the two-row Schur
coefficient `[s_(k,k)] product_i R(x_i)` for `R(x)=sum r_j x^j`.

For the exact component-separated pendant form

```text
B=I(F), C=I(F-S), P=(1+x)B+xC,
```

PGC is therefore equivalent to

```text
 [ k^2 Delta_k(P)/p_(k-1)
   -(k-1)^2 Delta_(k-1)(B)/b_(k-2) ]
+[ k(p_k-p_(k+1))
   -(k-1)(b_(k-1)-b_k) ] >= 0.                       (4.2)
```

The first bracket is a normalized cross-rank two-row Schur margin.  The
second is a first-difference transport margin.  This is not one of the
abstract PF/interlacing lifts ruled out in Section 109: it exposes exactly
which 2-Schur mass must move between the component-separated deletion rows.

### What the theorem supplies, and the exact remaining gap

The 2025 theorem says that `Delta_j(R)>=0` for every `j` iff `Y_R` is
2-Schur-positive.  It does **not** compare

```text
k^2 Delta_k(P)/p_(k-1)
```

with the different-rank, different-polynomial quantity for `B`.  Moreover,
its Proposition 3.3 writes `Y_G` as the two deletion terms plus a sum over
clan graphs whose color multiplicities simultaneously meet the deleted
vertex and a neighbor.  The paper explicitly notes that this error term
prevents the child signs from directly implying the parent sign.  In the PGC
normal form, controlling that error is again the literal rooted-component
coupling, not a consequence of 2-Schur positivity alone.

The existing nested PF no-go makes the limitation exact.  For

```text
P=(1,354,3141,4199,1376), B=(1,352,2756,1376), k=2,
```

the two brackets of (4.2) are respectively

```text
-1561442/59,  288,
```

and their sum is `-1544450/59`.  Those rows satisfy the stronger nested PF
algebra from the component-separated no-go but are not forest-realizable.
Thus abstract 2-Schur/PF information cannot prove (4.2).

### New finite evidence, not a theorem

The exact replay enumerates every unlabeled tree of orders 2 through 16,
every pendant leaf with multiplicity, and every required prefix rank.  Across
32,507 trees and 1,103,823 rank checks it found no negative normalized Schur
cross-rank bracket.  Its exact minimum was `34/5`, at order 5.  The
first-difference bracket is not separately nonnegative: for the order-14
star at rank 4 it is `-1463`, while the normalized Schur bracket is `5863`
and the PGC sum is `4400`.

This suggests a concrete new target:

> Prove the normalized Schur bracket in (4.2) has enough component-labelled
> surplus to pay the negative part of the first-difference bracket.

The scan is bounded evidence only.  It is not an all-order proof, and the
target still requires a new forest-specific injection or deletion-fibre
decomposition.

## 5. Relation to the audited master chain

Nothing found changes the dependency verdict in master Section 109.

* PGC remains the shortest sufficient theorem.
* The 2025 Schur language does not supply the protected/Lambda/nested/mixed
  bridge or an all-order substitute.
* Special-family, Lorentzian edge-replacement, rooted-product, and claw-free
  theorems do not cover arbitrary component-separated rooted products.
* No route in this audit materially closes the conjecture.

## 6. Exact replay

Run:

```text
python replay_final_route_literature_schur_lift.py --max-order 16
```

It verifies (4.1) symbolically, the claw discriminant, the exact nested-PF
bracket decomposition, and the bounded tree-pendant audit.  It writes
`final_route_literature_schur_lift_exact_20260813.json` and prints
`PASS_EXACT_NOT_PROOF`.

Full SHA-256 hashes are recorded in
`final_route_literature_schur_lift_sha256_20260813.txt`.
