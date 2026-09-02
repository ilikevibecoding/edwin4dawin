# Isolate and collision FML on the rank-five top collar

## Theorem

Let `(B;u,v)` be a marked forest, put `W=B-{u,v}`, and suppose

```text
r=5=alpha(W)+2.
```

Then both nonordinary four-minor leaf inequalities hold:

```text
N_5(B;u,v)-N_5(B-z;u,v) >= N_4(B-z;u,v)
```

when `z` is an unmarked isolate, and

```text
N_5(B;u,v) >= N_5(B-z;u,v)
```

when `z` is a leaf adjacent to one of the marks.  Values below use the
doubled-diagonal normalization.  The isolate minimum is `0` (14 equality
cells); the collision minimum is `4`.

Together with
`ISO_COMPACT_ORDINARY_TOP_COLLAR_R5_THEOREM_ROOT_2026-08-29.md`, this proves
all three FML modes on the complete rank-five top-collar layer.

## Complete finite reduction

The hypothesis gives `alpha(W)=3`.  Since every forest is bipartite,
`|W|<=6`, hence `|B|<=8`.  The verifier generates every unlabeled forest
through order eight as a multiset of unlabeled tree components, checks every
ordered marked pair, and checks every eligible isolate or marked-support
leaf.  Every minor polynomial is computed by literal independent-subset
enumeration.

```text
forest types                         154
ordered marked pairs               6,704
top-collar marked pairs            1,444
direct minor evaluations           2,896
isolate cells                        432
collision cells                      588
negative gaps                          0
minimum isolate gap                    0
minimum collision gap                  4
```

Replay:

```text
python prove_iso_isolate_collision_top_collar_r5_root.py
```

Success marker:

```text
PASS_EXACT_ALL_FOREST_ISO_ISOLATE_COLLISION_TOP_COLLAR_R5
```

Integrity:

```text
source SHA256
5A802D571EFCAB4D94184D9F60F04DCED47F687DCEF577ADC913FF5E61921201

report SHA256
0D09C7BCF22D880DBBBF28FBF7EA1F2F8D801055839FDA6F92F4AC3734ECDE5B
```

## Scope boundary

This theorem covers only `r=5=alpha(W)+2`.  It does not cover rank five
with `alpha(W)>=4`, any higher rank, full FML, forest ISO, or Erdos Problem
993.
