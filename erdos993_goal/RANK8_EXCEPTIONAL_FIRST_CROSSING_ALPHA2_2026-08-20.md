# Rank-eight exceptional first-crossing terminal-alpha-two band

Date: 2026-08-20

Status: **exact PASS for both terminal-alpha-two cells, with an independent
no-gap multiset audit.  This stops before terminal alpha three.**

## Certified cells

The accepted sorted-type, ascending-alpha recurrence was closed through the
two alpha-one types and the two alpha-two types.  Only crossings whose unique
largest sorted type has alpha two were tested.

```text
source  terminal  total  checks  distinct products  negative  zero
  12        2      14      189          189              0       0
  13        2      15      224          224              0       0
total                      413          413              0       0
```

Exact sign ranges:

```text
source 12: 18,116,604 <= Q8 <=   881,260,756,992
source 13: 73,432,359 <= Q8 <= 3,621,408,620,544
```

All 413 tested values are strictly positive.

## Exact partial states

After closing sorted component type four, the distinct product-jet counts
under the key `(alpha,i1,...,i9)` are

```text
alpha   0  1  2  3  4  5  6  7  8  9  10  11  12  13
states  1  2  5  8 14 20 30 40 55 70  91 112 140 168
```

The total is 756 partial states.

## Independent no-gap audit

The audit did not reuse the dynamic-programming state construction.  It
directly enumerated every exponent vector of the four available types with
weights `(1,1,2,2)` at total alpha 14 and 15, required at least one alpha-two
component, selected the unique largest nonzero alpha-two type, deleted one
terminal copy, and recomputed the source jet, product jet, and literal `Q8`.

It found exactly 189 multisets in the total-14 cell and 224 in the total-15
cell.  The 413 independent canonical keys equal the 413 recurrence rows, with
no source-jet collisions within a largest-type cell and no missing or extra
row.

## Resources and scope

```text
workers             1
elapsed              0.013040799996815622 seconds
peak private bytes  14,188,544
peak private MiB    13.53125
cap                 512 MiB
```

This package certifies only terminal alpha two.  Terminal-alpha bands three
through nine remain.  No full/full cone and no connected `Delta0..3` work was
run.

## Exact hashes

```text
probe_rank8_exceptional_first_crossing_alpha2_exact.py
DEB3979EAD3F997A7399C4485AFCABF7D246B66FC02A2B8D8ABA6F7BFA5D46D3

rank8_exceptional_first_crossing_alpha2_exact_20260820.json
E7F7367B14C38F4298500FDC657B375120997657DACB64DBBA90DC3B657C386A

audit_rank8_exceptional_first_crossing_alpha2.py
A0FD0968734F7AF4C9907D6F977FCBD24214220D48E2B526BB93CFDEBCEDAF19

rank8_exceptional_first_crossing_alpha2_audit_exact_20260820.json
D20CD466290D88256D9DCB6A529C8CF32591F2070BEE7EBA6CAB0A2D39AB6B70

rank8_exceptional_tree_jets_exact_20260820.tsv
B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A

rank8_exceptional_tree_jets_exact_20260820.json
BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4
```
