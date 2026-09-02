# Erdős Problem 993 literature-status refresh

Date checked: 2026-08-20

Status: **no prior complete proof and no finite non-unimodal tree or forest was
located; the public problem remains open.**

## Authoritative current-status check

The live Erdős Problems entry still labels #993 `FALSIFIABLE Open`.  Its public
discussion reports computational verification through order 29 and explicitly
does not claim a full solution:

```text
https://www.erdosproblems.com/993
https://www.erdosproblems.com/forum/thread/993?order=oldest
```

The associated March 2026 manuscript record likewise says that the universal
tree conjecture remains open, despite exhaustive verification through order 29
and several structural reductions:

```text
https://zenodo.org/records/19100781
https://github.com/BrettRey/erdos-problem-993
```

## Direct literature checked

The following primary papers and preprints are relevant but do not resolve the
universal conjecture:

1. Alavi--Malde--Schwenk--Erdős, *The vertex independence sequence of a
   graph is not constrained*, Congressus Numerantium 58 (1987), 15--23.  This
   is the source of the tree/forest question and the general-graph obstruction.

2. Basit--Galvin, *On the Independent Set Sequence of a Tree*, EJC 28(3)
   (2021), P3.23, DOI `10.37236/9896`.  This proves long initial and terminal
   monotone portions for asymptotically almost every labelled tree, not the
   universal statement:

   ```text
   https://www.combinatorics.org/ojs/index.php/eljc/article/view/v28i3p23
   ```

3. Yosef--Mizrachi--Kadrawi, *On Unimodality of Independence Polynomials of
   Trees*, arXiv:2101.06744.  This supplies finite computational support, not
   an all-order proof:

   ```text
   https://arxiv.org/abs/2101.06744
   ```

4. Kadrawi--Levit, *The independence polynomial of trees is not always
   log-concave starting from order 26*, arXiv:2305.01784.  Its examples refute
   the stronger log-concavity conjecture; they do not refute unimodality:

   ```text
   https://arxiv.org/abs/2305.01784
   ```

5. Ramos--Sun, *An AI enhanced approach to the tree unimodality conjecture*,
   arXiv:2510.18826.  It finds many additional failures of log-concavity, not a
   failure of unimodality:

   ```text
   https://arxiv.org/abs/2510.18826
   ```

6. Li, *Unimodality of independence polynomials of two family of trees*,
   arXiv:2603.03025.  It proves unimodality only for two known non-log-concave
   infinite families:

   ```text
   https://arxiv.org/abs/2603.03025
   ```

7. Hibi--Kara--Vien, *Symmetric and unimodal independence polynomials of
   trees*, arXiv:2604.18824.  It is an existence/classification result for
   symmetric unimodal examples, not a universal theorem:

   ```text
   https://arxiv.org/abs/2604.18824
   ```

8. Bautista-Ramos--Guillén-Galván--Gómez-Salgado, *Linear Recurrences for
   Non-Log-Concave Independence Polynomials of Trees*, Graphs and
   Combinatorics 42 (2026), article 59.  It constructs further failures of
   log-concavity, including consecutive failures, but does not give a
   non-unimodal tree:

   ```text
   https://link.springer.com/article/10.1007/s00373-026-03054-4
   ```

## Fresh search scope

Fresh searches on 2026-08-20 covered exact and close variants of
`Erdos Problem 993`, `tree independence polynomial unimodality`,
`independent set sequence forest unimodal`, and July/August 2026 arXiv
combinatorics results.  No newer primary source claiming a universal proof or
a finite tree/forest counterexample was found.  The August search results on
tree polynomials concerned other generating polynomials, not this conjecture.

This is a targeted literature audit, not a proof of absence.  It should be
rerun immediately before any public claim of resolution.  Current local
certificates therefore represent a new in-progress proof route and must not be
described as confirmation of a known theorem.
