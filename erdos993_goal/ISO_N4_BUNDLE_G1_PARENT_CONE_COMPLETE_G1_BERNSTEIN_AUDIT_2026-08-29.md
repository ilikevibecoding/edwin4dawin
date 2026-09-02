# Exact parent-cone certificate for the canonical deepest-ordinary `g1` cell

## Result

Let `G` be a forest of order `n >= 3`, and let `u,v,p` be three distinct
vertices.  In the canonical deepest-ordinary singleton-parent bundle cell,
write the exact coefficient `g1` as

```text
g1 = high_motif_payment + parent_rooted_residual.
```

The high-motif payment was proved separately to be nonnegative.  The
parent-rooted residual is nonnegative for every such forest.  Consequently,
`g1 >= 0` in this canonical cell.

This does **not** cover a parent equal to a mark, a non-singleton support,
all bundle cells, all `N4`, or Erdős Problem #993.

## Exact reconstruction

The independent auditor starts from the upstream exact configuration formula,
subtracts the recorded high-motif block, and redoes the deletion `D=G-p` using

```text
e(D)       = e(G)-d(p),
W(D)       = W(G)-C(d(p),2)-x(p),
d_D(t)     = d_G(t)-1[pt is an edge],
x_D(t)     = x_G(t)-1[pt is an edge](d(p)-1)-|N(p) intersect N(t)|.
```

After Boolean reduction, the resulting 103-term polynomial agrees exactly
with both prior parent-rooted derivations (after renaming their symbols).  It
is also invariant under exchanging `u` and `v`.

## Monotone lower bound for `n >= 12`

The residual is increasing in the three neighbor-excess statistics and
decreasing in the three common-neighbor statistics.  The coefficient signs
follow from `e <= n-1`, `d(t) <= e`, and
`d(u)+d(v)-1[uv] <= e`.  In particular, with `n=12+m`, all elementary sign
margins are polynomials in `m` with nonnegative coefficients.

Every pair of vertices in a forest has at most one common neighbor.  For a
nonempty forest, put

```text
x_t = d(t)-1[d(t)>0],
r   = e-1-x_u-x_v-x_p.
```

If `c` is the number of nontrivial components, the total degree excess is
`e-c`, so `r` is the unselected excess plus `c-1` and is nonnegative.  Convex
concentration gives the exact wedge cap

```text
W(G) <= C(d(u),2)+C(d(v),2)+C(d(p),2)+C(r+1,2).
```

Dropping the positive excess terms, setting each common-neighbor count to its
upper bound one, and setting `W` to this cap therefore gives a genuine lower
bound for the residual.

## Simplex Bernstein certificate

Let `h=n-2-(e-1)`.  Then

```text
x_u+x_v+x_p+r+h = n-2.
```

At `n=12+m`, divide these five nonnegative parts by `10+m`.  The auditor
converts each resulting degree-three polynomial into the total-degree
Bernstein basis on the four-simplex.  It treats all 17 feasible branches:

```text
8 branches with no selected adjacency,
6 branches with one selected adjacency,
3 branches with two selected adjacencies.
```

There are 595 Bernstein coefficients.  Every coefficient is a polynomial in
`m` with nonnegative power coefficients.  Each of the 17 conversions is also
inverted symbolically and reconstructed exactly.  The smallest Bernstein
coefficient value at `m=0` is `1468`, so the relaxed residual is positive for
all real points of the simplex and every integer `m >= 0`.

The edgeless branch is handled directly:

```text
(n-1)(65n^3-89n^2-238n+192)/24 > 0  for n >= 3.
```

## Finite orders

An independent complete census generates every unlabeled forest of orders
`3..11` as a multiset of nonisomorphic tree components.  It checks all
unordered marked pairs and every distinct parent; the exact symbolic symmetry
under `u <-> v` covers the opposite ordering.

```text
unlabeled forests:      1,344
marked-parent cells:  526,680
negative residuals:         0
minimum residual:          14
```

Thus the finite census covers exactly the orders below the all-order cutoff;
it is not being promoted beyond that finite scope.

## Replay and hashes

Run:

```powershell
python -u audit_iso_n4_bundle_g1_parent_cone_complete_g1_bernstein.py
```

Expected terminal marker:

```text
PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G1_PARENT_CONE_COMPLETE_G1_BERNSTEIN
```

Frozen SHA-256 hashes of the final replayed files:

```text
7BEAE7422441A07491B27C7A979A3AB56E1DB436DC506ABBF503CB352C872BAE  audit_iso_n4_bundle_g1_parent_cone_complete_g1_bernstein.py
AA6149DB846DA052CAF61D6C1971EAC0C78A51188208C2474172148B735241C8  iso_n4_bundle_g1_parent_cone_complete_independent_audit_g1_bernstein_20260829.json
```

The report records the following exact dependency hashes:

```text
D12AF26B00E07D6EC223961607735274179179CF8F77EDA1BF6CA7C9F932AC4A  iso_n4_bundle_g1_deepest_configuration_exact_agent_20260829.json
F4F8765ED0195F905FF6534EBC2ED3FFFB45CA8AE92B962DCD0E7696522E066D  iso_n4_bundle_g1_parent_residual_exact_agent_20260829.json
10D2463434F69660A5FE34B35A149BB7808CD0EF4CD03A5A3EA236F195F86FC5  iso_n4_bundle_g1_parent_residual_root_20260829.json
```
