# Mixed-forest beam search through depth 64

Date: 2026-08-13

This is finite counterexample-search evidence.  It is not a proof of the
Alavi--Malde--Schwenk--Erdos conjecture.

`patternboost_mixed_forest_beam_search.py` screened 43,595 exact tree
independence polynomials, retained the 1,000 strongest pure-power factors,
and explored a width-400 beam of multisets through 64 factors.  It tested
24,972,350 distinct mixed products and found no nonunimodal forest.

The closest exact product occurs at depth 60.  It is a forest on 3,600
vertices with independence degree 1,860.  Its first descent is at index
1,067, it never rises afterward, and its largest subsequent adjacent ratio
is at index 1,068:

```text
0.997297692009605... < 1.
```

The search report is
`patternboost_mixed_forest_beam_1000x400d64_20260813.json`.  Its SHA-256 is
`E23EBF9A94BB0AB9691E943D911023F7BA7802F53943E1387465871B1990CFC4`;
the search source hash is
`AF993570DFF2B8C96A5F552A3066108A0FB88A26733E0203E1FCF3C611E80A21`.

An independent verifier reconstructs all 60 champion trees from their
Pruefer codes, recomputes each independence polynomial by rooted-tree
dynamic programming, multiplies them using exact integers, and recomputes
the descent and best post-descent ratio without importing the search's
profiling code.  It reports

```text
PASS_INDEPENDENT_EXACT_MIXED_FOREST_CHAMPION_VERIFICATION
```

in `patternboost_mixed_forest_beam_champion_verified_20260813.json`.
The verifier and verification-report hashes are respectively
`D95B0D4487F83ACED0C06994C8E5AA9313E5568067A7DB24DB8F39AA388A67D3`
and
`BA5DBC953BC9B494E40074945E74CE87A6D7F947B665B50AAC446298320738F2`.

