# Rank-seven terminal-broom joint branching-surplus reduction

Date: 2026-08-17

Status: **proved reduction and exact obstruction; not a proof of the
remaining terminal-broom bridge**.

The target is the finite band

```text
23 <= |A| <= 38,  B2(A) >= 5,
```

for the seven low terminal-broom Newton coefficients.  This note couples
the core `A`, the deletion forest `H=A-q`, and
`J=A-N[q]`.  It preserves two exact failures which show why the present
reduction must not be promoted to a positivity theorem.

## 1. Notation

Put

```text
n=|A|, r=deg_A(q), m=|J|=n-r-1,
c_k=i_k(A), a=i_4(J), b=i_5(J),
h_5=c_5-a, h_6=c_6-b,
B2(A)=sum_v C(deg_A(v)-1,2).
```

Write

```text
E4=C(m,4)-a, E5=C(m,5)-b
```

for the numbers of non-independent four- and five-subsets of `J`.

## 2. Two exact incidence couplings

Count pairs consisting of a bad four-set and a bad five-set containing it.
Every bad four-set has `m-4` five-set extensions.  A bad five-set has at
least three bad four-subsets (keep one fixed induced edge and delete any of
the other three vertices), and at most five.  Therefore

```text
(m-4)E4/5 <= E5 <= (m-4)E4/3.                 (1)
```

Equivalently,

```text
C(m,5)-(m-4)(C(m,4)-a)/3 <= b
 <= C(m,5)-(m-4)(C(m,4)-a)/5.                (2)
```

This is valid for every graph `J`.  Both fiber constants are sharp.

There is a second coupling because `J` is a forest.  If `e=e(J)`, count
edge--bad-four-set incidences.  Every edge lies in `C(m-2,2)` four-sets,
while a bad four-set in a forest induces between one and three edges.
Hence

```text
E4 <= e C(m-2,2) <= 3E4.                     (3)
```

Thus the rank-four defect traps the integer `e(J)`.

## 3. Root-preserving branching lower bound

For each neighbor `u` of `q`, let

```text
x_u=deg_A(u)-1.
```

Removing `N[q]` leaves `sum_u x_u` components, so forest acyclicity gives

```text
sum_u x_u=m-e(J).                             (4)
```

The contributions of `q` and its neighbors to `B2(A)` are
`C(r-1,2)+sum_u C(x_u,2)`.  Passing from `A` to `J` only decreases the
remaining vertex contributions.  Consequently

```text
B2(A) >= C(r-1,2)+sum_u C(x_u,2)+B2(J)
      >= C(r-1,2)+Phi_r(m-e(J)),              (5)
```

where `Phi_r(s)` is the exact balanced integer minimum.  If
`s=ru+v`, `0<=v<r`, then

```text
Phi_r(s)=(r-v)C(u,2)+vC(u+1,2).               (6)
```

Indeed, replacing a pair `(x,y)` with `(x-1,y+1)` when `x>=y+2` lowers
the sum of binomial terms by `x-y-1>0`.  Equations (3)--(6) are the desired
root-preserving branching/defect coupling.

## 4. The valid joint interval for `b=i_5(J)`

The proved sharp forest rank-(4,5) ratio applies to `J` when `m>=18`, and
ordinary extension counting applies to both `J` and `H`.  Intersecting
these with (2) gives

```text
b >= max(
  ((m-7)(m-8)/(5(m-3)))a       [only if m>=18],
  C(m,5)-(m-4)(C(m,4)-a)/3,
  c6-(n-6)(c5-a)/6,
  0),

b <= min(
  (m-4)a/5,
  C(m,5)-(m-4)(C(m,4)-a)/5,
  c5-a,
  c6).                                           (7)
```

The third upper candidate is the literal induced-subgraph containment
`J subset H`, so `i5(J)<=i5(H)`.

No rank-(5,6) path-ratio bound for `H` is used.

The quantitative core branching surplus remains available:

```text
5(n-3)c5-(n-7)(n-8)c4
 >= ((n^3-8n^2-19n+302)/6) B2(A).              (8)
```

## 5. Exact endpoint reduction

After substituting `h5=c5-a` and `h6=c6-b`, every low coefficient
`Delta^k R_1`, `0<=k<=6`, is quadratic and strictly concave in `b`.
The exact second derivatives are

```text
k=0: -4c6(a+47c5+48c6)
k=1: -192c6(c4+c5)
k=2: -192c6(c3+c4)
k=3: -192c6(c2+c3)
k=4: -192c6(c2+n)
k=5: -192c6(n+1)
k=6: -192c6.
```

Therefore a coefficient minimum over the feasible interval (7) occurs at
one of its active affine endpoints.  This is an exact reduction, not a
positivity result.

## 6. Exact rooted-tree audit

The WROM audit generated every free tree of orders 18, 19, and 20 and
checked every root using integer arithmetic.  It checked (1), (3), (5),
(7), and (8) wherever their hypotheses apply.

| orders | free trees | rooted checks | failures |
|---|---:|---:|---:|
| 18--20 | 1,264,887 | 24,732,051 | 0 |

This audit is supporting exact data; the incidence and smoothing arguments
above are the all-order proofs.

## 7. Preserved failures

### 7.1 False shifted forest ratio

It is invalid to shift the proved rank-(4,5) forest ratio to `h6/h5`.
The exact forest

```text
H=P9 disjoint union P9
```

has `h5=2232`, `h6=2083`, and

```text
5(18-3)h6-(18-7)(18-8)h5=-89295<0.
```

This shortcut was detected and removed before packaging.

### 7.2 The corrected joint cone is still insufficient

Even (1)--(8) do not control the higher core moments tightly enough.  The
following exact abstract point satisfies the retained scalar endpoints:

```text
n=23, r=1, m=21, B2=210,
a=C(21,4), b=C(21,5),
c3=1540, c4=15015/2, c5=20748,
c6=380912/11, c7=74032968/1573.
```

At this point

```text
Delta^0 R_1
=-19937921223556997181844848/2474329 < 0.       (9)
```

This is **not** a tree counterexample: `c4` is already nonintegral.  It is
an exact enclosure failure.  It shows that a final analytic bridge must
retain a higher-moment relation between the local branch profile and the
core ranks `c4,c5,c6`.

The sharp next candidate is the exact tree identity expressing `c4` through
`B2`, `B3=sum_v C(deg(v)-1,3)`, and
`E=sum_{uv in E(A)}(deg(u)-1)(deg(v)-1)`, followed by a rooted lower bound
on `B3+E` from the same `x_u` profile and the forest `J`.  The scalar
`B2` reserve alone cannot supply that information.

## 8. Replay

Run

```powershell
python .\verify_rank7_terminal_broom_joint_branching_surplus.py
rustc -O --target x86_64-pc-windows-gnu `
  .\verify_rank7_joint_branching_surplus_tree_audit.rs `
  -o .\verify_rank7_joint_branching_surplus_tree_audit.exe
.\verify_rank7_joint_branching_surplus_tree_audit.exe 18 20
```

The symbolic replay writes
`rank7_terminal_broom_joint_branching_surplus_exact_20260817.json`.

The exact artifact hashes are recorded in
`rank7_terminal_broom_joint_branching_surplus_sha256_20260817.json`.
