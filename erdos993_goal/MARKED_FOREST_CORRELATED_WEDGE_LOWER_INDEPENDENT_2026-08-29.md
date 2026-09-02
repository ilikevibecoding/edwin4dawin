# Marked-forest correlated wedge lower bound

Date: 2026-08-29

Status: **independent exact structural lemma.**

## Statement

Let `G` be a forest of order `N+1` with `h+1` components, exactly `z` of
which are isolated.  Mark a vertex `w` in a nontrivial component.  Write

```text
d = deg_G(w),
R = sum_(u~w) (deg_G(u)-1),
W = sum_v C(deg_G(v),2).
```

Then

```text
W >= C(d,2)+R+L_z,
L_z = N-2h+z-d-R.                                  (1)
```

In the no-isolate structural cone, `z=0`, so this is

```text
W >= C(d,2)+R+L,
L = N-2h-d-R.                                      (2)
```

## Proof with the complete component budget

Orient the marked tree away from `w`.  For every nonroot vertex put
`x_v=deg(v)-1`, its number of children.  The root contributes `C(d,2)`.
The root neighbors have total child count `R`, and

```text
C(x+1,2)=x+C(x,2)>=x,
```

so together they contribute at least `R`.  If `t` is the total child count
at vertices farther from `w`, those vertices contribute at least `t`.

There are `h-z` other nontrivial components.  A tree with `e` edges obeys

```text
sum_v C(deg(v),2)
 = e-1 + sum_v C(deg(v)-1,2)
 >= e-1.                                           (3)
```

Isolated components contribute zero and are counted separately by `z`.
Since `G` has `N-h` edges, the other components have

```text
E_other=N-h-d-R-t
```

edges.  Their contribution is at least `E_other-(h-z)`.  Adding all parts,

```text
W >= C(d,2)+R+t+E_other-(h-z)
  = C(d,2)+R+N-2h+z-d-R,
```

which is (1).  Every component, including every isolate, appears in this
budget.

## Sharpness

For `R=t=0`, take the marked component to be a `d`-star, take `z` isolated
components, and make every other nontrivial component a path.  If their
total edge count is `E_other`, the vertex count is exactly

```text
(d+1)+z+E_other+(h-z)=N+1,
```

and equality holds in (1).  Thus the added `L_z` term cannot be discarded.

The terminal proof program may alternatively strip permanent isolates using
the already pinned isolate-shift theorem; the no-isolate cone then uses (2).

## Replay and scope

Run

```powershell
$env:PYTHONHASHSEED='0'
python prove_marked_forest_correlated_wedge_lower_independent_agent.py
```

The verifier checks the component-budget identity, both local wedge
identities, the sharp construction's vertex budget, and its equality case.

This is only a structural lemma.  It does not prove the terminal `m=1`
branch cover, `m=0`, the full payment, unimodality, or Erdős Problem 993.
