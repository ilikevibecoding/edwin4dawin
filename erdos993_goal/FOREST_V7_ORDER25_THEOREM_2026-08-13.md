# An all-forest large-order theorem for the rank-seven residual

Date: 2026-08-13

Status: **proved all-order theorem for every forest of order at least
25, with an exact replay**.  Together with the previous exhaustive
census through order 20, this reduces the required `alpha>=12` range
for the rank-seven residual to orders 21--24.  It is not by itself a
complete proof of rank-seven PGC or of Erdős Problem 993.

## Theorem

For every forest `F` of order `n>=25`,

\[
 \boxed{V_7(F):=9i_5(F)i_6(F)+105i_5(F)i_7(F)-72i_6(F)^2\geq0.}
\tag{1}
\]

In fact the proof is uniform for `n>=26`; order 25 has a short
quantitative split and 49 elementary exceptional trees.

## 1. The discrete two-extension lemma

Fix an independent `k`-set `S` of a forest `F`, and put

\[
 X(S)=|V(F-N[S])|,\qquad
 Y(S)=i_2(F-N[S]).
\]

Double counting gives

\[
 \mathbb E X=(k+1)\frac{i_{k+1}}{i_k},\qquad
 \mathbb E Y=\binom{k+2}{2}\frac{i_{k+2}}{i_k}.
\tag{2}
\]

A forest on `q` vertices has at most `q-1` edges when `q>0`, so

\[
 Y\geq h(q),\qquad
 h(0)=h(1)=h(2)=0,\quad h(q)=\binom{q-1}{2}\ (q\geq3).
\tag{3}
\]

The integer first differences of `h` are

```text
0,0,1,2,3,...,
```

so its piecewise-linear interpolation `Phi` is convex.  Therefore,
for `t=E X`,

\[
 \boxed{\mathbb E Y\geq\Phi(t).}
\tag{4}
\]

Equivalently, if

\[
 \mu_k=(k+1)i_{k+1}/i_k,
\]

then

\[
 \boxed{\mu_{k+1}\geq\frac{2\Phi(\mu_k)}{\mu_k}.}
\tag{5}
\]

For `t>=2`, the weaker but smooth bound

\[
 \Phi(t)\geq\frac{(t-1)(t-2)}2
\tag{6}
\]

will also be useful.

## 2. The uniform proof for orders at least 26

The already proved sharp forest rank-`(4,5)` path-ratio theorem gives

\[
 \mu_4=5i_5/i_4
 \geq t_n:=\frac{(n-7)(n-8)}{n-3}.
\tag{7}
\]

Apply (5) at rank four and use (6):

\[
 \mu_5=6i_6/i_5\geq \mu_4-3+2/\mu_4.
\tag{8}
\]

At `n=26`, the endpoint in (7) is `342/23`, and the endpoint in (8)
is

\[
 \frac{47212}{3933}>12.
\tag{9}
\]

Both endpoint functions are increasing thereafter.  For a uniform
independent five-set, write

\[
 \mu=6i_6/i_5,\qquad z=21i_7/i_5.
\]

Then

\[
 \frac{V_7}{i_5^2}=\frac32\mu+5z-2\mu^2.
\tag{10}
\]

Another application of (4), followed by (6), gives

\[
 \frac{V_7}{i_5^2}
 \geq\frac12(\mu^2-12\mu+10).
\tag{11}
\]

The right side is positive and increasing for `mu>=12`.  Thus (1)
holds for every forest of order at least 26.  At the order-26
endpoint, the exact normalized lower bound in (11) is

```text
77720141/15468489 > 0.
```

## 3. Order 25: disconnected forests

At order 25, (7) gives `mu_4>=153/11`.  If `F` is disconnected, at
least one leaf-to-leaf component bridge is required to make it a tree.
For that bridge,

\[
 I(F)=I(F')+x^2I(R),\qquad |R|\geq21.
\]

The correction at ranks four and five is

\[
 i_3(R)-\frac{153}{55}i_2(R).
\]

The elementary sharp forest rank-`(2,3)` ratio gives

\[
 i_3(R)/i_2(R)\geq51/10,
\]

and every 21-vertex forest has

\[
 i_2(R)\geq\binom{20}{2}=190.
\]

Using also `i_4(F)<=C(25,4)`, this gives the exact floors

```text
mu_4 >= 78387/5566,
mu_5 >= 880334/78387,
V_7/i_5^2 >= 6901696750/6144521769 > 0.
```

Hence every disconnected order-25 forest satisfies (1).

## 4. Order 25: connected trees

For a tree write

\[
 B_2=\sum_v\binom{d(v)-1}{2}.
\]

The quantitative conclusion of the certified rank-`(4,5)` proof is

\[
 110i_5-306i_4\geq1742B_2
\tag{12}
\]

at order 25.  If `B_2>=2`, use (12) and
`i_4<=C(25,4)` to obtain

```text
mu_4 >= 968596/69575,
mu_5 >= 2680701/242149,
V_7/i_5^2 >= 2172607993/117272276402 > 0.
```

It remains to classify `B_2<=1`.

- `B_2=0` forces the path `P_25`.  Exact evaluation gives
  `V_7(P_25)=6,591,506,220`.
- `B_2=1` forces exactly one degree-three vertex and all other
  degrees at most two.  Thus the tree is a three-arm spider whose
  unordered positive arm lengths partition 24.  There are 48 such
  partitions.  Exact recurrence checks all 48; the minimum is
  `7,249,560,525`, attained at arms `(2,2,20)`.

This finishes order 25 and proves the theorem.

## 5. Exact limitation of the scalar method

The curvature/bridge refinement in Sections 3--4 is necessary.  If one
uses only the sharp rank-`(4,5)` endpoint at order 25 and then applies
the two exact convex-envelope transfers, the chain gives

```text
mu_4 = 153/11,
mu_5 >= 188/17,
V_7/i_5^2 >= -19/289.
```

Thus that scalar endpoint chain alone does not prove even order 25.
More importantly, the present theorem plus the earlier exact census
does **not** cover orders 21--24.  A new finite certificate or stronger
structural input is still required there.

## 6. Replay

Run

```powershell
python .\prove_forest_v7_order25.py
```

The verifier checks the discrete-convex algebra, the prerequisite
hashes, the `n>=26` endpoint, both order-25 uniform cases, and the path
plus all 48 spiders.  It writes
`forest_v7_order25_exact_20260813.json` and terminates with

```text
PASS_EXACT_ALL_FOREST_V7_ORDER_AT_LEAST_25
```
