# Isolate and collision FML on the rank-four top collar

## Theorem

Let `(B;u,v)` be a marked forest, put `W=B-{u,v}`, and suppose

```text
r=4=alpha(W)+2.
```

Then both remaining four-minor leaf inequalities hold:

1. If `z` is an unmarked isolate of `B`, then

   ```text
   N_4(B;u,v)-N_4(B-z;u,v) >= N_3(B-z;u,v).
   ```

2. If `z` is an unmarked leaf whose support is one of the marks, then

   ```text
   N_4(B;u,v) >= N_4(B-z;u,v).
   ```

The minimum exact gaps are respectively `2` and `4` in `N_r` units (or
`4` and `8` in doubled-diagonal units), so both inequalities are strict.

Together with
`ISO_COMPACT_ORDINARY_TOP_COLLAR_R4_THEOREM_ROOT_2026-08-29.md`, this proves
all three FML modes on the complete rank-four top-collar layer.

## Finite reduction

The hypothesis forces `alpha(W)=2`.  A forest is bipartite, so its larger
color class is independent and `|W|<=2 alpha(W)=4`.  Since `B` consists of
`W` and the two marks, `|B|<=6`.

The verifier therefore enumerates every labelled simple graph on four, five,
and six vertices, keeps exactly the forests, then checks every ordered marked
pair with `alpha(W)=2` and every eligible isolate or marked-support leaf.  This
enumeration is complete without relying on a graph-atlas isomorphism list.
Each closed-form `N_r` value is independently cross-checked against the
doubled bivariate nested-kernel evaluator.

## Exact replay

```text
simple graphs enumerated       33,856
forests retained                3,261
ordered marked pairs           94,236
top-collar marked pairs        24,828
independent kernel checks      27,852
isolate cells                   1,008
collision cells                 2,016
negative cells                      0
minimum isolate gap                 2
minimum collision gap               4
```

Replay:

```text
python prove_iso_isolate_collision_top_collar_r4_root.py
```

Success marker:

```text
PASS_EXACT_ALL_FOREST_ISO_ISOLATE_COLLISION_TOP_COLLAR_R4
```

Integrity:

```text
source SHA256
FE575F513BAFAA61063A5E3A311DEEADBC6225D2F6EC5DDE27BDBBA33A4E54C0

report SHA256
6965133D0E91B7D7BBF1BD6CF6B3F884B8876FAC7CB70A463816598B6DBBCE99
```

## Scope boundary

This proves only the rank-four top collar `alpha(W)=2`.  It does not prove
rank four for `alpha(W)>=3`, any rank at least five, full FML, forest ISO, or
Erdos Problem 993.
