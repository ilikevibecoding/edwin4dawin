# Terminal q3 Newton m=0: hub-distance-three double-broom tail

Date: 2026-08-31

Let `T_(a,b,3)` be the tree whose two hubs are joined by a path of three
edges, with `a` pendant leaves at the first hub and `b` at the second.  Sort
the sides so that `a>=b>=1`.  This certificate closes every high target

```text
j>=b+3.
```

Put `n=a+b`.  Exact edge decomposition gives

```text
F(x)=(1+x)^n(1+2x)+x(1+x)^(a+1)+x(1+x)^(b+1)+x^2,

Z(x)=x^2[
  a(1+x)^(b+1)+b(1+x)^(a+1)
 +(1+x)^b+(1+x)^a+(1+x)^n+(n+2)x
].
```

Here `F` is the independence row and `Z` counts vertex sets inducing exactly
one edge.  The verifier independently reconstructs both rows by literal
subset enumeration on small members of the family.

Normalize every target row by `B=C(n,j-1)`, which remains positive through
the top target `j=n+1`.  In the stated tail the small-side weight vanishes,
and the exact margin is affine in

```text
rho=C(a+1,j-1)/C(n,j-1).
```

The lower endpoint `rho=0` has a coefficientwise-positive numerator with 338
monomials.  If `rho` is active, then `a>=j-2`.  For `b=1`, `rho=1` exactly;
the resulting numerator has 77 positive monomials.  For `b>=2`, interpret
`rho` as the probability that a uniformly chosen `(j-1)`-subset avoids the
`b-1` complementary vertices.  Consequently

```text
0<=rho<=(a+1)/n.
```

After the exact active-cone substitution

```text
b=2+r, j=b+3+y, a=j-2+s,
```

the upper endpoint numerator has 527 positive monomials.  Since the margin
is affine in `rho`, its positivity at both endpoints proves the complete
interval.  The anchor determinant independently has 21 positive monomials.

This proves only the high-target tail of this hub-distance-three family.
Its middle targets, other remainder forests, nonisolated marked roots, the
full terminal payment, and Erdős Problem #993 remain separate.

Replay:

```powershell
python .\prove_terminal_q3_m0_marked_isolate_hub_distance3_double_broom_tail_all_order_root.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE3_DOUBLE_BROOM_TAIL_ROOT
```
