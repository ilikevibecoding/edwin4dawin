# ISO switching payment cannot stay inside intersection strata

Date: 2026-08-29

Status: **exact route obstruction, not a counterexample to forest ISO and not
a proof or disproof of Erdős Problem 993.**

Fix a rank `k`.  For every ordered pair in each of the three terms of the ISO
reserve, group it by the cardinality of its intersection.  In an intersection
stratum `s`, put

```text
D_s = # ordered (k,k) pairs with intersection size s,
B_s = # ordered (k+1,k+1) pairs with intersection size s,
U_s = # ordered (k,k+2) pairs with intersection size s.
```

Then direct partitioning gives

```text
sum_s [D_s+(k+1)B_s-(k+2)U_s]
 = p_k^2+(k+1)p_(k+1)^2-(k+2)p_k p_(k+2).
```

The summands are not individually nonnegative, even for a tree.  Take the
seven-vertex star `K_(1,6)` and `k=1`.  Its independence row is

```text
(1,7,15,20,15,6,1),
```

and its full ISO reserve is positive:

```text
7^2+2*15^2-3*7*20 = 79.
```

But the empty-intersection stratum has

```text
D_0=42,   B_0=90,   U_0=80,
D_0+2B_0-3U_0 = -18.
```

The other intersection strata contribute `67` and `30`; their transport is
essential.  Thus even allocating each intersection stratum its exact share
of the full dummy/common-mark term `p_k^2` does not close that stratum.

An even smaller union-stratum obstruction occurs on `K_(1,3)` at `k=1`.
The union-size-four stratum contains one `(1,3)` pair and no dummy or balanced
pair, so its local reserve is `-3`, while the total ISO reserve is positive.

Therefore an ISO switching proof cannot be local in either intersection size
or union size.  It must transport surplus across those strata (or use a
different global statistic) with a recoverable accounting map.

Replay:

```powershell
python .\verify_iso_intersection_stratum_payment_obstruction_agent.py
```

The marker is

```text
PASS_EXACT_ISO_STRATUM_LOCAL_PAYMENT_OBSTRUCTION
```
