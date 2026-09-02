# Rank-eight exceptional first-crossing terminal-alpha-three band

Date: 2026-08-20

Status: **exact PASS for all three terminal-alpha-three cells, with an
independent canonical-multiset no-gap and collision audit.  This stops before
terminal alpha four.**

## Certified cells and signs

```text
source terminal total checks products key->product collisions negative zero
  11      3      14    2,179   1,864            315             0      0
  12      3      15    3,071   2,624            447             0      0
  13      3      16    4,172   3,547            625             0      0
total                   9,422   8,035          1,387             0      0
```

Exact sign ranges:

```text
source 11:  12,874,158 <= Q8 <=    779,981,875,200
source 12:  53,947,971 <= Q8 <=  3,261,041,270,784
source 13: 198,273,504 <= Q8 <= 11,972,013,301,248
```

All 9,422 canonical checks are strictly positive.

## Exact partial-state counts

After closing sorted component type nine, the distinct keys
`(alpha,i1,...,i9)` are

```text
alpha   0  1  2  3  4  5  6   7   8   9  10  11   12   13
states  1  2  5 13 23 43 80 127 206 330 486 722 1060 1478
```

The total is 4,576 partial states.

## Independent no-gap and collision audit

The audit independently enumerated every exponent vector of the nine
component types of alpha at most three, at total alpha 14, 15, and 16.  It
selected the unique largest nonzero alpha-three type, deleted one terminal
copy, and recomputed the exact source jet, product jet, and literal `Q8`.

```text
source raw multisets canonical keys products multiset->key key->product
  11       2,435          2,179       1,864        256          315
  12       3,486          3,071       2,624        415          447
  13       4,837          4,172       3,547        665          625
total     10,758          9,422       8,035      1,336        1,387
```

Every independently reconstructed canonical key appears exactly once in the
recurrence report, and no reported key is extra.  The collision counts are
benign exact jet equalities, not omitted multisets or sign failures.

Maximum multiplicities were:

```text
source  max multisets/key  max keys/product  max multisets/product
  11            3                 2                    4
  12            4                 2                    4
  13            4                 2                    5
```

## Resources and scope

```text
workers             1
elapsed              0.09456200001295656 seconds
peak private bytes  26,320,896
peak private MiB    25.1015625
cap                 512 MiB
```

This certifies only terminal alpha three.  Terminal-alpha bands four through
nine remain.  No full/full cone and no connected `Delta0..3` work was run.

## Exact hashes

```text
probe_rank8_exceptional_first_crossing_alpha3_exact.py
8FF5916209D1945491706D047BBE9D14B64BE5EB027000C1AB7901DF98C6359C

rank8_exceptional_first_crossing_alpha3_exact_20260820.json
55E3215E4205BD6B1673B35F7ED1A7BCA1B63147555B1C5C3F1E8A87F969C0BA

audit_rank8_exceptional_first_crossing_alpha3.py
B27AE8CE437612E0CCFDA738D7565D59184BE18419B43C974C00193E2EC6608E

rank8_exceptional_first_crossing_alpha3_audit_exact_20260820.json
904EC889C7CD57B78BECE572BEEBB65B881B5E51C933E8A612BE008F55074867

probe_rank8_exceptional_first_crossing_alpha2_exact.py
DEB3979EAD3F997A7399C4485AFCABF7D246B66FC02A2B8D8ABA6F7BFA5D46D3

rank8_exceptional_tree_jets_exact_20260820.tsv
B4558C561CE1C13C74C4AFB2DA25CD0E0265AB7AD6C9AC1C283EC54133D1F17A

rank8_exceptional_tree_jets_exact_20260820.json
BFE580BFED487B75D8C4A188AA56770D06EED3C6F4C351F4E093998F3CF0B0C4
```
