# Pointed Hall payment from private neighbors of the marked vertex

Date: 2026-08-29

Status: **exact partial payment.**  Every exact Hall-boundary set for which
the marked vertex has at least two private maximum-set neighbors is paid
injectively by a distinct positive nonpointed Boolean interval.  The boundary
sets with at most one private neighbor remain open.

Fix a forest `G`, a maximum independent set `A` of size `alpha` avoiding the
marked vertex `p`, and put `C=V(G)-A`.  At rank `r`, let `Y` be an independent
subset of `C` containing `p`, and write

```text
y=|Y|,  d_Y=|N_A(Y)|,  e_Y=d_Y-y.
```

The negative pointed intervals are exactly those with

```text
e_Y=alpha-r+1,                                    (1)
```

and each contributes `-1` to

```text
r i_r(G)-h_(r-1,p)(G).
```

Put `Z=Y-{p}`, `d_Z=|N_A(Z)|`, and

```text
delta(Y)=d_Y-d_Z=|N_A(Y)-N_A(Z)|.
```

The `C`-part `Z` does not contain `p`, so its Boolean interval contributes
only positive `r i_r` mass.  Using (1), that contribution is exactly

```text
r C(alpha-d_Z,r-|Z|)
 = r C(r-y-1+delta(Y),r-y+1).                     (2)
```

It is nonzero exactly when `delta(Y)>=2`; in that case it is at least `r`.
The map `Y -> Y-{p}` is injective, so distinct negative boundary sets with
`delta>=2` use distinct positive intervals.  Allocating one unit from each
of those intervals pays all of them without double counting.

Thus the remaining pointed Hall payment may be restricted exactly to

```text
delta(Y)<=1.                                      (3)
```

There is also a forest-specific structural consequence.  Every nonprivate
neighbor `a in N_A(p)` has a witness `c in Y-{p}` adjacent to `a`.  One
witness cannot cover two different neighbors of `p`, because the four edges

```text
p-a-c-a'-p
```

would form a cycle.  Therefore

```text
deg_A(p)-delta(Y) <= |Y|-1.                       (4)
```

In particular, every remaining hard set in (3) satisfies `deg_A(p)<=|Y|`.
This is a strict structural narrowing of the full Hall boundary, but it is
not yet a payment for the hard sets.

Replay:

```powershell
python .\verify_pointed_hall_private_neighbor_payment_root.py
```

The verifier checks (1)--(4), the injective allocation, and every eligible
pointed maximum-set decomposition in the NetworkX forest atlas.  The bounded
replay audits the identities only; it does not prove the remaining hard
payment, WR, ISO, unimodality, or Erdos Problem 993.

