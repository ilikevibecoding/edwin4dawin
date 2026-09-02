# Rank eight: exact Delta2/Delta3 all-long `e=2` all-root values

Date: 2026-08-25

Status: **exact PASS for every root placement in every all-long `e=2`
double-claw source, assembled fail-closed from four independently audited
component gates.**

## Exact theorem

Let `T` be an `e=2` double-claw tree.  Suppose each of its four pendant arms
has length at least 7 and its branch-to-branch bridge has length at least 8.
For every vertex `q` of `T`, the rank-eight rooted residual value at `(T,q)`
is strictly positive at both `Delta2` and `Delta3`.

This holds at every admissible source order `n>=37` and at every degree-one,
degree-two, or degree-three root placement.

## Exhaustive six-family root partition

Every vertex of a double claw lies in exactly one family below.

1. A degree-three branch vertex.
2. A bridge degree-two vertex whose distances to both branches are at least 8.
3. A pendant degree-two vertex whose branch distance is at least 8 and whose
   leaf distance is at least 7.
4. A bridge degree-two vertex with distance at most 7 from at least one branch.
5. A pendant degree-two vertex with branch distance at most 7 or leaf distance
   at most 6.
6. A degree-one pendant leaf.

The first and sixth families are separated by degree.  A degree-two vertex is
separated first by whether it lies on the branch bridge or a pendant arm, and
then by complementary deep/shallow inequalities.  Hence the six families are
pairwise disjoint and exhaustive.

For the only nontrivial finite-position residue, a bridge gap is uniquely a
fixed state `0,...,6` or a long state `L=7+X`; reversal canonically orders the
two gaps.  The bridge-length constraint leaves exactly 23 shallow reversal
classes.  An oriented pendant root similarly has a branch-side state
`0,...,6,L` and a leaf-side state `1,...,6,L`, leaving exactly 40 shallow
classes.  Thus the shallow degree-two component has exactly 63 disjoint
patterns and no omitted position.

## Four fail-closed component gates

| Component gate | Root families | Exact rank cells | Independent literal boundary |
|---|---:|---:|---|
| Branch roots | 1 | 2 | both physical branch vertices; 21,952 rooted profiles |
| Deep degree-two roots | 2 | 4 | bridge path plus all four pendant paths; 980 comparisons |
| Shallow degree-two roots | 2 | 126 | reversal plus all four pendant paths; 30,688 comparisons |
| Leaf roots | 1 | 2 | all four endpoint roots; 672 comparisons |

All four gates pin their producer, independent audit, and canonical residual
hashes.  Every component reports zero ordered-digest mismatch, zero negative
certificate coefficient, and a strictly positive origin in every ray or
tensor.  The union contains six sealed root families, twelve rank-family
cells, and 134 exact certificate cells, with zero open family, zero ledger
gap, and zero ledger overlap.

The component audits use fresh literal adjacency lists and recursive
include/exclude forest DP.  Their symbolic replays use original path
coordinates rather than importing the producers' compressed formulas.

## Fail-closed boundary

This is a rooted residual **VALUE** theorem for the all-long `e=2` source
class only.  It does not prove a leaf-extension increment or an
inserted-new-leaf value.  It does not include a source with a pendant arm
shorter than 7 or a branch bridge shorter than 8.  Consequently it is not the
complete `e=2` layer and not a proof of Erdos Problem 993.

## Immutable union evidence hashes

```text
rank8_delta23_e2_all_long_branch_root_value_gate_exact_agent_20260825.json
F98877F5E1B91C5A64A77A3D97868FC37342DEEF92E74959E4BEA2A4ECEF0E5B

RANK8_DELTA23_E2_ALL_LONG_BRANCH_ROOT_VALUE_COMPLETE_THEOREM_2026-08-25.md
C62573927200615EE917D186DCC741FAE31B0ABBEE57918C72BDA6A8CE7192E8

rank8_delta23_e2_all_long_deep_degree2_root_value_gate_exact_agent_20260825.json
9109C73747463308BD4FC03845CEF33A7DB350F7D5A758EDA58E10B86550F24B

RANK8_DELTA23_E2_ALL_LONG_DEEP_DEGREE2_ROOT_VALUE_COMPLETE_THEOREM_2026-08-25.md
3F8180A3ABE57C1A15B2649CDA75B098995C2F55A4C3BEBBEF6B84B6A377C030

rank8_delta23_e2_all_long_shallow_degree2_root_value_gate_exact_agent_20260825.json
5A4093B2CF0E85DB67CC253F6F05674A942DFF541DA896DB8E8C2CA480EF1614

RANK8_DELTA23_E2_ALL_LONG_SHALLOW_DEGREE2_ROOT_VALUE_COMPLETE_THEOREM_2026-08-25.md
962B7097689588C89DCA46A08983814D15213F1B9A236A77BD527238EA2032FE

rank8_delta23_e2_all_long_leaf_root_value_gate_exact_agent_20260825.json
E850B13D91E6C09F95111F9413559E989E0DFB6D057245FB61F33DC6CA11F0B3

RANK8_DELTA23_E2_ALL_LONG_LEAF_ROOT_VALUE_COMPLETE_THEOREM_2026-08-25.md
7A676393C5B94C9762E6A88F88EB95A1606853DA3C0C1C97756DAF262FD24E1A

assemble_rank8_delta23_e2_all_long_all_root_value_gate_agent_20260825.py
B07C9E1CA71BE29AF60E5B7CC51335A7F1769B64B35F81B2FDC84E8330E6CDB2

rank8_delta23_e2_all_long_all_root_value_gate_exact_agent_20260825.json
EBFB483DDE3E5AFF49BB66C69448A412A904B20DED66DBF141F9E58525A37B4B
```
