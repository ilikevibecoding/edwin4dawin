# Exact all-rank four-minor leaf census through forest order 13

## Scope

`probe_iso_four_minor_third_leaf_root.py --max-n 13` enumerates every
unlabelled forest available from the NetworkX graph atlas through order seven
and every nonisomorphic tree of orders eight through thirteen, together with
every ordered marked pair and every eligible third leaf.  It evaluates the
ordinary, marked-support collision, and isolate four-minor leaf gaps at every
supported rank using exact integer arithmetic.

This is finite evidence only.  It is not a proof for arbitrary forest order,
does not close FML, and does not resolve Erdos Problem 993.

## Replayed result

```text
checks             10,045,774
ordinary            8,294,614
collision           1,744,760
isolate                  6,400
negative gaps                0
minimum doubled gap         12
```

The minimum is an isolate cell on the three-vertex edgeless forest at rank
three.  The frozen report is
`iso_four_minor_third_leaf_probe_root_20260829.json`.

## Integrity

```text
source SHA256
78722521B51602CA6428FE044DB2F393822746620068394ED25212635F2C8BE6

canonical report SHA256 printed by replay
18DFFD57740065B22052B2497E39E6BEE2324F29123D82C6E26E01ED2C133D8C

on-disk report SHA256
CA07977FB32F0CC94778A953C921A8F71106874D740D0950E762300DF9DD4E40
```

Replay marker:

```text
PROBE_EXACT_ISO_FOUR_MINOR_THIRD_LEAF_RECURSION
```
