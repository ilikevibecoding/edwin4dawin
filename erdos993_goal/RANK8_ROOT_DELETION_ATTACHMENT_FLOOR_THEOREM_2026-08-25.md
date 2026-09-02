# Root-deletion attachment-floor theorem

Date: 2026-08-25

## Theorem

Let `T` be an `n`-vertex tree, let `q` be any vertex, and fix `k>=2`. Put

```text
H=T-N[q],   a=i_(k-1)(H),   h=i_k(T-q).
```

Then

```text
k h >= (n-3k+2)a.                                      (1)
```

If `n-3k+2>=0`, the deletion recurrence `i_k(T)=h+a` gives

```text
i_k(T-q)/i_k(T) >= (n-3k+2)/(n-2k+2).                  (2)
```

When `a=0`, the left side of (2) is one, so the same conclusion holds.

## Proof

Write `B=N_T(q)`. Every component `C` of `H` has exactly one edge to `B`.
It has at least one because `T` is connected. If it had two, the path between
their endpoints inside `C`, together with the one or two boundary vertices
and their edges through `q`, would form a cycle. Root `C` at the endpoint in
`C` of this unique attachment edge, and orient its edges away from that root.

Set `s=k-1` and consider all independent `s`-sets `R` of `H`. For an oriented
edge of `H`, call the incidence upward when its selected endpoint is the child
and downward when its selected endpoint is the parent. The standard forest
incidence map injects downward incidences into upward incidences:

1. if the unselected child has no selected child, slide the selected parent
   down to it and charge the resulting upward incidence;
2. otherwise, charge the upward incidence of its least selected child.

The target recovers the source, and the two cases cannot collide, so the map
is injective.

Across all `a=i_s(H)` sets, let `A` be the number of occurrences of selected
component roots. There are exactly `sa-A` upward incidences, hence at most
`sa-A` downward incidences. Adding the `A` attachment-edge incidences gives

```text
sum_R [sum_(v in R)deg_H(v) + selected attachment roots]
 <= 2(sa-A)+A
 <= 2sa.                                                (3)
```

Every neighbor of `R` inside `H` is paid by an internal edge incidence.
Every neighbor of `R` in `B` is paid by a selected attachment root; if several
roots meet the same boundary vertex this only overcounts. Therefore (3)
implies

```text
sum_R |N_(T-q)(R)| <= 2sa.                              (4)
```

The number of vertices extending `R` to an independent `k`-set of `T-q` is

```text
n-1-s-|N_(T-q)(R)|.
```

Summing and applying (4), the extension-pair count is at least

```text
[n-1-3s]a = (n-3k+2)a.                                 (5)
```

Every independent `k`-set of `T-q` is counted at most `k` times in (5): a
set lying wholly in `H` is counted `k` times, one containing exactly one
boundary vertex is counted once, and one containing at least two boundary
vertices is not counted. Thus the same pair count is at most `kh`, proving
(1). Equation (2) follows by dividing (1) by `ka` and applying the increasing
map `x -> x/(1+x)`.

## Rank-eight corollary

For the live rank-eight root coordinate and every `n>=20`,

```text
Z=h7/c7=i_7(T-q)/i_7(T) >= (n-19)/(n-12).              (6)
```

With `t=1/n`, this is the particularly simple rational floor

```text
Z >= (1-19t)/(1-12t).                                  (7)
```

At the current analytic cutoff `n=28`, (6) gives

```text
Z >= 9/16 = 0.5625.
```

This supersedes the earlier degree-split floor `13/27` and the original
binomial floor `11628/34651` for the present rank-eight application.

## Exact replay and independent audit

The producer verifies the attachment structure and (1) on every one of the
2,287 nonisomorphic trees through order 13: 27,918 roots and 172,302 active
rank/root cells. It also checks 2,112 live large-order roots.

```text
verify_rank8_root_deletion_attachment_floor_root.py
A85C87DDF0106936BE3CDC699DA330F1EB4B0BE45BA711C2DA27956B65BD6AE8

rank8_root_deletion_attachment_floor_exact_root_20260825.json
257995DFA86E32A7E5B64F8315671E5D8DFED4ED502B642252362FB42500AA21
```

The independent audit imports no producer code. On all trees through order
11 it reconstructs 382,045 selected sets, 416,636 downward-incidence sources,
every injection target, every boundary hit, and every literal extension. A
fresh include/exclude DP separately checks 1,996 large-order rank-seven roots.

```text
audit_rank8_root_deletion_attachment_floor_root.py
ED27ED3B9DB96131FE1C4551BFEE77D8729FE4D6E2685CD411D826212EAD648D

rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json
9F691B70DB4240B056EE92D1424D2A9269DF0224C9CE9A22A2C2F00EA89B8C9D
```

This is a new all-order realizability theorem. It does not alone establish a
pending `Delta0..Delta3` tensor, connected `Q8`, forest `Q8`, rank-eight PGC,
or Erdos Problem 993.
