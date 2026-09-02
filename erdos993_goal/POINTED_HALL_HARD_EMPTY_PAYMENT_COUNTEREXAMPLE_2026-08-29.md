# Counterexample to the hard-family empty-only Hall payment

Date: 2026-08-29

Status: **exact route obstruction inside the matching-contraction image.**
This does not affect the exact `delta>=2` private-neighbor payment and does
not disprove the pointed boundary, WR, ISO, unimodality, or Erdos Problem 993.

After paying every boundary set with `delta>=2` from its distinct
`Y-{p}` interval, one might try to pay all remaining `delta<=1` sets from
the empty Boolean interval.  That narrower proposal is also false.

Take `alpha=96` matched units.  One is a disjoint marked `K2` unit containing
the cover point `p`.  Another 65 units form a directed out-star with 64
active leaves.  The remaining 30 units are disjoint `K2`s.  In the original
forest, use matching edges `c_i a_i`, the 64 nonmatching edges `c_0 a_j`
for `1<=j<=64`, and mark a cover endpoint of one of the disjoint matching
edges.  With `A={a_i}`, both `alpha(G)` and `alpha(G-p)` equal 96.

At rank `r=64`, the operative Hall excess is `e=33`.  A hard boundary set
contains `p` and the active-star center, chooses 31 of the 64 active leaf
cover vertices, and makes arbitrary choices on the 30 other `K2` units.
Its private-neighbor increment is exactly `delta=1`.  Hence the hard count is

```text
2^30 C(64,33) = 1908135939686914171405860864.
```

The empty interval supplies only

```text
33 C(96,33) = 1900911857473066650234010560,
```

so the deficit is exactly

```text
7224082213847521171850304 > 0.
```

The actual pointed row remains enormously positive:

```text
64 i_64(G)-h_63,p(G)
 = 23259644985338838875316104985304359103015519232.
```

An exact Hall replay shows that other nonempty long intervals provide the
missing payment.  Thus a successful proof must retain more of the long
interval slack even after the `delta>=2` split.

## Replay

Run

```powershell
python .\verify_pointed_hall_hard_empty_payment_counterexample_agent.py
```

The script constructs the 192-vertex forest, verifies the matching and
independence numbers, checks the exact binomial count and strict deficit,
replays the full Hall decomposition, and finds the first failure in this
family through `alpha=500`.  Its marker is

```text
COUNTEREXAMPLE_EXACT_POINTED_HALL_HARD_EMPTY_ONLY_PAYMENT
```

