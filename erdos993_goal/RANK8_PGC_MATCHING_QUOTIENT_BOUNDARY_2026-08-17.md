# Rank-eight coupled boundary via maximum-matching quotients

Date: 2026-08-17

Status: **exact all-forest theorem for the literal rank-eight coupled boundary
at `alpha(P)=13,14`.  The no-gap finite matrix and its independent replay both
pass.  This closes this boundary subproblem; it is not by itself a proof of
Erdos Problem 993.**

## 1. Literal target and finite range

For a forest `P=I(G)` with pendant edge `lp`, put

```text
B=I(G-{l,p}),                 P=(1+x)B+xC.
```

At rank eight the exact cleared target is

```text
8*b6*Q8(P)+24*c7*p7*b6+V8(B)*p7 >= 0,              (1)
Q8(P)=16*p8^2-p7*p8-18*p7*p9,
V8(B)=10*b6*b7+136*b6*b8-98*b7^2,
c7=p8-b7-b8.
```

Rank eight first enters the Problem-993 prefix at `alpha(P)=13`.  The proved
standalone `V8(B)` theorem applies directly only from `alpha(P)>=15`, so the
two literal coupled boundaries are `alpha(P)=13,14`.  Every forest is
bipartite, hence `alpha(P)>=ceil(|P|/2)`.  Therefore

```text
alpha(P)=13 => |P|<=26,
alpha(P)=14 => |P|<=28.                              (2)
```

The polynomial-complete census through order 18 is already exact.  It leaves
precisely the 18 cells

```text
(n,13), 19<=n<=26;       (n,14), 19<=n<=28.          (3)
```

## 2. Maximum-matching quotient

Let `a=alpha(P)` and `n=|P|`.  Since a forest is bipartite, Konig's theorem
gives

```text
nu(P)=n-a=:m.
```

Choose a maximum matching `M`.  Contract its `m` edges to **pair blocks** and
leave its

```text
d=n-2m=2a-n
```

unmatched vertices as **singleton blocks**.  Contracting edges in a forest
produces an acyclic quotient `Q`; it has `m+d=a` vertices.  It is still a
simple forest: two surviving edges between the same two blocks (including two
edges from a singleton to the endpoints of one pair block) would lift, with
the matching edge or edges inside the blocks, to a cycle in the original
forest.  The singleton blocks form an independent set `U` in `Q`, because an
edge between two unmatched vertices would augment `M` immediately.

Conversely, take any forest `Q` on `a` vertices and any independent `d`-set
`U`.  Replace every vertex outside `U` by a matching edge and retain every
vertex in `U` as a singleton.  Each quotient edge has exactly one endpoint
choice at each incident pair block (and no choice at a singleton).  These
incidence choices are independent, so they exhaust every graph contracting to
the fixed `(Q,U)`.  The expansion is a forest: a cycle would contract to a
cycle or parallel-edge cycle in `Q`.  It carries the distinguished matching
of size `m` formed by the internal pair-block edges.

Some such distinguished matchings are augmentable through paths between
singleton blocks.  There is an exact quotient-level test for this.  By
Berge's lemma the distinguished matching is maximum exactly when it has no
augmenting path.  Since the expanded graph is a forest, the quotient path
between any two singleton blocks is unique.  It lifts to an alternating path
exactly when it has no internal singleton and, at each internal pair block,
its entering and leaving quotient edges use opposite endpoints.  Those are
literal equal/unequal constraints on the normalized incidence bits.  The
verifier rejects precisely the patterns satisfying every constraint on at
least one singleton-to-singleton path.

For an independent cross-check, every retained expansion still has its
independence number recomputed by exact tree dynamic programming and asserted
equal to `a`.  The augmenting-path prefilter was also replayed on the complete
all-forest cells `(19,14)` and `(20,14)`: both outputs, including all raw and
valid counts, minima, and witnesses, were line-for-line identical to the
earlier verifier that filtered only by exact independence number (the files
use different LF/CRLF line endings).

Every target forest is covered: contract one of its maximum matchings, map the
resulting unlabelled quotient to the enumerated representative, carry along
the singleton set, and retain the induced endpoint choices.  Different
maximum matchings or quotient automorphisms can encode the same forest more
than once.  These are harmless duplicate checks, never omissions.

## 3. Endpoint-incidence gauge

For each quotient edge, record one bit at every incident pair block.  A
pair--pair edge therefore has four raw endpoint choices and a
singleton--pair edge has two.  Swapping the two endpoints inside a pair block
toggles every incidence bit at that block and leaves the expanded unlabelled
forest unchanged.

For each nonisolated pair block, choose its first incident quotient edge and
use the swap to set that bit to zero.  Incidence-bit sets belonging to
different pair blocks are disjoint, so these normalizations are independent
and unique.  Isolated pair blocks have no bit and need no normalization.  The
number of free bits is therefore exactly

```text
sum_(v pair, degree_Q(v)>0) (degree_Q(v)-1)
= pair incidences - nonisolated pair blocks.          (4)
```

This is componentwise.  In a connected perfect quotient it reduces to
`m-2`; with one marked singleton of quotient degree `r`, it reduces to
`m-r`.  Formula (4), not a raw `4^|E(Q)|` loop, is used by the verifier.

## 4. Exact quotient-forest enumeration

The canonical WROM successor generates every free tree component through
order 14 and asserts the classical counts.  Canonical nondecreasing component
multisets then generate every unlabelled quotient forest once.  The totals are

```text
3,658 quotient forests at order 13,
8,599 quotient forests at order 14.
```

Equivalently these are the coefficients of

```text
product_(s>=1) (1-z^s)^(-t_s),
```

where `t_s` is the number of unlabelled free trees of order `s`.  The verifier
asserts both totals in every matrix cell.  For each quotient forest it
enumerates every independent singleton marking of the required size, every
gauge-normal endpoint pattern, every maximum-matching-valid expansion, and
one polynomial state per support incident with a leaf.  Multiple leaves at
one support have the same deletion polynomial, so one support check is exact.

All coefficients through `i9` are exact unsigned integers; the cleared
functional is evaluated in signed 128-bit arithmetic.  Vertex-deleted
polynomials are computed by exact directed tree messages, and division by the
isolated-leaf factor uses

```text
I(P-support)=(1+x)I(P-{support,leaf}).
```

## 5. No-gap matrix

The final certificate contains all cells in (3).  No endpoint or
connected-only result substitutes for a missing cell.

```text
alpha 13: n=19 20 21 22 23 24 25 26
alpha 14: n=19 20 21 22 23 24 25 26 27 28
```

The authoritative cell counts and minima are assembled from the exact logs
by `assemble_rank8_pgc_matching_quotient_boundary.py`.  The assembler and
independent fast replay print

```text
PASS_PROOF_RANK8_PGC_ALPHA13_ALPHA14_BOUNDARY_ALL_FORESTS
PASS_PROOF_RANK8_PGC_ALPHA13_ALPHA14_BOUNDARY_ALL_FORESTS_REPLAY
```

The 18 new cells above order 18 contain

```text
115,254 quotient-forest visits (3,658 or 8,599 in every cell),
20,472,577 independent singleton designations,
13,022,262,257 gauge-normal endpoint coverings,
4,181,212,094 maximum-matching-valid covering expansions,
35,835,633,241 pendant-support states,
0 negative Q8 states,
55,586,688 negative V8 states,
0 negative coupled states.
```

The minimum coupled margin above order 18 is
`202611114764/13426838 = 101305557382/6713419`, attained in cell `(19,13)`.
Including the polynomial-complete base through order 18, the global minimum
remains `15765688/1725` and is positive.  Hence (1) holds for every forest
with a pendant edge and `alpha(P)` equal to 13 or 14.

The entire `alpha(P)=13` row is independently complete,
including the order-at-most-18 base and all new cells `19<=n<=26`.  The eight
new cells contain 543,144,674 matching-valid covering expansions and
4,390,836,421 pendant-support states.  They have zero negative `Q8` states,
55,568,910 negative `V8` states, and zero negative coupled states.  Thus (1)
is proved for every forest with a pendant edge and `alpha(P)=13`.

## 6. Independent coverage controls

`verify_rank8_matching_quotient_coverage_small.py` is an independent Python
implementation.  It compares exact *sets of full/reduced polynomial pendant
pairs*, rather than only counts.

It agrees with ordinary free-tree enumeration at the perfect and
near-perfect connected slices `(n,alpha)=(16,8),(17,9)`.  It also agrees with
the polynomial-complete all-forest construction at `alpha=8`, orders 14, 15,
and 16, covering deficiencies `d=2,1,0`.  In all five cases the quotient and
ordinary pair sets are identical, with zero missing and zero extraneous rows.

```text
case                    ordinary objects   quotient covers   distinct pairs
connected (16,8)                    701              1,472            2,870
connected (17,9)                  6,161             38,343           27,968
all forests (14,8), d=2              --             30,327            8,924
all forests (15,8), d=1              --             13,174            9,371
all forests (16,8), d=0              --              2,219            4,433
```

The order-25 connected `alpha=13` quotient cover independently reproduces the
104,636,890-tree WROM scan's global coupled minimum, minimum negative `V8`,
and both witnesses exactly.

## 7. Why the literal coupling is essential

The production scans retain separate `Q8(P)` and `V8(B)` diagnostics.  The
connected census already contains hundreds of thousands of states with
`V8(B)<0`, including `alpha(P)=14` states at order 25.  The componentwise
all-forest cells contain millions more.  Every completed literal numerator is
positive, but the `V8` term is not separately nonnegative.  These are actual
forest rows and must be preserved as counterexamples to the weaker separated
boundary route.

## 8. Replays

The production source is

```text
verify_rank8_pgc_boundary_matching_forest_quotient.rs
```

compiled with

```powershell
rustc -O --cfg rank8_boundary_library --target x86_64-pc-windows-gnu `
  .\verify_rank8_pgc_boundary_matching_forest_quotient.rs `
  -o .\verify_rank8_pgc_boundary_matching_forest_quotient_prefilter.exe
```

A cell is replayed as, for example,

```powershell
.\verify_rank8_pgc_boundary_matching_forest_quotient_prefilter.exe `
  --target 26 --alpha 13
```

The fast final audits are

```powershell
python .\verify_rank8_matching_quotient_coverage_small.py
python .\assemble_rank8_pgc_matching_quotient_boundary.py
python .\verify_rank8_pgc_matching_quotient_boundary.py
```
