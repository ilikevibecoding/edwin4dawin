# Isolate and collision FML at rank five with alpha(W)=4

## Theorem

For every marked forest `(B;u,v)` with

```text
r=5,                  alpha(B-{u,v})=4,
```

the isolate and marked-support collision FML inequalities hold.  In doubled
diagonal units, the minimum isolate gap is `50` and the minimum collision gap
is `118`; both are strict.

Together with `ISO_COMPACT_ORDINARY_R5_ALPHA4_THEOREM_ROOT_2026-08-29.md`,
this proves all three FML modes on the entire `r=5, alpha(W)=4` layer.  With
the already proved `alpha(W)=3` top collar, the unresolved rank-five FML
range is now exactly `alpha(W)>=5`.

## Complete finite reduction

Since `W` is a forest, bipartiteness gives `|W|<=2 alpha(W)=8`; hence
`|B|<=10`.  The verifier generates every unlabeled forest through order ten,
checks every ordered marked pair with `alpha(W)=4`, and evaluates every
eligible isolate or marked-support leaf.  Minor polynomials use an exact
memoized bitmask recurrence on every induced subgraph.

```text
forest types                         636
ordered marked pairs              47,330
alpha(W)=4 marked pairs            7,776
direct minor evaluations          15,490
isolate cells                      2,270
collision cells                    3,174
negative or zero gaps                  0
minimum isolate gap                   50
minimum collision gap                118
```

Replay marker:

```text
PASS_EXACT_ALL_FOREST_ISO_ISOLATE_COLLISION_R5_ALPHA4
```

Integrity:

```text
source SHA256
461864DDB1D376C11258E79A8AEE106B17442FF48AC2B73DA7D930FE6F1AC0C7

report SHA256
679FDDF206DBEA58F469FA92B8C2FDE66E56D2969576FA25F69D5B69CF987CB3
```

## Scope boundary

This theorem does not cover `alpha(W)>=5`, any higher rank, full FML,
forest ISO, or Erdos Problem 993.
