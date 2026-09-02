# Terminal q3 Newton m=0: hub-distance-three double-broom middle targets

Date: 2026-08-31

For the sorted hub-distance-three double broom `T_(a,b,3)`, with
`a>=b>=2`, this certificate closes

```text
4<=j<=b+2.
```

Put `n=a+b`, normalize by `B=C(n,j-1)`, and define

```text
rho=C(a+1,j-1)/B,
tau=C(b+1,j-1)/B,
u_a=(a+1)/n,
u_b=(b+1)/n.
```

The exact terminal margin is affine in `(rho,tau)`.  The actual weights lie
in the triangle

```text
rho>=0, tau>=0, rho/u_a+tau/u_b<=1.             (1)
```

Indeed, putting `r=j-2>=2`, cancellation of one sampled vertex gives

```text
rho/u_a+tau/u_b
 =[C(a,r)+C(b,r)]/C(a+b-1,r).
```

Choose two subsets of an `(a+b-1)`-element universe, of sizes `a` and `b`,
whose intersection is one point.  Since `r>=2`, an `r`-subset cannot lie in
both, so the two numerator families are disjoint.  Equivalently, Vandermonde
gives the explicitly nonnegative difference

```text
C(a+b-1,r)-C(a,r)-C(b,r)
 =(b-1)C(a-1,r-1)
   +sum_(i=1)^(r-2) C(a-1,i)C(b,r-i).
```

At the three vertices `(0,0)`, `(u_a,0)`, `(0,u_b)`, the exact margin has
coefficientwise-positive numerators with 350, 530, and 515 monomials,
respectively.  Their minimum coefficients are 1, 2, and 1.  Affinity then
proves positivity throughout (1).

Together with the separately frozen `j>=b+3` tail and universal `j=3`
boundary, this supplies every target for the family.  This file alone proves
only the displayed middle range; the all-target conclusion is a separate
fail-closed assembly.

Replay:

```powershell
python .\prove_terminal_q3_m0_marked_isolate_hub_distance3_double_broom_middle_all_order_root.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE3_DOUBLE_BROOM_MIDDLE_ROOT
```
