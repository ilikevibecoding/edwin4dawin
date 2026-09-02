# Exact rooted-`C7` middle residual after the order-24 closure

Date: 2026-08-20

Status: **EXACT COVERAGE CUT, NOT A UNIVERSAL THEOREM.** This combines the
all-root order-23 and order-24 censuses, the `B2=5` subdivision theorem through
order 26, the older `B2<=4`/curvature results, and the new excess-degree-
partition scalar.

## Proved coverage

The combined rooted-`C7` coverage is now:

- every rooted tree through order 24;
- every rooted tree of order at least 39;
- every middle-band tree with `B2<=4`;
- every `B2=5` tree through order 26;
- every remaining exact excess-degree-partition/root-degree profile on which
  the new retained-motif scalar is positive.

## Live coarse cut

Starting from the previous 83-cell / 18,517-level residual, remove orders 23
and 24 and raise the `B2` floor from five to six in the eight order/root cells
with orders 25 or 26 and root degrees one through four. The live outer cut is

```text
orders                               25..38
order/root-degree cells                  69
integer (order,root-degree,B2) levels 16,282
```

This is an exact parameter cut; it does not assert that every integer `B2`
level is realized by a tree.

## Live degree-partition cut

Inside those 69 outer cells, enumerate every partition of `n-2` formed by the
positive excess degrees `deg(v)-1`, retaining only partitions compatible with
the selected root degree. The exact counts are

```text
coarse residual partition/root profiles   210,654
certified by the retained-motif scalar     110,455
remaining                                  100,199
remaining B2 range                           5..196
```

The assembler records the complete orderwise counts and `B2` histogram plus a
SHA-256 digest of the canonical list of all 100,199 remaining triples

```text
(order, root degree, descending positive excess partition).
```

Thus the live obstruction has been made exact at the degree-partition level.
It still needs literal root-neighborhood placement coupling; a degree
partition in the list may contain both easy and hard placements, and the
report does not silently identify them.

## Replay

```powershell
python .\assemble_rank7_rooted_c7_middle_residual_20260820.py
```

Expected marker:

```text
PASS_EXACT_ROOTED_C7_MIDDLE_RESIDUAL_AFTER_ORDER24_AND_B2_5_N26
```

The generated report is
`rank7_rooted_c7_middle_residual_exact_20260820.json`.

Its canonical remaining-profile digest is

```text
33EB719BAFE39066158F4C773BF894A938D00BCFFCDD39D98FD1A2CA4AF97816
```

SHA-256:

```text
assemble_rank7_rooted_c7_middle_residual_20260820.py
0B028EDE42B1928D38D3C00D845A8A3A226AFDAF3C57FD503A56EF5303C26949

rank7_rooted_c7_middle_residual_exact_20260820.json
9FF9E05BDFE1D722D267AE67FA2BEA278D816A31340B69E77D73BB00845B0B46
```
