# Terminal q3 Newton m=0: complete distance-six double-broom target range

Date: 2026-08-31

Let `T_(a,b,6)` be the tree whose two hubs are joined by a path of six
edges, with sorted pendant-leaf counts `a>=b>=1`.  Its independence number
is `a+b+3`.

This certificate assembles three separately replayed components.  The
all-order marked-isolate boundary theorem proves the payment nonnegative at
`j=3` for every no-isolate forest remainder; its independent finite auditor
directly rebuilds all supported rows through order 12.  The middle theorem
proves the exact isolated-marked-root terminal-q3 Newton `m=0` payment
positive when

```text
4 <= j <= a+b+3 and b >= j-2.
```

The tail theorem proves it positive when

```text
4 <= j <= a+b+3 and j >= b+3.
```

For integer `b,j`, these conditions are exactly

```text
j <= b+2    or    j >= b+3.
```

They are disjoint and exhaustive after the separate `j=3` boundary.  Hence
the payment is nonnegative at every supported target `3<=j<=a+b+3`, and is
positive at every `j>=4`, for every `a>=b>=1` in this connected distance-six
double-broom family.

The assembler pins the source, report, note, independent-audit source, and
independent-audit report for the boundary and both halves.  It also
exhaustively rechecks the integer partition on a large finite rectangle; the
exhaustive algebraic partition itself is the separate boundary plus the
consecutive-integer identity displayed above.

This closes one connected remainder family in the isolated-marked-root
terminal-q3 `m=0` lane.  It does not cover other remainder forests,
nonisolated marked roots, the complete terminal payment, or Erdos Problem
993.

Replay:

```powershell
python .\assemble_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_all_targets_root.py
```

Required marker:

```text
PASS_EXACT_ALL_SUPPORTED_TARGETS_TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE6_DOUBLE_BROOM_ROOT
```
