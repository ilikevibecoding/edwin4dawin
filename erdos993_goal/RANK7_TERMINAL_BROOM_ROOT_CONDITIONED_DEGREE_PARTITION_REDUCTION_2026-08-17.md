# Rank-seven terminal-broom root-conditioned degree-partition reduction

Date: 2026-08-17

Status: **proved exact reduction; not yet a positivity theorem for the
remaining `B2>=6` band**.

## Root-capacity constraint

For a rooted tree `(A,q)`, put

```text
r=deg(q),
x_u=deg(u)-1 for u in N(q).
```

The vertices `q` and `u in N(q)` are distinct.  Therefore the global
positive excess-degree partition of `n-2` contains, with multiplicity,

```text
{r-1 if r-1>0} union {x_u:x_u>0}.                (1)
```

This elementary containment is the exact root-capacity constraint missing
from the separately minimized degree-moment cone.

For each fixed integer `n,B2,r` and neighbor profile `(x_u)`, enumerate
only the partitions satisfying (1).  On every retained partition use

```text
E<=M(n-2-M)
```

and the exact values of `B3` and `M`.  This gives a root-conditioned `c4`
floor and a compatible `B3` input for the joint `c5/c4/B3` lower bound.

## Exact diagnostic cell

At

```text
n=23, B2=50, r=1, e(J)=17,
```

the unique neighbor has `x=m-e(J)=4`.  The unconditioned `c4` floor `5534`
is witnessed by

```text
(10,3,2,2,1,1,1,1),
```

which contains no part `4` and is therefore impossible for this rooted
profile.

The compatible partitions are

```text
(9,4,4,2,2),
(8,6,4,2,1),
(8,5,4,4).
```

Their sharp root-conditioned floor is

```text
c4>=5565,
```

witnessed by `(9,4,4,2,2)`.

The replay preserves an exact fixed-`e(J)` relaxed point at `c4=5534`
whose `Delta^0` is negative and verifies every preceding scalar endpoint.
It is not a tree counterexample.  Constraint (1) excludes it by `31`.

## Remaining obligation

The high-branching endpoint cone should split the exact integer neighbor
profiles, use their root-conditioned degree-partition rows, and certify the
seven low terminal-broom coefficients over all remaining cells.  No final
positivity claim is made here.

## Replay

```powershell
python .\verify_rank7_terminal_broom_root_conditioned_degree_partition.py
```

The replay writes
`rank7_terminal_broom_root_conditioned_degree_partition_exact_20260817.json`.
