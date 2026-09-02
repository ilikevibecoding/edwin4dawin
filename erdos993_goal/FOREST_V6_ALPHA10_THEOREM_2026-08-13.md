# The all-forest (V_6) theorem above independence number nine

Date: 2026-08-13

Status: **proved all-order theorem, with an exact finite boundary
replay**.  This theorem is an input to the rank-six pendant-growth
argument.  It does not by itself prove unimodality of every forest
independence polynomial.

## Theorem

Let

\[
I(F;x)=\sum_{j\geq 0}i_j(F)x^j
\]

be the independence polynomial of a forest (F).  If
(alpha(F)\geq 10), then

\[
\boxed{
V_6(F):=4i_4(F)i_5(F)+39i_4(F)i_6(F)-25i_5(F)^2\geq0.
}
\tag{1}
\]

The proof is analytic for every order (n\geq21), and an exact
complete independence-polynomial census covers (10\leq n\leq20).

## 1. A sharp rank-((2,3)) ratio for forests

We first record an elementary lemma used to transfer the already
proved tree rank-((4,5)) ratio to disconnected forests.

### Lemma 1

Every forest (R) of order (q\geq4) satisfies

\[
\frac{i_3(R)}{i_2(R)}
\geq
\frac{(q-3)(q-4)}{3(q-1)}.
\tag{2}
\]

### Proof

Let (e=|E(R)|) and

\[
w=\sum_{v\in V(R)}\binom{d(v)}2.
\]

Since a forest contains no triangle, inclusion-exclusion gives

\[
i_2=\binom q2-e,
\qquad
i_3=\binom q3-e(q-2)+w.
\tag{3}
\]

Put

\[
G=3(q-1)i_3-(q-3)(q-4)i_2.
\]

If (e\geq q/2), then

\[
w\geq\sum_v(d(v)-1)=2e-q.
\]

Writing (t=(q-1)-e\geq0), substitution into (3) gives

\[
G\geq 2qt(q-4)\geq0.
\tag{4}
\]

If (e\leq q/2), use (w\geq0).  The resulting lower bound for
(G) is decreasing in (e), because its (e)-coefficient is
(-2(q^2-q-3)<0).  At (e=q/2) it equals

\[
q(q-4)(q-2)\geq0.
\tag{5}
\]

This proves (2).  Its right side is nondecreasing in (q\geq4), since
the increment from (q) to (q+1) is

\[
\frac{(q-3)(q+2)}{3q(q-1)}\geq0.
\tag{6}
\]

## 2. Transferring the tree path ratio to every forest

The separately proved sharp tree theorem states that every tree (T)
of order (n\geq18) satisfies

\[
\frac{i_5(T)}{i_4(T)}
\geq
\rho_n:=\frac{(n-7)(n-8)}{5(n-3)}.
\tag{7}
\]

We now prove that (7) holds for every forest of the same order.

Starting from an (n)-vertex forest (F), repeatedly choose vertices
(u,v) of degree at most one in two different components and add the
edge (uv).  Every intermediate graph is a forest, and the final graph
is a tree.  For one such step, write (F'=F+uv).  The independent sets
lost by adding (uv) are exactly those containing both endpoints, so

\[
I(F;x)=I(F';x)+x^2I(R;x),
\qquad
R=F-\bigl(N_F[u]\cup N_F[v]\bigr).
\tag{8}
\]

The two closed neighborhoods are disjoint and each has at most two
vertices.  Hence (R) is a forest of order (q\geq n-4).  By Lemma 1
and (6),

\[
\frac{i_3(R)}{i_2(R)}
\geq
\frac{(n-7)(n-8)}{3(n-5)}
=\rho_n+
\frac{2n(n-7)(n-8)}{15(n-5)(n-3)}
>\rho_n.
\tag{9}
\]

Equating ranks four and five in (8) shows

\[
\begin{aligned}
i_5(F)-\rho_ni_4(F)
={}&i_5(F')-\rho_ni_4(F')\\
&+i_3(R)-\rho_ni_2(R).
\end{aligned}
\tag{10}
\]

Starting from the final tree and reversing all bridge additions proves
the sharp lower bound

\[
\boxed{
\frac{i_5(F)}{i_4(F)}
\geq\frac{(n-7)(n-8)}{5(n-3)}
}
\qquad(n\geq18)
\tag{11}
\]

for every forest.  This is the step that must be supplied when the tree
ratio theorem is used for disconnected forests; coefficientwise path
minimality alone would not suffice.

## 3. Extension moments

Fix a forest (F) of order (n\geq21), and choose an independent
four-set (S) uniformly at random.  Put

\[
e(S)=|V(F-N[S])|,
\qquad
y(S)=i_2(F-N[S]),
\]

and define

\[
\mu=\mathbb E[e(S)]=\frac{5i_5}{i_4},
\qquad
z=\mathbb E[y(S)]=\frac{15i_6}{i_4}.
\tag{12}
\]

The identities count a five- or six-set by its independent four-subsets.
Set (m=n-4), so (0\leq e(S)\leq m), and let
(p_0=\Pr(e(S)=0)).  A forest on (e>0) vertices has at most (e-1)
edges, and therefore

\[
y(S)\geq
\frac{e(S)^2-3e(S)+2}{2}-\mathbf1_{\{e(S)=0\}}.
\tag{13}
\]

Writing (sigma^2=\operatorname{Var}(e(S))), taking expectations,
and then using (sigma^2\geq0) gives

\[
z\geq\frac{\mu^2-3\mu+2}{2}-p_0.
\tag{14}
\]

Also (mu\leq m\Pr(e(S)>0)=m(1-p_0)), so

\[
p_0\leq1-\frac\mu m.
\]

Substitution in (14) yields

\[
\boxed{
z\geq\frac{\mu(m\mu-3m+2)}{2m}.
}
\tag{15}
\]

Now divide (1) by (i_4^2) and use (12) and (15):

\[
\begin{aligned}
\frac{V_6(F)}{i_4(F)^2}
&=\frac45\mu+\frac{13}{5}z-\mu^2\\
&\geq
\frac{\mu(3m\mu-31m+26)}{10m}.
\end{aligned}
\tag{16}
\]

By (11),

\[
\mu\geq\frac{(n-7)(n-8)}{n-3}.
\tag{17}
\]

At this lower endpoint, the sign-determining factor in (16), after
multiplication by the positive quantity ((n-4)(n-3)), is

\[
3n^3-88n^2+591n-1122.
\tag{18}
\]

For (n=21+r), expression (18) is

\[
3r^3+101r^2+864r+264>0
\qquad(r\geq0).
\tag{19}
\]

The factor (3m\mu-31m+26) is increasing in (mu), so (17)--(19)
show that it is positive at the actual value of (mu).  Thus
(V_6(F)>0) for every forest of order at least 21.

## 4. Exact finite boundary

It remains to check (10\leq n\leq20); no forest of smaller order has
independence number at least ten.  The replay constructs every unlabeled
tree using NetworkX's exhaustive `nonisomorphic_trees` generator,
computes its independence polynomial by the exact rooted recursion

\[
I(T)=I(T-r)+xI(T-N[r]),
\]

and closes the distinct tree-polynomial sets under multiplication.
Thus every forest independence polynomial occurs.

Orders through 18 are materialized exactly.  At order 19, every
connected tree is enumerated, and every disconnected forest is obtained
by selecting a smallest component, whose order is at most 9.  At order
20, all 823,065 connected trees are streamed, and every disconnected
forest is obtained from a smallest component of order at most 10.  The
order-20 product count contains repeated factorizations; this affects
only the displayed number of checks, not coverage or the minimum.

The exact minima among eligible polynomials are:

| order | eligible polynomial rows/checks | minimum (V_6) |
|---:|---:|---:|
| 10 | 1 | 343,980 |
| 11 | 11 | 343,980 |
| 12 | 82 | 410,364 |
| 13 | 470 | 559,351 |
| 14 | 2,254 | 792,171 |
| 15 | 8,882 | 1,001,072 |
| 16 | 29,444 | 1,236,642 |
| 17 | 84,566 | 1,529,502 |
| 18 | 221,719 | 3,664,167 |
| 19 | 561,475 | 9,564,555 |
| 20 | 1,419,659 checks, with repeats | 29,161,860 |

The global finite minimum is attained at the ten-isolate polynomial
((1+x)^{10}).  Consequently the finite boundary is positive, and
together with Section 3 this proves (1).

## 5. Exact replay

The tree ratio prerequisite is replayed by

```powershell
python .\verify_tree_rank45_path_ratio.py
```

The forest bridge algebra, extension-moment algebra, and complete finite
boundary are replayed by

```powershell
python .\prove_forest_v6_alpha10.py
```

The latter writes
`forest_v6_alpha10_exact_20260813.json` and terminates with

```text
PASS_EXACT_ALL_FOREST_V6_ALPHA_AT_LEAST_10
```

### SHA-256

```text
prove_forest_v6_alpha10.py
2B3620BEF00E761B857AAFBAA2BABB79A5419D0E0D26AB45C787CED2585DD947

forest_v6_alpha10_exact_20260813.json
5F3954C8E3CC8817376CE89685CF283BAEE2FF55214A8E9FCFE816D50A8E9AA4

scan_forest_iso_reserve_floor.py
8C31DFE5911CF36E848BEA88BC778AB8B20F419944B3B90B3DA6CDD377B5D41E

verify_tree_rank45_path_ratio.py
AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C

TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md
7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528
```
