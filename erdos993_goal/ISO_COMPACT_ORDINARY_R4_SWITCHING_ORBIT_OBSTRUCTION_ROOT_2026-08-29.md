# Exact obstruction to orbit-by-orbit positivity at ordinary rank four

## Result

The coupled ordinary rank-four gap has an exact ordered-independent-pair
expansion.  Grouping each pair over every color switch of every connected
component of its symmetric difference does **not** make the individual
complete orbits nonnegative.

This remains false even after exploiting every orientation freedom in the
commutative \(C\!\times C\) products.  The finite linear system has 29 such
orientation variables and 38 distinct orbit inequalities.  It is infeasible
even when the variables are allowed to be arbitrary real numbers.  The
irreducible infeasible core is a single realizable orbit whose orientation
vector is identically zero and whose sum is \(-20\).

## Realizable orbit

Let \(D\) be a three-leaf star with center 3 and leaves 1,2,4, together with
an isolated vertex 0:

```
(1,3), (2,3), (3,4).
```

Mark \(u=0,v=3\), take no support neighbors in \(D\) (so \(T=\varnothing\)
and \(H=C\)), and adjoin a disjoint support-leaf edge \(5-6\).  The ordinary
leaf is \(z=6\) with support \(s=5\).  Here \(\alpha(W)=3\), so rank four is
inside the still-open non-top-collar domain.

Starting from the ordered independent pair
\((\{0,1,2,4\},\{3\})\), the complete switching orbit is

```
({0,1,2,4},{3})
({0,3},{1,2,4})
({1,2,4},{0,3})
({3},{0,1,2,4}).
```

Its exact coupled weight is \(-20\), independent of all product orientations.
The whole forest cell is nevertheless positive:

\[
G_4=838.
\]

The verifier reconstructs the full cell by summing all ordered-pair weights
and obtains exactly 838.  Thus other switching orbits are essential.

## Scope

This refutes only a proof that demands every complete Bencs-style switching
orbit be nonnegative on its own.  It does not refute the coupled ordinary
gap or rank-four FML.  A successful orbit proof would need an additional
inter-orbit shadow/payment grouping.

## Replay

Run

```powershell
python probe_iso_compact_ordinary_r4_switching_orbit_root.py
```

The terminal marker is
`PROBE_EXACT_ISO_COMPACT_ORDINARY_R4_SWITCHING_ORBIT`.
