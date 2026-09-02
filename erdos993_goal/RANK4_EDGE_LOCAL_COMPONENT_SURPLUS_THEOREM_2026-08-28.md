# Rank-four edge-local component-surplus theorem

Date: 2026-08-28

Status: **proved for every finite tree, with an independent exact audit**.

## Statement

Let `T` be an `n`-vertex tree.  For an edge `uv`, put

```text
H_uv = T-(N[u] union N[v]),
h_uv = |H_uv| = n-deg(u)-deg(v).
```

Then every edge satisfies

```text
(n-2)(n-3)i3(H_uv) <= 4h_uv i4(T).                  (1)
```

Consequently, if `s4(T)` is the number of five-vertex sets inducing exactly
one edge, `m2(T)` is the number of two-edge matchings, and
`W=C(n-2,2)`, then

```text
W s4(T) <= 4m2(T)i4(T).                              (2)
```

This is an all-order theorem, not a finite-order extrapolation.

## 1. High endpoint-degree sum

Put

```text
c=deg(u)+deg(v)-2,       h=h_uv=n-c-2.
```

If `h<3`, then `i3(H_uv)=0`.  Assume `h>=3`.  Every `n`-vertex tree obeys
the elementary path-minimality bound

```text
i4(T) >= i4(P_n)=C(n-3,4),                            (3)
```

proved by the usual leaf deletion induction, and trivially

```text
i3(H_uv) <= C(h,3).                                   (4)
```

If `c>=3`, then `h<=n-5`.  Since `C(h,3)/h` is increasing, (1) follows
from its endpoint version.  After cancelling positive factors, that version
is

```text
(n-2)(n-6)(n-7) <= (n-4)(n-5)(n-6).
```

The right side minus the left side is exactly `6(n-6)`.  Here `h>=3`
forces `n>=8`, so the gap is positive.  This closes every edge with `c>=3`.

The only nontrivial residue is therefore

```text
c=1: (1,2),
c=2: (1,3) or (2,2).
```

The class `c=0` is the single edge of `K2`, where (1) is trivial.

## 2. Prescribed-root incidence lemma

The low-degree proofs use the following elementary lemma.  Let `H` be a
forest with one distinguished root in each component, orient each component
away from its root, and fix all independent `k`-sets of `H`.  Let `U` be the
total number of selected nonroots and `D` the total selected-degree sum.
Then

```text
D <= 2U.                                               (5)
```

Indeed, upward selected incidences are counted by `U`.  Inject every downward
incidence `p->z`, with `p` selected, into an upward incidence as follows.  If
`z` has no selected child, replace `p` by `z` and use `z->p`; otherwise use
the upward edge from the least selected child of `z` to `z`.  The first case
is recovered by swapping back, the second by the deterministic least-child
rule, and the two image types cannot collide.  Thus downward incidences are
at most upward incidences, proving (5).

For independent three-sets of an `h`-vertex forest, double counting
one-vertex extensions and using (5) gives

```text
4a4 >= (h-3)a3-D >= (h-3)a3-2U.                      (6)
```

## 3. Leaf--degree-two edges

Let `v` be a leaf, let `deg(u)=2`, and let `w` be the other neighbor of
`u`.  Delete `u,v,w` to obtain `H`, and delete from `H` the neighbors of `w`
to obtain `J`.  Write

```text
I(H;x)=sum a_j x^j,       I(J;x)=sum b_j x^j,
h=|H|=n-3.
```

Deleting along the terminal path gives

```text
I(T;x)=(1+2x)I(H;x)+x(1+x)I(J;x),
i4(T)=a4+2a3+b3+b2.                                  (7)
```

Root the components of `H` at the neighbors of `w`.  If `A_j` counts
independent three-sets containing exactly `j` roots, then

```text
b3=A0,
U=3A0+2A1+A2.
```

The exact nonnegative identity

```text
2a3+2b3+2b2-U = A0+A2+2A3+2b2 >=0                   (8)
```

combines with (6)--(7) to give

```text
4i4(T)
 >= (h+5)a3-2U+4b3+4b2
 >= (h+1)a3.                                          (9)
```

Since `h=n-3`, (9) is exactly (1) after cancelling `h`; when `h=0`, the
left side of (1) is already zero.

## 4. A two-root-group lemma

For the two `c=2` types, delete four boundary vertices and call the remaining
forest `H`.  Its components have distinguished roots split into two groups
`C1,C2`.  For an independent set `S` of `H`, put

```text
z(S)=|S intersect (C1 union C2)|,
r(S)=2-number of groups hit by S.
```

For independent three- and two-sets define

```text
Z=sum_(S in I3(H)) z(S),
X=sum_(S in I3(H)) r(S),
Y=sum_(S in I2(H)) [r(S)+C(r(S),2)].
```

Then

```text
2Z+4X+4Y >= 6a3.                                     (10)
```

To prove this, let `B=H-(C1 union C2)`.  Fix an independent `s`-set of
`B`, and let `x,y` be the numbers of compatible roots in the two groups.
Sum its contribution to the left side of (10) minus `6a3`, keeping the
rank-two shadow.  For `s=3,2,1,0`, respectively, the four pointwise slacks
are

```text
P3 = 2,
P2 = 12,
P1 = (x-y)^2+3(x+y),
P0 = 4[C(x,3)+C(y,3)+C(x,2)+C(y,2)].
```

All are nonnegative.  Summing over the independent sets of `B` proves (10).

The incidence lemma, now with `U=3a3-Z`, strengthens (6) to

```text
4a4 >= (h-9)a3+2Z.                                   (11)
```

## 5. Degree-two--degree-two and leaf--degree-three edges

For a `(2,2)` edge, let `p,q` be the two outer neighbors and delete the
edge endpoints together with `p,q` to obtain `H`.  Directly sorting by the
compatible choices of `p,q` gives

```text
i4(T)=a4+2a3+X+Y.                                    (12)
```

For a `(1,3)` edge, delete the leaf, its support, and the support's two other
neighbors.  The same decomposition has one additional lower-rank shadow
`L>=0`:

```text
i4(T)=a4+2a3+X+Y+L.                                  (13)
```

In either case, (10)--(13) imply

```text
4i4(T)
 >= (h-1)a3+2Z+4X+4Y
 >= (h+5)a3.                                          (14)
```

Here `h=n-4`.  For `h>0`,

```text
(n-2)(n-3)/h=(h+2)(h+1)/h=h+3+2/h <= h+5.
```

Thus (14) proves (1).  When `h=0`, `a3=0`.  This completes every endpoint
degree class.

## 6. Global assembly

Every token-sliding edge between independent four-sets has a unique tree
edge `uv` and a common independent three-set in `H_uv`; hence

```text
s4(T)=sum_(uv in E(T)) i3(H_uv).                      (15)
```

Also

```text
sum_(uv in E(T)) h_uv=2m2(T).                         (16)
```

Summing (1), using `(n-2)(n-3)=2W`, and applying (15)--(16) proves (2).

For the equivalent component form, put

```text
A3=sum_(S in I3(T)) |T-N[S]|,
C3=sum_(S in I3(T)) c(T-N[S]),
e=sum_v C(deg(v)-1,2).
```

Exact double counts give

```text
A3=4i4(T),       C3=A3-s4(T),       m2=W-e.
```

Therefore

```text
W C3-e A3 = 4m2(T)i4(T)-W s4(T) >=0.                 (17)
```

## Replayable evidence

Run

```powershell
python .\verify_rank4_edge_local_component_surplus_root.py
```

The producer symbolically rebuilds the high-degree endpoint gap and all four
two-group pointwise polynomials.  Its literal bounded audit reconstructs
every independent set, every local residual, the prescribed-root injection,
the token-sliding graph, the two-edge matchings, and both global margin forms.
The finite census is an audit of the all-order proof, not its justification.

Primary evidence:

- `verify_rank4_edge_local_component_surplus_root.py`
- source SHA-256
  `A20321C3AFE6D2B5AB7B474463F5C006FEC8E068E8739EC520C00DA1B424A9DF`
- `rank4_edge_local_component_surplus_exact_root_20260828.json`
- report SHA-256
  `5CE9555EEF8400D35C6A6233FA2B199C338E0C89BE5C830E8E39C887F744C87F`
- status
  `PASS_EXACT_ALL_ORDER_RANK4_EDGE_LOCAL_COMPONENT_SURPLUS_THEOREM`

Independent replay:

- `audit_rank4_edge_local_component_surplus_independent_agent.py`
- source SHA-256
  `AD02235331B8233A36754DF78970BD0E5FA3922220DEC17D89B03B7319191832`
- `rank4_edge_local_component_surplus_independent_audit_20260828.json`
- report SHA-256
  `8F2BEF58AD6ADAB96066B47EF8BFEAA494CD2E0433CCB7C4A2977F86643A08E4`
- status
  `PASS_INDEPENDENT_EXACT_ALL_ORDER_RANK4_EDGE_LOCAL_COMPONENT_SURPLUS_AUDIT`

The auditor did not import or execute the producer.  It independently rebuilt
the algebra, the prescribed-root injection, the degree-class partition, and
the global double counts.  Its fresh census matched all 5,446 trees through
order 14, all 66,698 edges, and the producer's ordered value-stream SHA-256
`9A2A6AE764E2477ED8B7B01B0EA54B05979C47468AE787530B8206CF7A6D2F1C`.

## Scope boundary

This proves the rank-four averaged component-surplus inequality.  Because
`C(n-2,2) < i2(T)=C(n-1,2)`, it does **not** prove `q4<=q2`, `q4<=q3`, the
later-rank envelope, or Erdős Problem 993.  Those remain separate obligations.
