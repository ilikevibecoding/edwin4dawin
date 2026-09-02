# Rank-five `alpha(W)=5` FML layer

Date: 2026-08-29

Status: **complete exact theorem for all three FML modes on the layer
`r=5, alpha(W)=5`.**  This is a finite reduction forced by bipartiteness; it
does not extend to `alpha(W)>=6`.

## Theorem

Let `(B;u,v)` be a marked forest and put `W=B-{u,v}`.  At rank `r=5`, if
`alpha(W)=5`, then the ordinary, isolate, and marked-support collision
four-minor leaf gaps are all nonnegative.

## Finite reduction

Because `W` is bipartite,

```text
|W|<=2 alpha(W)=10.
```

After adjoining the two marks, every core has order at most twelve.
Therefore all cases are covered by exact generation of every unlabeled forest
through order twelve, every valid marked pair, and the mode-specific acyclic
support attachment.

The ordinary classifier checks:

```text
forest types                 2,947
marked cores                21,158
reconstructed cells        749,890
minimum doubled A piece      3,380
minimum doubled B piece        252
minimum doubled full gap     3,650
negative full gaps               0
```

The isolate/collision classifier checks:

```text
isolate cells               11,574   minimum gap 548
collision cells             16,800   minimum gap 834
negative cells                   0
```

The ordinary isolate/cross source split is not separately positive: the
cross term is negative in `2,212` cells, with minimum `-2,008`, while the
coupled full gap remains strictly positive.  Thus the classification proves
the exact coupled statement and does not infer it from a false subsplit.

## Replay

```text
python .\prove_iso_compact_ordinary_r5_alpha5_root.py
python .\prove_iso_isolate_collision_r5_alpha5_root.py
```

Expected markers:

```text
PASS_EXACT_ALL_FOREST_ISO_COMPACT_ORDINARY_R5_ALPHA5
PASS_EXACT_ALL_FOREST_ISO_ISOLATE_COLLISION_R5_ALPHA5
```

Frozen SHA-256 pins:

```text
prove_iso_compact_ordinary_r5_alpha5_root.py
C4DA966F717515514771DD55DF67F68FF76762F97494A58970B2052C06CA845F

iso_compact_ordinary_r5_alpha5_exact_root_20260829.json
2B69FAC83033DE5F82C585B079E2F2F41304FDC753BE1E1D2C8D75FFDE52239F

prove_iso_isolate_collision_r5_alpha5_root.py
56A95D8FCB1D8AE4967EBA630DEDC73CAD288553393EE574C7784051547C7875

iso_isolate_collision_r5_alpha5_exact_root_20260829.json
E4FDC0765E16918DBECD33F1A4E0C7C1E421F017543955D6CDD087FEAB3E10E6
```

## Scope

The next unbounded layer is `alpha(W)>=6`.  This theorem does not prove FML
there, prove the forest ISO inequality at ranks nine and above, or resolve
Erdős Problem 993.
