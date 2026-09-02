# Rank eight: `e=2` length-extension finite theorem and thin all-order cell

Date: 2026-08-20

Status: **exact PASS for every rooted `e=2` double claw at orders 23 through
30, and an exact all-order bridge-extension theorem for the thin family
`(1,1,g,1,1)`.  The general all-order `e=2` theorem remains open.**

## 1. Exact extension identities

Every `e=2` tree is a double claw with four positive pendant lengths and one
positive bridge length.  Increasing a pendant length is represented by adding
a new leaf `w` at its old endpoint `u`.  Exactly,

```text
I(T+w)-I(T) = x I(T-u).
```

For an existing root `q`, delete `q` first and use the same identity.  If
`q!=u`, the increment is `x I(T-{q,u})`; if `q=u`, the new leaf becomes
isolated and the increment is `x I(T-u)`.  For the inserted root,
`(T+w)-w=T`.

Increasing the bridge length subdivides its final source edge `uv` by a new
vertex `w`.  The exact identity is

```text
I(T_uv)-I(T)
= x I(T-{u,v}) + x^2 I(T-(N[u] union N[v])).
```

The same identity applies after deleting an existing root, with the two
endpoint-deletion cases becoming leaf extensions.  For the inserted root,
`T_uv-w=T-uv`.

An independent generic tree-DP audit checks these identities coefficientwise
through rank eight for all five length types and 280 root/extension cases.

## 2. Exact finite extension theorem

The scout enumerates every canonical double claw at source orders 23 through
29, every one-step increase of each of the five lengths, every existing root,
and the inserted vertex.  Counts are

```text
source order   cores   old-root comparisons   inserted roots
23               920        105800                 4600
24              1115        133800                 5575
25              1335        166875                 6675
26              1591        206830                 7955
27              1877        253395                 9385
28              2205        308700                11025
29              2569        372505                12845
```

All old-root increments and inserted-root values are strictly positive for
`Delta0`, `Delta1`, `Delta2`, and `Delta3`.  The global increment minima occur
at source order 23:

```text
Delta0   34080271754300065318
Delta1  103720774269292825800
Delta2  172737383793236516056
Delta3  231463817470675423152.
```

The independent audit reconstructs all canonical counts, all 28 stored
old-root minimum witnesses, and every inserted-root minimum by a separate
scan.

Together with the independently audited positive order-23 base, this proves
by induction that every root of every `e=2` double claw at orders 23 through
30 has all four coefficients strictly positive.  To reverse a target step,
decrease any length greater than one.  A target root is either the inserted
vertex or corresponds to an existing source root.  Canonical side/arm
relabeling does not change the rooted coefficient value.

## 3. Corrected thin all-order theorem

For the thin source family with pendant lengths one and bridge length
`g>=18`, hence source order `g+5>=23`, increasing the bridge length has
strictly positive `Delta0..Delta3` increments for

- both branch roots;
- all four pendant-leaf roots;
- every internal bridge root; and
- the inserted bridge root.

For an internal bridge root, let `x,y>=0` be the numbers of vertices strictly
between it and the two branch vertices.  Then source order at least 23 is
exactly `x+y>=16`.

The safe no-gap split is:

1. both `x,y` long, written `X+7,Y+7`; the remaining offset sum at least two
   is covered by the two cells shifting `X` or `Y` by one;
2. exactly one long and the other fixed short `s=0..6`; shift the long
   coordinate by `9-s`;
3. two short coordinates are impossible because their sum is at most 12.

Together with the branch, leaf, and inserted-root cells this gives 19 exact
cells and 76 rank cells.  Every power-basis coefficient and constant is
strictly positive.  The independent audit rebuilds every boundary constant
by literal graph DP.

## 4. Withdrawn unsafe draft and remaining obstruction

The earlier thin report

```text
8977E684CE2C2830B8002FF0C294D83B2D9352A384AC9FFBC719679F06737447
```

is **withdrawn and superseded**.  It used symbolic path variables starting at
zero, where the polynomial continuation of the path binomial formula does not
equal literal short-path counts.  For example, its internal-root cell at
`x=8,y=0` reported the `Delta0` increment constant `400065573040`, while the
literal tree DP gives `422183551352`; at `x=0,y=8` the literal value is
`321735030888`.  These mismatches were proof-method defects, not negative
tree values.

The corrected short/long split removes this defect.  A full all-order proof
for arbitrary double claws still requires simultaneous short/long treatment
of the five core lengths plus the selected root split.  The finite scout and
thin theorem do not supply those missing symbolic cells, so no general
all-order monotonicity claim is made.

## 5. Hashes and scope

```text
probe_rank8_delta013_e2_length_extension.py
C8BA8039C99D8273194DF3672E3E23EE4DB592F19AC57D3571EC47075D0DC38C

rank8_delta013_e2_length_extension_scout_exact_20260820.json
49D5B53516C07B7DE085D5586158F3674B523F01B4167E8BA972AA61118F16C4

certify_rank8_delta013_e2_thin_bridge_extension_all_order.py
F31EFBF365D25BF85713D0C9D5CBA37F44385CA463B24BE00245BDE039E69C9B

rank8_delta013_e2_thin_bridge_extension_all_order_exact_20260820.json
4308C23DC1EC19647B1B22F2D0FA21D1B3C243A72B0CF52F563F3550340DC4F5

audit_rank8_delta013_e2_length_extension.py
4E654621FC3AE9A8989764D8F284B49F87CF17038C7C0CE6B26B724977188E52

rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json
FC336F62A58EE4C2CFB7EF6F9AF6D3BE24FA689B89841A86D656A2547CCE63A2
```

This package proves only the finite `e=2` orders 23 through 30 and the stated
thin all-order bridge-extension family.  It does not prove the general
all-order `e=2` layer, connected `Q8`, a forest lift, rank-eight PGC, or
Problem 993.  No master file was edited.
