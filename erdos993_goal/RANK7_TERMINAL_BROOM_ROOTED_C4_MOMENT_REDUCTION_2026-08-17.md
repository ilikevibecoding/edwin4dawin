# Rank-seven terminal-broom rooted `c4` moment reduction

Date: 2026-08-17

Status: **proved exact reduction and exact surviving cone obstruction; not
a proof of the remaining bridge**.

This phase continues the joint `A,H=A-q,J=A-N[q]` reduction.  It removes
the earlier maximal-branching `c4` obstruction, but proves exactly that a
joint rank-five/connected-four-edge moment is still required.

## 1. Exact `c4` identity and conventions

For a forest of order `n` and size `e`, put

```text
W2=sum_v C(deg(v),2),
B3d=sum_v C(deg(v),3),
E=sum_(uv in E) (deg(u)-1)(deg(v)-1).
```

Inclusion-exclusion gives

```text
i4=C(n,4)-e C(n-2,2)+C(e,2)+(n-4)W2-B3d-E.       (1)
```

For a tree, use the project's branching curvature

```text
beta=B2=sum_v C(deg(v)-1,2),
B3x=sum_v C(deg(v)-1,3).
```

Then `W2=beta+n-2` and `B3d=beta+B3x`, so (1) becomes

```text
c4=C(n-3,4)+(n-5)beta-B3x-(E-(n-3)).             (2)
```

This convention distinction matters: inserting project `B2` directly for
`W2` in (1) is incorrect.

## 2. Rooted lower bound

Let `r=deg(q)` and `x_u=deg(u)-1` for `u in N(q)`.  The contributions of
`q` and its neighbors to `B3x`, and of the `q-u` edges to `E`, give

```text
B3x+E >= C(r-1,3)+sum_u C(x_u,3)+(r-1)sum_u x_u. (3)
```

If only `s=sum x_u` is retained, the middle sum is minimized by the
balanced integer vector.  The smoothing move `(x,y)->(x-1,y+1)` for
`x>=y+2` changes the sum by

```text
C(x-1,2)-C(y,2)>=0.                               (4)
```

Independently, every tree degree sequence is a nonnegative integer
partition of `n-2` by the excess degrees `deg(v)-1`.  The replay enumerates
these partitions for every `23<=n<=38` and tabulates the exact minimum
`B3x` at every feasible integer `B2`.  This is a degree-moment calculation,
not a tree/root census.

## 3. A further literal `H/J` coupling

Because `J` is induced in `H`,

```text
b=i5(J)<=i5(H)=c5-a.                              (5)
```

More precisely, partition independent five-sets of `H` by their nonempty
intersection with the independent neighbor set `N(q)`.  The one-neighbor
classes give

```text
c5-a-b >= sum_(u in N(q)) i4(J-N_H(u))
         >= sum_u C(m-x_u-3,4).                  (6)
```

The last step uses coefficientwise path minimality after connecting forest
components.  Its right side also has an exact balanced-vector minimum for
fixed `sum x_u`.  In the pure-cubic case `x_u in {0,1,2}`, and the only
nontrivial smoothing comparison is `(2,0)->(1,1)`.  Its exact slack is

```text
C(m-3,4)-2C(m-4,4)+C(m-5,4)=C(m-5,2)>=0,          (6a)
```

so the balanced minimum used by the certificate is theorem-grade.

## 4. Pure-cubic `B2=5`

For the two remaining pure-cubic skeletons, `B3x=0`.  If `p` is the number
of branch--branch skeleton edges subdivided at least once and `q` is the
number of branch--leaf edges subdivided at least once, then

```text
E=n+4-p+q,
c4=C(n-3,4)+5n-32+p-q.                            (7)
```

Numerical scouting at `n=23` over the larger rectangle
`0<=p<=4, 0<=q<=7`, every possible root degree `1<=r<=3`, both active
`b` endpoints, and every `Delta^0` through `Delta^6` found strictly
positive minima.  The smallest was about `4.24e16` for `Delta^0`.
This is encouraging evidence only; no Bernstein certificate is claimed.
The `V7` endpoint used in this cone is applicable because every `n`-vertex
tree has `alpha(A)>=ceil(n/2)>=12` throughout `n>=23`.

One difficult-looking boundary cell has now been upgraded from numerical
evidence to an exact adaptive Bernstein certificate:

```text
n=23, p=0, q=7, r=1, Delta^0.
```

Splitting on the integer `e(J)` leaves only `e=19,20`.  For each value, all
four lower and all four upper active-`b` branches pass.  The largest branch
uses 2,081 exact subdivision nodes.  This is a theorem for that one cell,
not yet the full `23<=n<=38` pure-cubic rectangle.  Its builder and replay
are `prove_rank7_pure_cubic_b2_5_joint_bernstein.py` and
`pure_cubic_b2_5_bernstein_sample_replay.txt`.

## 5. Exact surviving obstruction

The exact replay retains a rational point satisfying the current `c4`
degree-moment ceiling, the valid `b` interval, literal containment (5), and
the one-neighbor floor (6):

```text
n=23, r=1, m=21, B2=20,
X=3/5, A=18/35,
c3=1350,
c4=660405825/126742,
c5=808963450/63371,
c6=174766379848152800/9326700136611,
c7=498576747889676680586805200/22420241837616168579033,
a=3078,
b=550473141/63371.
```

Here the rank-four defect gives `e(J)>=17`, the one-neighbor floor is
`1001`, the exact degree-partition floor is `B3x>=8`, and `c4<=5217`.
Nevertheless,

```text
Delta^0 R_1
=-351187002469298268210333984402760558392851931849253033441359205888000
 /10680704562306040140379545783404548257660053199171741 < 0.          (8)
```

This is **not** a tree counterexample.  It is an exact failure of the still
relaxed moment cone.  It proves that (2)--(6) do not yet couple the core
rank-five count tightly enough.  The next required scalar is the exact
`c5` identity's connected four-edge-subtree term `V`, or an equivalent
exact decomposition of `B2` and the rank-five mass across `q` and `J`.

## 6. Exact audit and replay

The upgraded WROM audit verifies (1)--(5) on every root of every tree of
orders 18--20: `1,264,887` free trees and `24,732,051` rooted checks, with
zero failures.

```powershell
python .\verify_rank7_terminal_broom_rooted_c4_moment.py
rustc -O --target x86_64-pc-windows-gnu `
  .\verify_rank7_joint_branching_surplus_tree_audit.rs `
  -o .\verify_rank7_joint_branching_surplus_tree_audit.exe
.\verify_rank7_joint_branching_surplus_tree_audit.exe 18 20
```

The symbolic replay writes
`rank7_terminal_broom_rooted_c4_moment_exact_20260817.json`.
