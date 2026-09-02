# All-forest root-deletion attachment-floor theorem

Date: 2026-08-25

## Theorem

Let `F` be an `n`-vertex forest, let `q` be any vertex, and fix `k>=2`. Put

```text
H=F-N[q],   a=i_(k-1)(H),   h=i_k(F-q).
```

Then

```text
k h >= (n-3k+2)a.                                      (1)
```

If `n-3k+2>=0`, then

```text
i_k(F-q)/i_k(F) >= (n-3k+2)/(n-2k+2).                  (2)
```

## Proof

Write `B=N_F(q)`. Every component `C` of `H` has either zero or one edge to
`B`. A component outside the component of `q` has zero. A component inside
the component of `q` has one: it has at least one by connectivity inside that
tree component, while two would produce a cycle. Root an attached component
at its unique endpoint incident with `B`, and root every unattached component
arbitrarily. Orient all component edges away from their roots.

Put `s=k-1` and range over all independent `s`-sets `R` of `H`. Let `A_1` be
the total number of selected attached roots and `A_0` the total number of
selected unattached roots. The usual downward-to-upward incidence injection
for a rooted forest gives

```text
downward incidences <= upward incidences
                      = sa-A_0-A_1.
```

Indeed, for a selected parent and its unselected child, slide the parent to
the child when that child has no selected child; otherwise charge the least
selected child in a fixed vertex order. Targets retain the selected set and
the oriented upward edge. Two slide targets, or two charge targets, plainly
recover the same unique source. A target cannot arise in both ways: if the
upward edge from a selected child `y` to its unselected parent `x` were a
charge target, the parent of `x` would be selected; but the slide preimage
replaces `y` by `x`, making that parent adjacent to `x`. The purported slide
preimage would therefore not be independent. Hence the map is injective.

Consequently the total selected internal degree, plus the incidences from
selected attached roots into `B`, is at most

```text
2(sa-A_0-A_1)+A_1 <= 2sa.                              (3)
```

Every neighbor of `R` in `H` is paid by an internal incidence, and every
neighbor in `B` is paid by a selected attached root. Thus

```text
sum_R |N_(F-q)(R)| <= 2sa.                              (4)
```

The number of vertices extending `R` to an independent `k`-set of `F-q` is
`n-1-s-|N_(F-q)(R)|`. Hence the total extension-pair count is at least

```text
[n-1-3s]a = (n-3k+2)a.                                 (5)
```

An independent `k`-set of `F-q` is counted at most `k` times: `k` times if
it lies in `H`, once if it contains exactly one vertex of `B`, and zero times
if it contains at least two. Therefore the same pair count is at most `kh`,
which proves (1). Since `i_k(F)=h+a`, (2) follows as in the connected case.

## Rank-eight corollary

For every forest and every `n>=20`,

```text
i_7(F-q)/i_7(F) >= (n-19)/(n-12).
```

At `n=28` the universal floor is `9/16`. Thus the stronger live root
coordinate used in the connected rank-eight tensor calculations is also
valid without any connectedness assumption.

## Scope

This strengthens the root-deletion coordinate theorem from trees to all
forests. It supplies a reusable all-forest inequality but does not by itself
establish connected `Q8`, forest `Q8`, rank-eight PGC, or Problem 993.

## Independent literal audit

The audit imports no producer code. It constructs every unlabeled forest
through order 9 as a multiset of unlabeled tree components, then reconstructs
every far forest and its zero-or-one attachment structure. Across 308 forests,
2,452 roots, and 10,533 active rank/root cells it checks 100,855 selected sets,
69,725 downward-incidence sources, every injection target, every boundary hit,
and every literal extension. A separate include/exclude DP checks 1,072 roots
in larger disconnected rank-seven families. All inequalities pass strictly at
the minimum-slack witnesses.

```text
audit_rank8_forest_root_deletion_attachment_floor_root.py
C88562683F5B3C13464B2560F623EF7445C86FEBE6ABE5C8551E21C7998B3AAD

rank8_forest_root_deletion_attachment_floor_independent_audit_root_20260825.json
81A2E3CE64F3CC2E35270078FB0CB6F5332AE35659DB2748D09E816F5BABFCA1
```
