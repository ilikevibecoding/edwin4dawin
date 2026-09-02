# Rank-seven terminal-broom degree-correlation lower bound for `c4`

Date: 2026-08-17

Status: **proved exact reduction; not yet a positivity theorem for the
remaining `B2>=6` band**.

## Result

Put `x_v=deg(v)-1`, `M=max_v x_v`, and

```text
E=sum_(uv in E(T)) x_u x_v.
```

Root the tree at a vertex with excess degree `M` and orient every edge
away from that root.  Every non-root vertex has one parent, and

```text
x_parent x_v <= M x_v.
```

Because `sum_v x_v=n-2`, summing the oriented-edge bounds proves

```text
E <= M(n-2-M).                                      (1)
```

Combining (1) with the exact tree identity

```text
c4=C(n-3,4)+(n-5)B2-B3-(E-(n-3))
```

gives, for each excess-degree partition,

```text
c4 >= C(n-3,4)+(n-5)B2+(n-3)-B3-M(n-2-M).          (2)
```

At a fixed integer `B2`, enumerate the integer partitions of `n-2` and
maximize `B3+M(n-2-M)`.  Thus

```text
c4 >= C(n-3,4)+(n-5)B2+(n-3)
      -max_partitions [B3+M(n-2-M)].                (3)
```

This is a degree-sequence certificate, not a tree or root census.

## Exact removed failure

After adding the preceding joint `c5/c4/B3` lower bound, a further exact
relaxed-domain failure occurs at

```text
n=23, r=1, B2=50,
c3=1380, c4=5508, c5=14547,
c6=42477613/1836,
c7=2291964564641/76687884,
a=33865/11, b=115141/11.
```

It satisfies the retained rank endpoints, fixed-`e(J)` incidence,
root-neighbor branching constraint, joint `b` interval, the new `c5`
lower, and the previous `c4` upper.  Its exact `Delta^0` is negative.  It
is an enclosure failure, not a tree counterexample.

For `n=23,B2=50`, the exact partition table gives

```text
max [B3+M(21-M)] = 231,
```

attained by the excess partition

```text
(10,3,2,2,1,1,1,1).
```

Formula (3) therefore requires `c4>=5534`, excluding the point by `26`.

## Remaining obligation

Insert (3), together with the joint `c5/c4/B3` lower, into the rooted
endpoint cone and certify all seven low terminal-broom coefficients for
`23<=n<=38,B2>=6`.  No final positivity claim is made here.

## Replay

```powershell
python .\verify_rank7_terminal_broom_c4_degree_correlation_lower.py
```

The replay writes
`rank7_terminal_broom_c4_degree_correlation_lower_exact_20260817.json`.
