# One-long-component coefficientwise ceiling for linear forests

Date: 2026-08-29

Write `P_n` for the independence polynomial of the n-vertex path, with the
boundary convention `P_-1=1`.  For every `a,b>=2`, the path recurrence gives

```text
P_(a+b-1) P_1 - P_a P_b = x^3 P_(a-3) P_(b-3).       (1)
```

Both sides of (1) satisfy `X_n=X_(n-1)+xX_(n-2)` in each unbounded index;
the four bases `(a,b) in {2,3}^2` are exact.  Hence (1) is all-order and
its right side is coefficientwise nonnegative.

Let `K` be any linear forest on `T` vertices with `Y` components.  If two
components are nontrivial paths of orders `a,b`, replace them by a path of
order `a+b-1` and one isolated vertex.  This preserves both `T` and `Y`, and
(1), multiplied by all untouched component rows, says every coefficient can
only increase.  Repeating leaves at most one nontrivial component.  Thus

```text
I(K;x) <=coeff (1+x)^(Y-1) P_(T-Y+1).                 (2)
```

The edgeless case is equality.  Equation (2) is simultaneous in every rank;
it upgrades the previously frozen rank-four ceiling used for `d=1,j=5`.
The bounded audit checks 28628 path-length
multisets through `T=30`, but the unbounded proof is the repeated exact
identity (1), not finite extrapolation.

This is only a linear-forest row extremum.  It does not by itself prove the
all-rank `d=1` terminal-m0 sector or Erdos Problem 993.
