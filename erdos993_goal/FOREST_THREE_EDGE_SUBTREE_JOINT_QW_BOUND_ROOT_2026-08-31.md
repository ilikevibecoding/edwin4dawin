# Forest three-edge-subtree joint `(Q,W)` bound

Date: 2026-08-31

## Theorem

Let `F` be a finite forest with no isolated vertices.  Write `N=|V(F)|`,
let `h` be its number of components, and put

```text
Q=N-2h,
W=sum_v binom(deg(v),2).
```

If `T` is the number of connected induced four-vertex subtrees, then

```text
3T <= (Q-1)W+1.                                      (1)
```

Equality holds precisely for `P4` plus any number of `K2` components, or
for the five-vertex tree with degree sequence `(3,2,1,1,1)` plus any number
of `K2` components.

There is also a sharper joint bound.  Put

```text
p=max_v(deg(v)-1),
B=W-Q=sum_v binom(deg(v)-1,2).
```

Then

```text
3T <= (p+1)B+3p(Q-p).                               (2)
```

## Weighted-forest proof

Put `x_v=deg(v)-1`.  Since there are no isolated vertices, `x_v>=0` and

```text
sum_v x_v=2|E|-N=N-2h=Q,
2W=sum_v x_v(x_v+1).
```

The connected four-vertex subtrees split according to whether they have a
three-valent centre or a middle edge:

```text
T=sum_v binom(x_v+1,3)+sum_(uv in E) x_u x_v.        (2)
```

Delete the vertices with `x_v=0`.  The remaining induced graph `H` is again
a forest, now with positive integer weights.  Substitution of (2) gives the
exact identity

```text
2((Q-1)W+1-3T)
 =2+sum_(u<v) x_u x_v(x_u+x_v+2)
    -6 sum_(uv in E(H)) x_u x_v.                    (3)
```

We prove the right side nonnegative by leaf deletion in `H`.  If a leaf of
weight `x` has neighbour of weight `y`, deleting it changes (3) by

```text
x y(x+y-4)+sum_(w other) x w(x+w+2).                (4)
```

When `x+y>=4`, (4) is nonnegative.  The only remaining positive-integer
pairs are `(1,1)`, `(1,2)`, and `(2,1)`.  Their first term is `-2`; if any
other vertex remains, even a weight-one vertex contributes at least `4`.
If no other vertex remains, the constant `2` in (3) pays the deficit exactly.
The one-vertex base has value `2`.  This proves (1) for every order.

Equality in the induction forces `H` to be one edge with weights `(1,1)` or
`(1,2)` up to order.  Restoring the zero-weight leaves gives exactly the two
families stated above; zero-weight `K2` components may be added freely.

For (2), the centred-star part of `T` obeys, for every `x_v<=p`,

```text
3 binom(x_v+1,3)=(x_v+1)binom(x_v,2)
                      <=(p+1)binom(x_v,2).
```

For the middle-edge part, root every component of `H`, choosing a vertex of
weight `p` as the root of its component.  Every nonroot edge contributes at
most `p x_v`; the total root weight is at least `p`.  Therefore

```text
sum_(uv in E(H)) x_u x_v <= p sum_(v nonroot)x_v <= p(Q-p).
```

Adding these two estimates proves (2).  It is exact both on linear trees
(`p=1,B=0`) and on stars (`p=Q,B=binom(Q,2)`), avoiding the large artificial
slack of a bound using only `(Q,W)`.

## Exact replay

```powershell
python .\prove_forest_three_edge_subtree_joint_qw_bound_root.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_FOREST_THREE_EDGE_SUBTREE_JOINT_QW_BOUND_ROOT
```

The verifier symbolically checks (3), exhausts the three exceptional leaf
pairs, and independently enumerates every no-isolate unlabeled forest through
order 11 to audit the motif identity and final inequality.  The enumeration
is a sanity audit; the all-order proof is the leaf induction above.

## Scope

This is a new all-order structural input for the marked-isolate terminal
Newton `m=0,j=3` seam.  It does not by itself prove that Newton coefficient,
the complete terminal payment, unimodality, or Erdős Problem #993.
