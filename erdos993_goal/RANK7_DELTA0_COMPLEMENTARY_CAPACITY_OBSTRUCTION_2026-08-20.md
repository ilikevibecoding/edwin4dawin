# Exact rank-seven `Delta0` obstruction to the two scalar capacities

Date: 2026-08-20

Status: **EXACT ENCLOSURE FAILURE; NOT A TREE COUNTEREXAMPLE.**

The two complementary capacities that close `Delta1` and `Delta2` do not by
themselves close `Delta0`.  At

```text
n=27, r=1, m=25,
z=2/7, q6=8/49,
s=83/133, d=765/931,
```

the containment face is active because

```text
s=83/133 < 21/26=(m-4)/(m+1),
b/c6=sz=166/931 < 60/133=z(m-4)(1-s)/5.
```

The point lies in the retained rank-zero `z,q6` boxes and satisfies
`d>1/2`, yet the exact normalized coefficient is

```text
Delta0/c6^4 = -5839259504/806954491 < 0.
```

This proves only that the path/root-mass floor, half retention, and

```text
b <= min((m-4)a/5,h5)
```

form an insufficient scalar enclosure.  It is not a tree counterexample.
In particular, retaining the bad-set incidence coupling between `i4(J)` and
`i5(J)` excludes this first fake corner, but a sharpened feasible scalar row
still requires a more literal local/core placement constraint.  No rank-zero
positivity theorem is claimed here.

Replay:

```powershell
python .\verify_rank7_delta0_complementary_capacity_obstruction.py
```

SHA-256:

```text
verify_rank7_delta0_complementary_capacity_obstruction.py
685DE016A978717AC8E5F1E8224F386FCE97ECDB3C9F12A589A80C92D5B231B7

rank7_delta0_complementary_capacity_obstruction_exact_20260820.json
3BA89BB8956E1CF277BE0243B6DB94A798EC060A955A1F523B7064EC74A69CDB
```
