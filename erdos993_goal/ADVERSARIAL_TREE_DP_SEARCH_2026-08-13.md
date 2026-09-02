# Exact adversarial tree-DP search at orders 60--120

Date: 2026-08-13

Status: finite exact counterexample search with no witness.  This is not an
exhaustive isomorphism census, a pruning theorem, or a proof of Erdos Problem
993.

## 1. Outcome

The deterministic campaign evaluated the independence polynomial of
6,071,001 distinct **labeled topology encodings** at the six fixed orders

```text
60, 72, 84, 96, 108, 120.
```

No evaluated coefficient sequence had a strict descent followed by a strict
rise.  Hence the campaign found no finite tree counterexample.

The search is complementary to, not an extension of, the exhaustive
unlabeled-tree frontier through order 29.  Label-distinct encodings can be
isomorphic, and the mutation search does not cover all trees at any listed
order.  Its material advance is a much larger exact higher-order topology
optimization campaign than the archived 130,064-tree fixed-order-60
PatternBoost topology evolution, with the search objective corrected to
focus on the only possible pre-tail rebound region.

## 2. Non-duplicative search lane

The prior finite lanes already included:

1. exhaustive tree unimodality through order 29;
2. the exact forest-polynomial PGC census through order 16;
3. 43,595 certified PatternBoost order-60 factors and the 24,972,350-product
   mixed-forest beam through depth 64;
4. homogeneous and heterogeneous Galvin/bouquet grids;
5. a 130,064-tree topology evolution at fixed order 60.

Repeating a small census or another pure product beam would therefore not
move the direct-search frontier.  The new program instead mutates whole
tree topologies by subtree-prune/reattach and leaf moves, starting from 96
ranked PatternBoost seeds, the prior evolved champion, and random labeled
trees.  Complete sorted edge encodings are retained for exact deduplication.

For each mutated topology the tree is rooted at vertex zero and the program
computes, bottom-up,

```text
E_v(x) = product over children u of T_u(x),
S_v(x) = x product over children u of E_u(x),
T_v(x) = E_v(x) + S_v(x).
```

Thus `T_0` is the independence polynomial of the explicit tree.  At order
at most 120, every coefficient and every recurrence subtotal is below
`2^120`; unsigned 128-bit integer arithmetic is therefore exact.  All
descent/reascent decisions and direct adjacent-ratio comparisons are exact
integer comparisons.  Long-double values are used only to rank one
secondary ratio-recovery fitness coordinate; they cannot create or accept a
witness.

The fitness gives priority to a ratio rebound before

```text
ceil((2 alpha - 1)/3),
```

the start of the known decreasing tail.  This avoids spending the campaign
on harmless deep-tail log-concavity defects.  Every evaluated polynomial is
nevertheless checked for a descent followed by a rise across its full
support.

## 3. Exact finite coverage

Parameters were population 144, 600 generations, 12 children per retained
state, and deterministic seed `99308132026`.

| order | distinct labeled encodings | duplicate mutations skipped | champion alpha | first descent | tail start | best later pre-tail ratio |
|---:|---:|---:|---:|---:|---:|---:|
| 60 | 1,003,149 | 33,795 | 41 | 19 | 27 | 0.8977959525549234 |
| 72 | 1,008,991 | 27,953 | 51 | 24 | 34 | 0.9216708007898260 |
| 84 | 1,014,619 | 22,325 | 55 | 26 | 37 | 0.9194617573072689 |
| 96 | 1,015,097 | 21,847 | 63 | 30 | 42 | 0.9299584794555760 |
| 108 | 1,014,258 | 22,686 | 71 | 34 | 47 | 0.9380992112783411 |
| 120 | 1,014,887 | 22,057 | 80 | 38 | 53 | 0.9447650847648736 |

All six retained direct-objective champions have `legal_rebound=false`.
The closest champion is the order-120 tree.  Its best later pre-tail edge is
at index 39 and is, exactly,

```text
37480091378342716583828916
--------------------------------  < 1.
39671334157813943451518821
```

The report stores the full edge list and complete exact independence
polynomial of every per-order champion.  The finite search took
403.962475 seconds in the recorded run.

## 4. Independent champion replay

`verify_adversarial_tree_dp_search.py` does not import or call the C++
recurrence.  It reconstructs every stored edge list, independently checks
that it is a tree, recomputes the excluded/selected rooted recurrence using
unbounded Python integers, compares every coefficient with the stored
polynomial, and recomputes the descent and best pre-tail ratio.

It reports

```text
PASS_INDEPENDENT_EXACT_ADVERSARIAL_TREE_DP_CHAMPION_VERIFICATION
```

for all six champions.  This independently verifies the stored candidates,
not the 6,071,001-state campaign count; the latter is the deterministic
search program's coverage report.

## 5. Replay

Prepare the seed bank and compile with the recorded MinGW `g++ 16.1.0`:

```text
python prepare_adversarial_tree_dp_seeds.py --limit 96 --output adversarial_tree_dp_seeds_20260813.txt
g++ -std=c++20 -O3 -DNDEBUG -Wall -Wextra adversarial_tree_dp_search.cpp -o adversarial_tree_dp_search.exe
```

Run the campaign:

```text
adversarial_tree_dp_search.exe --seed-file adversarial_tree_dp_seeds_20260813.txt --orders 60,72,84,96,108,120 --population 144 --generations 600 --children 12 --seed 99308132026 --output adversarial_tree_dp_search_6orders_g600_20260813.json
```

Replay the stored champions independently:

```text
python verify_adversarial_tree_dp_search.py adversarial_tree_dp_search_6orders_g600_20260813.json --output adversarial_tree_dp_search_6orders_g600_verified_20260813.json
```

## 6. Artifact hashes

```text
prepare_adversarial_tree_dp_seeds.py
43EC179B7A134FBA91F06AE02266A464A77B625E954918AE80E6ECC836CA9C75

adversarial_tree_dp_seeds_20260813.txt
F5FE5FD83675CE4708EB86A425CFF910E3041731043F9231AE6D62B05DE89C63

adversarial_tree_dp_search.cpp
3373ABAC62AB68A99BF3D72699AF416F3F97691F0AB782D2FA966BABF187C2BE

adversarial_tree_dp_search.exe
639B80ABF792821354F5268FB17EC919FAAAE5159078CAAB4C54C27A58F5C79B

adversarial_tree_dp_search_6orders_g600_20260813.json
F34390E53E7A2E9D974E4EEBA44341DB2B08950AB4BBA39CA5AD5EF7AA1B29AA

verify_adversarial_tree_dp_search.py
52885324096E556FF1FE6B59567E1D1C1613BBD2A8FA237A7A60BF615A29808F

adversarial_tree_dp_search_6orders_g600_verified_20260813.json
F959631D8F78E6A9FC8BEB8E355EB8DCD3A058B4D32BE9DE998E3E44499873F2
```

## 7. Scope boundary

This campaign supplies direct finite evidence only.  It does not strengthen
the order-29 exhaustive theorem, prove that the mutation grammar reaches all
trees, certify nonisomorphic coverage, prove unimodality for an infinite
family, or close PGC or master Section 109.  No master file was edited.
