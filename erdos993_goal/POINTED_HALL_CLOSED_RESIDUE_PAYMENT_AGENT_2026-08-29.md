# Independent closed-residue payment audit

Date: 2026-08-29

Status: **exact all-order proof and independent replay.**  Together with the
frozen Hall-excess decomposition, private-neighbor payment, and immediate-
superset payment, this closes the pointed boundary.  It also independently
validates the new all-forest weak-prefix-ratio theorem.  The separate `ISO`
inequality remains open, so this is not a proof of unimodality or Erdos
Problem 993.

## Closed hard rows are maximal independent sets

Fix a forest `G`, a maximum independent set `A` of size `alpha` avoiding the
point `p`, and let `C=V(G)-A`.  At either operative residue put

```text
r=ceil((2 alpha-1)/3),       e=alpha-r+1.
```

After the two earlier exact payments, a remaining Hall-boundary row is an
independent `Y subset C` containing `p` with

```text
|N_A(Y)|-|Y|=e,
```

at most one private `A`-neighbor of `p`, and no independent extension
`Y+z` having the same `A`-neighborhood.  Define

```text
B_Y=Y union (A-N_A(Y)).
```

Then `|B_Y|=alpha-e=r-1`.  Every vertex in `N_A(Y)` is dominated by `Y`.
If a vertex `z in C-Y` has no neighbor in `Y`, the absence of an immediate
covered extension forces `z` to have a neighbor in `A-N_A(Y)`.  Thus `B_Y`
is maximal independent.  Conversely, an immediate covered extension is
undominated by `B_Y`, so closedness is equivalent to maximality.  Finally
`B_Y intersect C=Y`, proving that `Y -> B_Y` is injective.

## The forest maximal-set bound

Let `m_k(F)` be the number of maximal independent `k`-sets in a forest.
For every `F,k`,

```text
m_k(F) <= 2^k.
```

This has a short induction.  An isolated vertex is forced into every maximal
independent set, so it reduces both the graph and the rank by one.  Otherwise
take a leaf `ell` with neighbor `q`.  Every maximal independent set contains
exactly one of `ell,q`, and deleting the forced selected vertex gives the
exact recurrence

```text
m_k(F)=m_(k-1)(F-{ell,q})+m_(k-1)(F-N[q]).
```

Induction bounds the two terms by `2^(k-1)`.  Hence the number of closed hard
rows is at most `2^(r-1)`.

## Empty-interval capacity and the collision reserve

The empty Boolean interval contributes

```text
r C(alpha,r)=e C(alpha,e).
```

If `alpha=3m`, then `r=2m`, `e=m+1`, and

```text
C(3m,m+1) >= C(2m,m) >= 4^m/(2m+1),
```

so the capacity is strictly larger than `4^m/2=2^(r-1)`.  If
`alpha=3m+2`, then `r=2m+1`, `e=m+2`, and

```text
C(3m+2,m+2) >= C(2m+1,m+1) >= 4^m/(m+1),
```

so the capacity is strictly larger than `4^m=2^(r-1)`.  Since the values
are integers, in both cases

```text
e C(alpha,e) >= 2^(r-1)+1.
```

The extra unit is necessary in the combined allocation: the earlier
private-neighbor payment uses the empty interval exactly when its boundary
set is `Y={p}`.  There is at most one such row.  Every other private-neighbor
target is nonempty and avoids `p`; every immediate-superset target contains
`p`.  Thus the remaining `2^(r-1)` units pay all closed hard rows with no
capacity collision.

This proves the required pointed boundary.  The separately frozen exact
leaf-boundary induction then proves the weak-prefix ratio for every finite
forest.

## Independent replay

Run

```powershell
python .\verify_pointed_hall_closed_residue_payment_agent.py
```

The verifier independently checks:

- 6,666 exact residue arithmetic cells through `alpha=10000`, with minimum
  reserve one at `alpha=2`;
- 546 literal leaf/isolate maximal-set recurrence rows and 547 `2^k` bound
  rows over all atlas forests including the empty forest;
- 181 pointed maximum-set decompositions, 22 negative boundary rows, all 18
  private-neighbor payments, all four closed rows, and every simultaneous
  positive-interval load;
- the exact closed/maximal equivalence and a pinned value stream.

Its marker is

```text
PASS_EXACT_ALL_ORDER_POINTED_HALL_CLOSED_RESIDUE_PAYMENT
```

Independent artifacts:

```text
verify_pointed_hall_closed_residue_payment_agent.py
  SHA256 B972F05DEA020B1EF58ED030C3CEB30A512B893EE78752DD57A60A5020482C86
pointed_hall_closed_residue_payment_exact_agent_20260829.json
  SHA256 DC9EE020D1C0D491A189396E69259CD64DB7F2F9B57976FFC7D97807F413CF7B
```

The independently audited root assembly is pinned as:

```text
assemble_pointed_hall_full_payment_forest_wr_root.py
  SHA256 F3B700E92EB0CD00B5894AB15648D008BABE0828851E035582F61A9A10311215
pointed_hall_full_payment_forest_wr_exact_root_20260829.json
  SHA256 B5363CE23A80DA7161DAE1DECC0BA78C99F35C074E42B96614454D9071EC6F85
POINTED_HALL_FULL_PAYMENT_AND_FOREST_WR_THEOREM_2026-08-29.md
  SHA256 09F9C5424966D7BC50C44C7BB4D92FFBB37CF4D4639DBF1791374F05C27B8996
```

Root marker:

```text
PASS_EXACT_POINTED_HALL_FULL_PAYMENT_AND_FOREST_WEAK_PREFIX_RATIO
```
