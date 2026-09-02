# Rank-four ceiling for fixed-order/component linear forests

Date: 2026-08-29

Let `K` be a linear forest on `T` vertices with `Y` components.  Write
`E=T-Y` for its edge count, `Z` for its number of nontrivial components,
and `s` for its number of one-edge components.  If `E>0`, then

```text
wedges(K)=E-Z,
P4(K)=E-2Z+s.
```

Inclusion-exclusion over the edges of a four-set is exact after triples:

```text
i4(K)=C(T,4)-E C(T-2,2)+C(E,2)+(E-Z)(T-4)-(E-2Z+s).   (1)
```

Indeed, an adjacent edge pair lies in `T-3` four-sets, a disjoint pair in
one, and the only three-edge union on at most four vertices is a copy of
`P4`.  Combining the pair terms gives (1).

Compare (1) to the one-long-component forest

```text
Kstar=P_(E+1) disjoint union (Y-1) K1.
```

For `E>1`, its parameters are `Z=1,s=0`, and hence

```text
i4(K)-i4(Kstar)=(Z-1)(6-T)-s.                         (2)
```

For `T>=6`, (2) is nonpositive termwise.  The `E=1` case is unique.  Orders
`T<=3` have no rank-four set.  At `T=4,5`, all feasible `(Y,Z,s)` cases are
checked exactly (equivalently: at `T=5`, `Z=2` forces `s>=1`; at `T=4`,
`Z=2` forces `s=2`).  Therefore, for every order,

```text
i4(K) <= [x^4] (1+x)^(Y-1) P_(T-Y+1).                (3)
```

This is an all-order structural lemma.  The bounded audit independently
replays 81155 path-length multisets through
`T=35`; it is diagnostic evidence, not the basis of the unbounded proof.
The lemma supplies only the rank-four K ceiling needed by the conditional
`d=1,j=5` terminal-m0 lane.  It does not prove that lane or any global
terminal statement.
