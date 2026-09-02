# The reduction lemma and the proved cases of the WR + ISO + TAIL framework

**Scope.** This note is an audit of the proof framework used in this repository for the
unimodality question for independence polynomials of forests (Alavi, Malde, Schwenk and
Erdős, 1987; Erdős Problem #993). It gives complete, self-contained proofs of everything
the framework uses that *can* be proved with elementary means, states precisely what is
cited from the literature, and ends with an explicit list of what is **not** proved.

**Machine verification.** Every algebraic identity and inequality below is checked, with
exact arithmetic only (sympy polynomial identities, Python integers, `fractions.Fraction`;
no floating point anywhere), by

```
python3 scripts/verify_lemmas_symbolic.py        # prints PASS/FAIL per item, exit 1 on failure
python3 -m pytest tests/test_lemmas.py -q        # same checks + independent unit tests
```

Tags of the form **[S-k]** refer to item `k` of that script. Equation labels such as (1.1)
are referred to verbatim in the script output. Numerical enumerations in the script are
consistency checks of the theorems; they are never used as proof steps.

**Summary of status.**

| Statement | Status |
| --- | --- |
| Reduction lemma (Lemma 1.1, ratio form Lemma 1.2) | proved here (pure arithmetic) |
| Conditional unimodality theorem (Theorems 2.1, 2.2) | proved here (pure arithmetic) |
| Exact formulas for $p_0, p_1, p_2, p_3$ of a forest (Theorem 3.1), and $p_4$ (Prop. 3.3) | proved here (counting) |
| $\mathrm{ISO}_1$ for every forest (Theorem 4.1) | proved here |
| $\mathrm{ISO}_2$ for every forest, star extremal (Theorem 5.1) | proved here |
| $\mathrm{WR}_1$, $\mathrm{WR}_2$ wherever the framework needs them (Theorem 6.1) | proved here |
| real-rooted $I(F;x)$ $\Rightarrow$ $\mathrm{ISO}_r$ for all $r$ (Theorem 7.1) | proved here, from Newton's inequalities (classical, cited) |
| claw-free graphs have real-rooted $I(G;x)$ (Theorem 8.2) | **cited** (Chudnovsky–Seymour) |
| TAIL for forests (Theorem 8.1) | **cited** (Levit–Mandrescu; valid for bipartite graphs, **not** for all graphs) |
| $\mathrm{ISO}_3$ for every tree (Theorem 11.1, `ISO3_TREES_THEOREM.md`) and every forest (Theorem 11.1', `ISO3_FORESTS_THEOREM.md`) | proved (exact computer-assisted certificates) |
| $\mathrm{WR}_3$ wherever the framework needs it (Theorem 11.2) | proved here |
| $\mathrm{ISO}_r$, $\mathrm{WR}_r$ for $r \ge 4$ | **not proved** (Sections 10–11) |

---

## 0. Setting, notation and two elementary facts

Throughout, $F$ is a forest with $n \ge 1$ vertices, $e$ edges and vertex degrees
$d_v$; $S := \sum_v \binom{d_v}{2}$. An *independent set* is a set of pairwise
non-adjacent vertices ($\emptyset$ is independent). Write $p_k$ for the number of
independent $k$-sets, $\alpha = \alpha(F)$ for the independence number, and

$$I(F;x) = \sum_{k=0}^{\alpha} p_k x^k .$$

In the code, $p$ is the list `[p_0, ..., p_alpha]` (trailing zeros stripped, so
`alpha = len(p) - 1`). We use the convention $p_k := 0$ for $k > \alpha$; all identities
below hold with this convention (the degenerate cases $n \in \{1,2\}$ are treated explicitly
where they matter).

**Definitions (as in `erdos993lib/checks.py`).** For $a \ge 1$ put

$$L(a) := \left\lceil \frac{2a-1}{3} \right\rceil .$$

For a sequence $p_0, \dots, p_\alpha$:

* $\mathrm{WR}_r$ ($1 \le r \le \alpha$): $p_{r-1} \le r\,p_r$.
* $\mathrm{ISO}_r$ ($1 \le r \le \alpha - 1$): $Q_r := r\,p_r^2 + p_{r-1}^2 - (r+1)\,p_{r-1}\,p_{r+1} \ \ge\ 0$.
* $\mathrm{TAIL}$: $p_r \ge p_{r+1}$ for every $r$ with $L(\alpha) \le r \le \alpha - 1$.

A finite sequence is *unimodal* if it is non-decreasing up to some index and non-increasing
afterwards.

**Fact 0.1 (positivity).** For every graph with independence number $\alpha$ and every
$0 \le k \le \alpha$: $p_k \ge \binom{\alpha}{k} \ge 1$.

*Proof.* Every $k$-subset of a maximum independent set is independent, and there are
$\binom{\alpha}{k} \ge 1$ of them. $\square$

**Fact 0.2 (index bookkeeping) [S-2].** For $\alpha \ge 1$: $1 \le L(\alpha) \le \alpha$;
for $\alpha \ge 2$: $L(\alpha) \le \alpha - 1$; and $L$ is non-decreasing. Moreover
$L(\alpha) \le 3 \iff \alpha \le 5$.

*Proof.* $(2\alpha-1)/3 > 0$ for $\alpha \ge 1$, so the ceiling is $\ge 1$.
$(2\alpha-1)/3 \le \alpha - 1 \iff \alpha \ge 2$, and $(2\alpha-1)/3 \le \alpha$ always; the
ceiling of a real number that is at most the integer $m$ is at most $m$. Monotonicity is clear,
and $\lceil (2\alpha-1)/3 \rceil \le 3 \iff (2\alpha-1)/3 \le 3 \iff \alpha \le 5$. $\square$

Table: $L(1)=1,\ L(2)=1,\ L(3)=2,\ L(4)=3,\ L(5)=3,\ L(6)=4,\ L(7)=5,\ L(8)=5,\ L(9)=6$.

Consequently, whenever $1 \le r \le L(\alpha) - 1$ we have $r + 1 \le L(\alpha) \le \alpha - 1$
(for $\alpha \ge 2$; for $\alpha = 1$ the range is empty), so $p_{r-1}, p_r, p_{r+1}$ are all
$\ge 1$ by Fact 0.1 and $\mathrm{ISO}_r$ is meaningful. The guard `min(L, alpha)` in
`checks.analyze` is therefore never active; it is harmless.

---

## 1. The reduction lemma

**Lemma 1.1 (reduction lemma) [S-1].** Let $r \ge 1$ and let $a = p_{r-1} > 0$,
$b = p_r$, $c = p_{r+1}$ be real numbers. Then the polynomial identities

$$r b^2 - (r+1)\,a b + a^2 \;=\; (r b - a)(b - a) \tag{1.2}$$

$$(r+1)\,a\,(b - c) \;=\; Q_r + (r b - a)(a - b), \qquad Q_r = r b^2 + a^2 - (r+1) a c \tag{1.1}$$

hold. Consequently, if $\mathrm{WR}_r$ ($a \le r b$), $\mathrm{ISO}_r$ ($Q_r \ge 0$) and
$b \le a$ (i.e. $p_r \le p_{r-1}$) hold, then $c \le b$ (i.e. $p_{r+1} \le p_r$).

*Proof.* Expanding, $(rb-a)(b-a) = rb^2 - rab - ab + a^2 = rb^2 - (r+1)ab + a^2$, which is
(1.2); adding $(r+1)a(b-c)$ to both sides of (1.2) rearranged gives (1.1). Both are checked by
`sympy.expand` in [S-1].

Now assume the three hypotheses. In (1.2) the first factor $rb - a$ is $\ge 0$ by
$\mathrm{WR}_r$ and the second factor $b - a$ is $\le 0$, so

$$r p_r^2 - (r+1) p_r p_{r-1} + p_{r-1}^2 \le 0, \quad\text{i.e.}\quad r p_r^2 + p_{r-1}^2 \le (r+1)\,p_{r-1}\,p_r .$$

Combining with $\mathrm{ISO}_r$,

$$(r+1)\,p_{r-1}\,p_{r+1} \;\le\; r p_r^2 + p_{r-1}^2 \;\le\; (r+1)\,p_{r-1}\,p_r ,$$

and dividing by $(r+1)p_{r-1} > 0$ gives $p_{r+1} \le p_r$. (Equivalently: in (1.1) the
right-hand side is a sum of the non-negative quantities $Q_r$ and $(rb-a)(a-b)$, so
$(r+1)a(b-c) \ge 0$.) No sign assumption on $b$ or $c$ is needed; for forests all $p_k$ are
positive integers anyway. $\square$

**Lemma 1.2 (ratio form) [S-1].** Keep the notation of Lemma 1.1 and assume additionally
$\mathrm{WR}_r$, so that $b \ge a/r > 0$. Put $x = p_r / p_{r-1}$ and $y = p_{r+1} / p_r$.
Then

* $\mathrm{WR}_r \iff x \ge 1/r$, and the hypothesis $p_r \le p_{r-1} \iff x \le 1$;
* $\mathrm{ISO}_r \iff r x + \dfrac1x \ge (r+1)\,y$ (divide $Q_r \ge 0$ by $p_{r-1}p_r > 0$; indeed
  $Q_r/(p_{r-1}p_r) = rx + 1/x - (r+1)y$);
* $f(x) := r x + 1/x$ satisfies $f(x) \le r + 1$ on $[1/r, 1]$.

Hence $(r+1) y \le r + 1$, i.e. $y \le 1$, i.e. $p_{r+1} \le p_r$.

*Proof of the third point.* Two equivalent arguments. (i) The identity

$$r x + \frac1x - (r+1) = \frac{(r x - 1)(x - 1)}{x}$$

(checked in [S-1]) has right-hand side $\le 0$ exactly when $x$ lies between $1/r$ and $1$.
(ii) $f''(x) = 2/x^3 > 0$, so $f$ is convex on $[1/r,1]$; a convex function lies below the chord
joining its endpoint values, and $f(1/r) = 1 + r = f(1)$, so the chord is the constant $r+1$
(equality at both endpoints). For $r = 1$ the interval is the single point $x = 1$. $\square$

The quantity $Q_r/(p_{r-1}p_r) = rx + 1/x - (r+1)y$ is the *dimensionless ISO margin* recorded
by `checks.iso_margin`.

---

## 2. The conditional unimodality theorem

**Theorem 2.1 [S-2].** Let $\alpha \ge 1$, $L = L(\alpha)$, and let $p_0, \dots, p_\alpha$ be
positive real numbers such that

* **(H1)** $\mathrm{WR}_r$ and $\mathrm{ISO}_r$ hold for every $r$ with $1 \le r \le L - 1$, and
* **(H2)** $\mathrm{TAIL}$ holds: $p_r \ge p_{r+1}$ for every $r$ with $L \le r \le \alpha - 1$.

Then $(p_0, \dots, p_\alpha)$ is unimodal. Moreover its maximum is attained at an index
$\le L$.

*Proof.* Call $r \in \{1, \dots, \alpha\}$ a *descent index* if $p_r \le p_{r-1}$.

*Case 1: no $r \in \{1, \dots, L-1\}$ is a descent index.* Then
$p_0 < p_1 < \dots < p_{L-1}$, and by (H2) $p_L \ge p_{L+1} \ge \dots \ge p_\alpha$. If
$p_{L-1} \le p_L$ the sequence is non-decreasing on $[0, L]$ and non-increasing on
$[L, \alpha]$ (mode $L$); if $p_{L-1} > p_L$ it is non-decreasing on $[0, L-1]$ and
non-increasing on $[L-1, \alpha]$ (mode $L-1$). Either way it is unimodal with maximum at an
index $\le L$. (If $L = 1$, i.e. $\alpha \in \{1,2\}$, this case always applies and (H1) is
vacuous.)

*Case 2: otherwise.* Let $m$ be the smallest descent index in $\{1, \dots, L-1\}$, so
$p_0 < p_1 < \dots < p_{m-1} \ge p_m$. We claim that

$$p_{r} \le p_{r-1} \quad\text{for all } m \le r \le L. \tag{2.1}$$

Induction on $r$: for $r = m$ this is the definition of $m$. If $m \le r \le L-1$ and
$p_r \le p_{r-1}$, then $r \le L - 1$, so $\mathrm{WR}_r$ and $\mathrm{ISO}_r$ hold by (H1),
$p_{r-1} > 0$, and Lemma 1.1 gives $p_{r+1} \le p_r$, which is (2.1) at $r+1$. The induction
stops exactly when it reaches $r + 1 = L$, which is where (H1) stops being available — and
that is where (H2) takes over: $p_L \ge p_{L+1} \ge \dots \ge p_\alpha$. Altogether

$$p_0 < \dots < p_{m-1} \ge p_m \ge p_{m+1} \ge \dots \ge p_L \ge p_{L+1} \ge \dots \ge p_\alpha ,$$

which is unimodal with mode $m - 1 \le L - 2$. $\square$

**Theorem 2.2 (descent-conditional version) [S-2].** Theorem 2.1 remains true if (H1) is
weakened to

* **(H1$'$)** for every $r$ with $1 \le r \le L-1$ *and* $p_r \le p_{r-1}$, both
  $\mathrm{WR}_r$ and $\mathrm{ISO}_r$ hold.

In particular (keeping $\mathrm{WR}_r$ for all $1 \le r \le L-1$, which is what the framework
does) it suffices that $\mathrm{ISO}_r$ holds at those $r \le L-1$ where $p_r \le p_{r-1}$.

*Proof.* In the proof of Theorem 2.1, $\mathrm{WR}_r$ and $\mathrm{ISO}_r$ were invoked only
at the indices $r \in \{m, \dots, L-1\}$ of the induction (2.1), and every such $r$ satisfies
$p_r \le p_{r-1}$ (that is the induction hypothesis). $\square$

**Remark 2.3 (exactly which indices are needed).**

* $\mathrm{WR}_r$: for $1 \le r \le L(\alpha) - 1$ only (Theorem 2.1), or only at the descent
  indices among them (Theorem 2.2).
* $\mathrm{ISO}_r$: the same range. By Fact 0.2 every such $r$ satisfies
  $r \le L - 1 \le \alpha - 2$, so $p_{r+1}$ exists and $\mathrm{ISO}_r$ is meaningful; the
  statement "$\mathrm{ISO}_r$ for $1 \le r \le L-1$, $r \le \alpha - 1$" has the second
  condition automatically satisfied.
* $\mathrm{TAIL}$: for $L(\alpha) \le r \le \alpha - 1$.
* Nothing is assumed at indices $r \ge L$ other than TAIL. In particular $\mathrm{WR}_r$ and
  $\mathrm{ISO}_r$ may fail for $r \ge L$ without affecting the conclusion.

These are exactly the hypotheses `checks.analyze` records in `wr_failures_prefix`,
`iso_failures_prefix`, `descent_conditional_iso_failures_prefix` and `tail_failures`; the
`AssertionError` in `analyze` (hypotheses hold but the sequence is not unimodal) is
unreachable by Theorem 2.1. Item [S-2] also checks Theorems 2.1 and 2.2 exhaustively on the
finite domain of all sequences with $p_0 = 1$, $1 \le p_k \le 6$, $\alpha \le 6$
(1306 sequences satisfy (H1)+(H2), 2568 satisfy (H1$'$)+(H2); all are unimodal with maximum
at an index $\le L$; the domain contains 48510 non-unimodal sequences), and exhibits
$(1,5,4,5,1)$: TAIL holds, the sequence is not unimodal, and indeed $Q_2 = -18 < 0$.

**Corollary 2.4 (forests with $\alpha \le 5$).** Let $F$ be a forest with
$\alpha(F) \le 5$. Then $I(F;x)$ is unimodal, assuming only the cited Theorem 8.1 (TAIL for
forests).

*Proof.* By Fact 0.2, $L(\alpha) \le 3$, so (H1) only concerns $r \in \{1, 2\}$.
$\mathrm{WR}_1$ and $\mathrm{ISO}_1$ hold for every forest (Theorems 6.1 and 4.1);
$\mathrm{ISO}_2$ holds for every forest (Theorem 5.1); $\mathrm{WR}_2$ holds for every forest
with $n \ge 4$, and if $n \le 3$ then $\alpha \le 3$ and $L \le 2$, so $r = 2$ is not in the
prefix (Theorem 6.1). TAIL is Theorem 8.1. Apply Theorem 2.1. $\square$

For $\alpha \ge 6$ the prefix contains $r = 3$. $\mathrm{ISO}_3$ for general forests is not
proved in Sections 1–9 (Section 10); $\mathrm{WR}_3$ wherever it is needed, and $\mathrm{ISO}_3$
for *trees*, are treated in the Addendum (Section 11).

---

## 3. Exact low-order coefficients of a forest

**Theorem 3.1 [S-3].** For every forest $F$ (with the convention $p_k = 0$ for $k > \alpha$):

$$p_0 = 1,\qquad p_1 = n,\qquad p_2 = \binom n2 - e,\qquad p_3 = \binom n3 - e\,(n-2) + S,
\qquad S = \sum_v \binom{d_v}{2}.$$

Here $S$ is the number of unordered pairs of edges sharing a vertex, equivalently the
number of paths with two edges ($P_3$ subgraphs) in $F$.

*Proof.* $p_0 = 1$ (the empty set) and $p_1 = n$ (every singleton) are clear. A $2$-set is
independent iff it is not an edge, so $p_2 = \binom n2 - e$.

For $p_3$: a $3$-set $U$ is independent iff it contains no edge. Let $E(U)$ be the set of edges
with both ends in $U$. In a forest $|E(U)| \le 2$, since three edges on three vertices would
form a triangle. Let $N_1$, $N_2$ be the numbers of $3$-sets with $|E(U)| = 1$, resp. $2$.
Double counting the pairs $(uv, U)$ with $uv \in E$, $\{u,v\} \subseteq U$, $|U| = 3$: each
edge lies in exactly $n - 2$ three-sets, so

$$e\,(n-2) = N_1 + 2 N_2, \qquad\text{hence}\qquad p_3 = \binom n3 - N_1 - N_2 = \binom n3 - e(n-2) + N_2 .$$

It remains to show $N_2 = S$. If $U$ contains two distinct edges, they have four endpoints
counted with multiplicity but only three vertices are available, so they share exactly one
vertex $v$ and $U = \{u, v, w\}$ with $uv, vw \in E$; thus $U$ is determined by the pair of
edges. Conversely, two edges $uv, vw$ with a common vertex $v$ span the $3$-set $\{u,v,w\}$,
which contains exactly these two edges ($uw \notin E$, else a triangle). So $N_2$ is the
number of unordered pairs of edges with a common vertex. Two distinct edges share at most one
vertex, so each such pair is counted at exactly one vertex $v$, and at $v$ there are
$\binom{d_v}{2}$ pairs: $N_2 = \sum_v \binom{d_v}2 = S$. $\square$

*Degenerate cases.* $n = 1$: $p = (1,1)$ and the formulas give $p_2 = \binom12 - 0 = 0$,
$p_3 = 0$. $n = 2$, $e = 0$: $p = (1,2,1)$, $p_3 = 0 - 0 + 0 = 0$. $n = 2$, $e = 1$:
$p = (1,2)$, $p_2 = 1 - 1 = 0$, $p_3 = 0 - 1\cdot 0 + 0 = 0$. $P_3$: $p = (1,3,1)$, $S = 1$,
$p_3 = 1 - 2\cdot 1 + 1 = 0$. All checked in [S-3]. [S-3] also verifies the formulas against
`erdos993lib.indpoly.indpoly_forest` for all 987 non-isomorphic trees with $n \le 12$
(counts matching OEIS A000055) and for 400 random forests with $n \le 40$ obtained by deleting
random edges from random Prüfer trees (117 of them cross-checked against the $2^n$ brute
force `indpoly_bruteforce`).

**Remark 3.2 (general graphs; not used).** The same double count gives, for an arbitrary
graph with $t$ triangles, $p_3 = \binom n3 - e(n-2) + S - t$ (a triangle is counted three
times in $S$ and once as a $3$-set with three edges). Checked by brute force on random graphs
in [S-3]; only the forest case $t = 0$ is used here.

**Proposition 3.3 ($p_4$ of a forest) [S-3, S-10].** For every forest,

$$p_4 = \binom n4 - e\binom{n-2}{2} + (n-3)\,S + \Bigl(\binom e2 - S\Bigr) - T - P,
\qquad T = \sum_v \binom{d_v}{3},\qquad P = \sum_{uv \in E} (d_u - 1)(d_v - 1),$$

where $T$ is the number of $K_{1,3}$ subgraphs and $P$ the number of paths with three edges
(in a forest every such path is an induced $P_4$).

*Proof.* For a $4$-set $U$, $\sum_{A \subseteq E(U)} (-1)^{|A|} = [E(U) = \emptyset]$, so
$p_4 = \sum_{A \subseteq E} (-1)^{|A|} N(A)$, where $N(A)$ is the number of $4$-sets containing
the vertex set $V(A)$ of $A$, i.e. $N(A) = \binom{n - |V(A)|}{4 - |V(A)|}$ if $|V(A)| \le 4$ and
$0$ otherwise. A set $A$ of edges of a forest spans $|V(A)| \ge |A| + 1$ vertices, so
$|A| \le 3$. $A = \emptyset$ contributes $\binom n4$; a single edge contributes
$-\binom{n-2}{2}$; two edges sharing a vertex ($S$ pairs) contribute $+(n-3)$ each, two disjoint
edges ($\binom e2 - S$ pairs) contribute $+1$ each; three edges with $|V(A)| \le 4$ form a tree on
exactly four vertices, i.e. a $K_{1,3}$ ($T$ of them) or a $P_4$, each contributing $-1$. A
$3$-edge path is determined by its middle edge $uv$ and one further neighbour of $u$ and of
$v$; these are distinct (otherwise a triangle) and the path is induced (a chord would close a
cycle), so there are $P = \sum_{uv}(d_u-1)(d_v-1)$ of them. $\square$

This formula is only needed in Section 10; [S-3] checks it on all trees $n \le 12$ and on
random forests.

---

## 4. $\mathrm{ISO}_1$ holds for every forest

**Theorem 4.1 [S-4].** For every forest, $Q_1 = p_1^2 + p_0^2 - 2 p_0 p_2 = n + 1 + 2e > 0$.

*Proof.* By Theorem 3.1, $Q_1 = n^2 + 1 - 2\bigl(\binom n2 - e\bigr) = n^2 + 1 - n(n-1) + 2e
= n + 1 + 2e$ (polynomial identity, checked by `sympy.expand`). Since $n \ge 1$, $e \ge 0$,
$Q_1 \ge 2$. $\square$

(For $\alpha \le 1$, i.e. $F = K_1$ or $K_2$, $\mathrm{ISO}_1$ is not needed by the framework;
the identity still holds with $p_2 = 0$: $Q_1(K_1) = 2$, $Q_1(K_2) = 5$.)

---

## 5. $\mathrm{ISO}_2$ holds for every forest, and the star is extremal

Write, using Theorem 3.1,

$$Q_2 = 2p_2^2 + p_1^2 - 3p_1p_3 = 2\Bigl(\binom n2 - e\Bigr)^2 + n^2 - 3n\Bigl(\binom n3 - e(n-2) + S\Bigr) . \tag{5.0}$$

**Theorem 5.1 [S-5].** For every forest with $n \ge 1$ vertices,

$$Q_2 \;\ge\; g(e) \;\ge\; (n-1)(n-2) + n^2 \;\ge\; 1, \qquad
g(e) := 2\Bigl(\binom n2 - e\Bigr)^2 + n^2 - 3n\Bigl(\binom n3 - e(n-2) + \binom e2\Bigr).$$

In particular $\mathrm{ISO}_2$ holds strictly for every forest. Moreover
$Q_2 = (n-1)(n-2) + n^2$ if and only if $F$ is the star $K_{1,n-1}$ ($n \ge 2$; for $n = 1$,
$F = K_1$).

*Proof.* **Step 1 ($Q_2 \ge g(e)$).** $S$ counts unordered pairs of edges sharing a vertex, a
subset of all $\binom e2$ unordered pairs of edges; hence $S \le \binom e2$ and, as a polynomial
identity in $n, e, S$,

$$Q_2 - g(e) = 3n\Bigl(\binom e2 - S\Bigr) \ \ge\ 0 . \tag{5.1}$$

**Step 2 (concavity of $g$ in $e$).** Expanding, $g$ is a quadratic polynomial in $e$ whose
$e^2$-coefficient is $2 - \tfrac{3n}{2} = -\tfrac{3n-4}{2}$, which is $\le -1 < 0$ for every
integer $n \ge 2$. So for $n \ge 2$, $g$ is a concave function of $e$, and a concave function
on an interval attains its minimum at an endpoint. Concretely, with the chord through
$(0, g(0))$ and $(n-1, g(n-1))$,

$$g(e) - \Bigl[\tfrac{n-1-e}{n-1}\,g(0) + \tfrac{e}{n-1}\,g(n-1)\Bigr] = \Bigl(\tfrac{3n}{2} - 2\Bigr)\,e\,(n-1-e) \ \ge 0
\quad (0 \le e \le n-1,\ n \ge 2), \tag{5.2}$$

so $g(e) \ge \min\{g(0), g(n-1)\}$ on $0 \le e \le n-1$.

**Step 3 (endpoints).** The closed forms

$$g(0) = \frac{n^2(n-1)}{2} + n^2, \qquad g(n-1) = (n-1)(n-2) + n^2$$

are polynomial identities (checked by `sympy.expand`; e.g. $\binom n2 - (n-1) = \binom{n-1}2$
and $\binom n3 - (n-1)(n-2) + \binom{n-1}{2} = \binom{n-1}{3}$). Both are positive for $n \ge 1$,
and $g(0) - g(n-1) = \tfrac{(n-1)\left((n-1)^2 + 3\right)}{2} \ge 0$, so the minimum is
$g(n-1) = (n-1)(n-2) + n^2 \ge n^2 \ge 1$. For a forest, $0 \le e \le n-1$, so Steps 1–3 give
$Q_2 \ge g(e) \ge g(n-1) \ge 1$ for $n \ge 2$.

**Step 4 (degenerate cases).** $n = 1$: $e = 0$, $p = (1,1)$, $Q_2 = p_1^2 = 1 = g(0)$
($g(0) = g(n-1)$ here and the leading coefficient $2 - 3/2 > 0$ is irrelevant since $e = 0$ is
the only value). $n = 2$: $2K_1$ has $p = (1,2,1)$, $Q_2 = 2 + 4 = 6 = g(0)$; $K_2$ has
$p = (1,2)$, $Q_2 = 4 = g(1) = (1)(0) + 4$. In all these cases $p_2$ or $p_3$ is $0$ and the
formulas of Theorem 3.1 hold as identities.

**Step 5 (an explicit decomposition, and the equality case).** Combining (5.1) with the
identity $g(e) - g(n-1) = \tfrac12 (n-1-e)\bigl((3n-4)e + (n-1)^2 + 3\bigr)$ gives the polynomial
identity

$$Q_2 = \bigl[(n-1)(n-2) + n^2\bigr] + 3n\Bigl(\binom e2 - S\Bigr) + \frac{(n-1-e)\bigl((3n-4)\,e + (n-1)^2 + 3\bigr)}{2}. \tag{5.3}$$

For a forest with $n \ge 2$ each of the three terms is $\ge 0$ ($S \le \binom e2$;
$e \le n-1$; $(3n-4)e \ge 0$ and $(n-1)^2 + 3 > 0$), which re-proves the theorem in one line.
Equality $Q_2 = (n-1)(n-2) + n^2$ forces $e = n - 1$ (the last term has a strictly positive
second factor) and $S = \binom e2$, i.e. every two edges share a vertex. A family of pairwise
intersecting edges of a simple graph is a star or a triangle, and forests have no triangles;
so $F$ is a tree all of whose edges pass through one vertex: $F = K_{1,n-1}$. Conversely the
star has $e = n-1$ and $S = \binom{n-1}{2} = \binom e2$. $\square$

**Remark 5.2 (the star is extremal and $\mathrm{ISO}_2$ is asymptotically tight) [S-5].**
For $K_{1,m}$ ($n = m+1$), $I(K_{1,m};x) = (1+x)^m + x$, so $p_1 = m + 1 = \binom m1 + 1$,
$p_2 = \binom m2$, $p_3 = \binom m3$: the coefficient $p_1$ exceeds the "binomial" value by
exactly $1$ (the centre), and this is what makes the star extremal at $r = 2$. Indeed

$$Q_2(K_{1,m}) = 2\binom m2^2 + (m+1)^2 - 3(m+1)\binom m3 = m(m-1) + (m+1)^2 = (n-1)(n-2) + n^2,$$

and the dimensionless margin is

$$\frac{Q_2}{p_1 p_2} = \frac{(n-1)(n-2) + n^2}{n\binom{n-1}{2}} = \frac 2n + \frac{2n}{(n-1)(n-2)} \;\xrightarrow[n\to\infty]{}\; 0 .$$

Since $p_1 p_2$ is the same for all trees of order $n$, Theorem 5.1 says the star minimises
both $Q_2$ and the margin among trees of order $n$, and $Q_2$ among all forests of order $n$.
This matters for any strategy that tries to prove $\mathrm{ISO}_r$ inductively: at $r = 2$
there is no slack to spare on stars, so every estimate used must be exact on $K_{1,n-1}$.
(By contrast, for the binomial sequence itself, i.e. $I(\overline{K_m};x) = (1+x)^m$, the margin
at every $r$ is $1 + r/(m-r+1) > 1$.) [S-5] verifies these identities symbolically, checks
$Q_2 \ge g(e) \ge (n-1)(n-2)+n^2$ for all 2948 non-isomorphic forests with $n \le 12$ with
equality exactly once per order, and checks $g(e) \ge g(n-1) \ge 1$ for all integers
$1 \le n \le 60$, $0 \le e \le n-1$.

---

## 6. $\mathrm{WR}_1$ and $\mathrm{WR}_2$ hold wherever the framework needs them

**Theorem 6.1 [S-6].** For every forest:

1. $\mathrm{WR}_1$ ($p_0 \le p_1$, i.e. $1 \le n$) holds.
2. $\mathrm{WR}_2$ ($p_1 \le 2p_2$, i.e. $n \le n(n-1) - 2e$) holds whenever $n \ge 4$.
3. If $n \le 3$ then $L(\alpha) \le 2$, so $r = 2$ never satisfies $r \le L(\alpha) - 1$: the
   framework never needs $\mathrm{WR}_2$ (nor $\mathrm{ISO}_2$) for $n \le 3$.

Consequently (H1) of Theorem 2.1 is satisfied at $r = 1$ and $r = 2$ (whenever these indices
belong to the prefix $1 \le r \le L(\alpha) - 1$) for every forest.

*Proof.* (1) is $n \ge 1$. (2) By Theorem 3.1, $2p_2 - p_1 = n(n-1) - 2e - n$, and since
$e \le n - 1$ for a forest,

$$2p_2 - p_1 \;\ge\; n(n-1) - 2(n-1) - n = (n-1)(n-2) - n = (n-2)^2 - 2 \;\ge\; 2 \quad (n \ge 4).$$

(3) $\alpha \le n \le 3$ and $L$ is non-decreasing with $L(3) = 2$ (Fact 0.2), so
$L(\alpha) - 1 \le 1 < 2$. $\square$

Item (3) is not vacuous: for $P_3$ we have $p = (1,3,1)$ and $\mathrm{WR}_2$ fails
($3 > 2\cdot 1$), but $\alpha(P_3) = 2$, $L = 1$, and `checks.analyze` correctly reports no
prefix failure ([S-6]). [S-6] also confirms $\mathrm{WR}_1$ for all forests $n \le 12$ and
$\mathrm{WR}_2$ for all forests $4 \le n \le 12$.

---

## 7. Real-rooted independence polynomials satisfy $\mathrm{ISO}_r$ at every index

**Newton's inequalities (classical; Theorem 8.3).** If $f(x) = \sum_{k=0}^{d} c_k x^k$ is a
real polynomial of degree $d$ all of whose roots are real, then with
$E_k := c_k / \binom dk$ one has $E_k^2 \ge E_{k-1} E_{k+1}$ for $1 \le k \le d-1$.

**Theorem 7.1 [S-7].** Let $F$ be a forest (or any graph) with $\alpha \ge 2$ such that
$I(F;x)$ has only real roots. Then for every $1 \le r \le \alpha - 1$,

$$Q_r \;\ge\; p_{r-1}^2 \;>\; 0, \qquad\text{in particular } \mathrm{ISO}_r \text{ holds.}$$

*Proof.* All $p_k$ are positive (Fact 0.1), so $I(F;x) > 0$ for $x \ge 0$ and the real roots
are negative; $I$ has degree exactly $\alpha$. Newton's inequalities with $d = \alpha$,
$c_k = p_k$ give, for $1 \le r \le \alpha - 1$,

$$p_r^2 \;\ge\; p_{r-1}\,p_{r+1}\,\frac{\binom{\alpha}{r}^2}{\binom{\alpha}{r-1}\binom{\alpha}{r+1}}
= p_{r-1}\,p_{r+1}\Bigl(1 + \frac1r\Bigr)\Bigl(1 + \frac{1}{\alpha - r}\Bigr), \tag{7.1}$$

using $\binom{\alpha}{r}/\binom{\alpha}{r-1} = (\alpha - r + 1)/r$ and
$\binom{\alpha}{r}/\binom{\alpha}{r+1} = (r+1)/(\alpha - r)$ (checked symbolically in [S-7]). Since

$$\Bigl(1 + \frac1r\Bigr)\Bigl(1 + \frac{1}{\alpha - r}\Bigr) - 1 = \frac{\alpha + 1}{r(\alpha - r)}, \tag{7.2}$$

(7.1) is equivalent to $r\,(p_r^2 - p_{r-1}p_{r+1}) \ge p_{r-1}p_{r+1}\,\frac{\alpha+1}{\alpha-r}$,
and $\frac{\alpha+1}{\alpha-r} > 1$, so $r\,(p_r^2 - p_{r-1}p_{r+1}) \ge p_{r-1}p_{r+1}
> p_{r-1}(p_{r+1} - p_{r-1})$ (as $p_{r-1}^2 > 0$). Now use the rearrangement

$$Q_r = r\,(p_r^2 - p_{r-1}p_{r+1}) + p_{r-1}\,(p_{r-1} - p_{r+1}) \tag{7.3}$$

(checked by `sympy.expand`): $Q_r \ge p_{r-1}p_{r+1} + p_{r-1}(p_{r-1} - p_{r+1}) = p_{r-1}^2 > 0$.

Equivalently, with the *Newton defect*
$D := p_r^2 - p_{r-1}p_{r+1}(1+\frac1r)(1+\frac1{\alpha-r}) \ge 0$, one has the identity

$$Q_r = p_{r-1}^2 + r\,D + p_{r-1}\,p_{r+1}\,\frac{r+1}{\alpha - r}, \tag{7.4}$$

whose three terms are all $\ge 0$ (checked symbolically in [S-7]). $\square$

**Corollary 7.2 (claw-free graphs).** If $G$ is claw-free (no induced $K_{1,3}$) then, by the
Chudnovsky–Seymour theorem (Theorem 8.2, cited), $I(G;x)$ is real-rooted, so
$\mathrm{ISO}_r$ holds for all $1 \le r \le \alpha - 1$. A forest is claw-free iff its maximum
degree is $\le 2$, i.e. iff it is a disjoint union of paths; so paths and all linear forests
satisfy $\mathrm{ISO}_r$ at every index. [S-7] checks that $I(P_n;x)$ is real-rooted for
$n \le 12$ (exact root isolation) and that $Q_r \ge p_{r-1}^2$ at every index for $P_n$,
$n \le 60$.

**Caution 7.3 (real-rootedness fails for stars) [S-7].** Do not expect real-rootedness for
general trees. $K_{1,m}$ contains a claw iff $m \ge 3$, and
$I(K_{1,m};x) = (1+x)^m + x$ is then not real-rooted: for $m = 3$,
$x^3 + 3x^2 + 4x + 1$ has discriminant $-31 < 0$, hence exactly one real root; for
$3 \le m \le 10$, sympy's exact root isolation finds $1$ real root ($m$ odd) or $2$ ($m$ even),
never $m$. (For $m = 2$, $K_{1,2} = P_3$ is claw-free and $x^2 + 3x + 1$, of discriminant $5$,
is real-rooted, as it must be.) Theorem 7.1 therefore covers only claw-free forests; the
proof of $\mathrm{ISO}_1, \mathrm{ISO}_2$ for all forests in Sections 4–5 does not go through
real-rootedness.

**Proposition 7.4 (stars satisfy ISO at every index) [S-7].** For $m \ge 2$ and every
$1 \le r \le m - 1$, $Q_r(K_{1,m}) > 0$.

*Proof.* $r = 1$: Theorem 4.1. $r = 2$: Theorem 5.1. $r \ge 3$: the three coefficients
$p_{r-1}, p_r, p_{r+1}$ of $(1+x)^m + x$ involved are $\binom m{r-1}, \binom mr, \binom m{r+1}$,
the coefficients of the real-rooted polynomial $(1+x)^m$ of degree $m$; the computation of
Theorem 7.1 with $\alpha$ replaced by $m$ (identity (7.4) with $a = m$, $D \ge 0$ by Newton,
$(r+1)/(m-r) > 0$) gives $Q_r \ge \binom m{r-1}^2 > 0$. $\square$

So stars are not counterexamples to $\mathrm{ISO}_r$ at any index; they are merely the tight
case at $r = 2$ (Remark 5.2) and the reason crude bounds fail at $r = 3$ (Section 10).

---

## 8. Cited theorems (not proved here)

**Theorem 8.1 (Levit–Mandrescu tail theorem; TAIL for forests).** Let $G$ be a bipartite
graph — more generally a König–Egerváry graph — with independence number $\alpha \ge 1$,
and $s_k$ its independence-sequence. Then

$$s_{\lceil (2\alpha - 1)/3 \rceil} \;\ge\; s_{\lceil (2\alpha - 1)/3 \rceil + 1} \;\ge\; \dots \;\ge\; s_{\alpha - 1} \;\ge\; s_\alpha .$$

Every forest is bipartite, so TAIL (with $L(\alpha) = \lceil (2\alpha-1)/3 \rceil$) holds for
every forest. References:

* V. E. Levit and E. Mandrescu, *Independence polynomials and the unimodality conjecture for
  very well-covered, quasi-regularizable, and perfect graphs*, in: *Graph Theory in Paris*
  (A. Bondy, J. Fonlupt, J.-L. Fouquet, J.-C. Fournier, J. L. Ramírez Alfonsín, eds.), Trends in
  Mathematics, Birkhäuser, Basel, 2007, pp. 243–254, doi:10.1007/978-3-7643-7400-6_19;
  preprint arXiv:math/0406623 (bipartite graphs — stated there as a corollary of the perfect-graph
  bound $s_{\lceil(\omega\alpha-1)/(\omega+1)\rceil} \ge \dots \ge s_\alpha$ with $\omega \le 2$ —
  and quasi-regularizable graphs on $2\alpha$ vertices; in particular trees). The paper itself
  exhibits non-bipartite graphs, e.g. one with $I(G;x) = 1 + 6x + 8x^2$, for which the tail
  inequality fails.
* V. E. Levit and E. Mandrescu, *Partial unimodality for independence polynomials of
  König–Egerváry graphs*, Congressus Numerantium 179 (2006), 109–119.

**Scope warning [S-9].** The tail theorem is sometimes quoted as valid for every graph. It is
**not**: for $G = 2K_3$ (two disjoint triangles), $I(G;x) = (1+3x)^2 = 1 + 6x + 9x^2$, so
$\alpha = 2$, $L(2) = 1$ and $s_1 = 6 < 9 = s_2$. More generally $\alpha K_m$ has
$s_\alpha / s_{\alpha-1} = m/\alpha > 1$ whenever $m > \alpha$. The framework only applies TAIL
to forests, which are bipartite, so this does not affect any conclusion of this note, but the
hypothesis "bipartite (or König–Egerváry)" must be kept in the statement. [S-9] verifies
$I(2K_3;x)$ by brute force and checks TAIL on all 2948 non-isomorphic forests with $n \le 12$
(a consistency check of the cited theorem, not a proof).

**Theorem 8.2 (Chudnovsky–Seymour).** If $G$ is claw-free, then all roots of $I(G;x)$ are
real. — M. Chudnovsky and P. Seymour, *The roots of the independence polynomial of a clawfree
graph*, J. Combin. Theory Ser. B 97 (2007), 350–357.

**Theorem 8.3 (Newton's inequalities).** As stated at the beginning of Section 7. —
G. H. Hardy, J. E. Littlewood, G. Pólya, *Inequalities*, Cambridge University Press, 2nd ed.
1952, §2.22 (Theorem 51); C. P. Niculescu, *A new look at Newton's inequalities*, J. Inequal.
Pure Appl. Math. 1 (2000), Article 17. (In our application all roots are negative reals, so the
classical version for positive reals $t_i = -\rho_i$ suffices: with
$I(F;x) = p_\alpha\prod_i (x + t_i)$ one has $p_k = p_\alpha\, e_{\alpha - k}(t)$ and
$\binom{\alpha}{k} = \binom{\alpha}{\alpha-k}$, so the inequalities for the elementary symmetric
means of the $t_i$ are exactly $E_k^2 \ge E_{k-1}E_{k+1}$ for $E_k = p_k/\binom{\alpha}{k}$.)

---

## 9. Map of the machine verification

`scripts/verify_lemmas_symbolic.py` prints one `PASS`/`FAIL` line per item, followed by
every sub-check (with `-q`, only the per-item lines and any failures), and exits with status 1
if any sub-check fails. Symbolic items end with an assertion that no `Float` atom occurs in
any expression used.

| Item | What is checked |
| --- | --- |
| [S-1] | (1.1), (1.2), (7.3) by `expand`; ratio identity $rx + 1/x - (r+1) = (rx-1)(x-1)/x$; $f'' = 2/x^3$; $f(1/r) = f(1) = r+1$; brute force of Lemma 1.1 on integers $r \le 6$, $p_{r-1} \le 25$, $p_{r+1} \le 60$ |
| [S-2] | $L(a)$ equals `tail_cutoff(a)` and Fact 0.2 for $a < 300$; Theorems 2.1/2.2 on all sequences with $\alpha \le 6$, entries $\le 6$; the witness $(1,5,4,5,1)$ |
| [S-3] | Theorem 3.1 and Prop. 3.3 vs `indpoly_forest` on all trees $n \le 12$ and 400 random forests $n \le 40$ (117 cross-checked by brute force); Remark 3.2 on random graphs; degenerate cases |
| [S-4] | $Q_1 = n + 1 + 2e$ by `expand`; stars $n \le 19$ |
| [S-5] | (5.1), leading coefficient $2 - 3n/2$, closed forms of $g(0)$, $g(n-1)$, (5.2), $g(e) - g(n-1)$, (5.3), star value and margin, `limit` $= 0$; $g(e) \ge g(n-1) \ge 1$ for $n \le 60$; all forests $n \le 12$ with the star as unique minimiser; $n \in \{1,2\}$ |
| [S-6] | $2p_2 - p_1 = n(n-1) - 2e - n$, $(n-1)(n-2) - n = (n-2)^2 - 2$; $L(1), L(2), L(3)$; $P_3$; all forests $n \le 12$ |
| [S-7] | binomial ratio identity (symbolic and exact for $\alpha \le 40$), (7.2), (7.3), (7.4); paths real-rooted ($n \le 12$) and $Q_r \ge p_{r-1}^2$ ($n \le 60$); $(1+x)^3 + x$ has discriminant $-31$ and one real root; $(1+x)^m + x$ for $m \le 10$; stars satisfy ISO at all indices ($n \le 60$) |
| [S-8] | all 5447 trees $n \le 14$ (`free_tree_layouts` → `layout_to_parent` → `indpoly_parent_array`): the reduction lemma's conclusion never fails (16117 hypothesis instances), $Q_1 = n + 1 + 2e$ exactly, $Q_2$ equals (5.0) exactly and $Q_2 \ge g(e)$, star unique minimiser, `analyze` consistent |
| [S-9] | $I(2K_3;x) = 1 + 6x + 9x^2$ (TAIL fails), $\alpha K_m$ ratio; TAIL on all forests $n \le 12$ |
| [S-10] | $Q_3(K_{1,m}) = \binom m2\binom{m+1}{3}$; crude bound equals $\binom m2 m(m-1)(3-m)/2 < 0$ for $m \ge 4$; stars $m \le 40$ numerically |
| [S-11] | algebra of Theorem 11.2 (Addendum): $3p_3 - p_2 = 3\binom n3 - \binom n2 - e(3n-7) + 3S$, $3\binom n3 - \binom n2 - (n-1)(3n-7) = \tfrac{(n-1)(n-2)(n-7)}{2}$, tree case $\tfrac{(n-2)(n-3)(n-4) - (n-1)(n-2)}{2}$; $S \ge n-2$ for trees (equality iff path) and $\mathrm{WR}_3$ on all forests $n \le 12$ with $\alpha \ge 6$ |

`tests/test_lemmas.py` runs each item as a pytest test, checks that an injected failing
sub-check produces a `FAIL` line and exit status 1, and adds independent tests (named tree
families, all forests $n \le 11$, the Newton chain on $P_{10}$, Corollary 2.4 on all forests
$n \le 11$, etc.).

---

## 10. What is NOT proved

1. **$\mathrm{ISO}_r$ for $r \ge 3$ for general forests is not proved** in Sections 1–9, and
   neither is $\mathrm{WR}_r$ for $r \ge 3$. The framework needs both for
   $1 \le r \le L(\alpha) - 1$, so for forests with $\alpha \ge 6$ (where $L \ge 4$) Sections 1–9
   do *not* establish unimodality; Corollary 2.4 covers exactly $\alpha \le 5$. (The Addendum,
   Section 11, adds $\mathrm{WR}_3$ wherever the framework needs it — algebra machine-checked in
   [S-11] — and, for *trees only*, $\mathrm{ISO}_3$ via `docs/ISO3_TREES_THEOREM.md`, which is not
   audited here. $\mathrm{ISO}_3$ for forests and everything at $r \ge 4$ remain open.) The
   repository's exhaustive scans (`scripts/verify_exhaustive.py`) are falsification evidence for
   finitely many orders only.

2. **Why $r = 3$ is already hard.** By Prop. 3.3,
   $p_4 = \binom n4 - e\binom{n-2}2 + (n-3)S + \bigl(\binom e2 - S\bigr) - T - P$ with
   $T = \sum_v \binom{d_v}3$ and $P$ = number of induced $P_4$'s. A lower bound for
   $Q_3 = 3p_3^2 + p_2^2 - 4p_2p_4$ needs an *upper* bound for $p_4$. The crude bound that
   simply drops the non-negative terms $T$ and $P$, $p_4 \le U_4 := p_4 + T + P$, fails near the
   star: on $K_{1,m}$ one has $T = \binom m3$, $P = 0$, and [S-10]

   $$3p_3^2 + p_2^2 - 4p_2U_4 = \binom m2\,\frac{m(m-1)(3-m)}{2} < 0 \quad (m \ge 4),
   \qquad\text{whereas}\qquad Q_3(K_{1,m}) = \binom m2\binom{m+1}3 > 0 .$$

   So the crude bound cannot prove $\mathrm{ISO}_3$ even for stars (which do satisfy it,
   Prop. 7.4). Note also that $P = \sum_{uv}(d_u-1)(d_v-1)$ is not a function of the degree
   sequence alone. A rigorous proof of $\mathrm{ISO}_3$ for all forests therefore needs a genuine
   extremal optimisation over the degree data $(e, S, T, P)$ — in particular a lower bound for
   $T$ that is exact on stars (where $P = 0$, so dropping $P$ alone costs nothing there), in the
   spirit of the equality analysis in Step 5 of Theorem 5.1 — not a term-dropping estimate.
   At the time of writing, a separate document in this repository,
   `docs/ISO3_TREES_THEOREM.md` (replayed by `scripts/prove_iso3_trees.py`), pursues exactly
   such an optimisation for *trees*; it is not audited in this note, and by its own remarks the
   forest case is not covered there either.

3. **Real-rootedness** is available only for claw-free forests (linear forests), Corollary 7.2;
   it fails for all stars $K_{1,m}$, $m \ge 3$ (Caution 7.3). No claim is made about the roots of
   $I(F;x)$ for general trees.

4. **TAIL** is not proved here; it is cited (Theorem 8.1) and is a theorem for bipartite and
   König–Egerváry graphs only, not for all graphs (Section 8, scope warning).

5. The numerical enumerations in the script (all trees $n \le 14$, all forests $n \le 12$,
   random forests $n \le 40$, integer boxes) are consistency checks; none of the theorems above
   depends on them.

---

## 11. Addendum (2026-09-02): $\mathrm{ISO}_3$ for all trees, and $\mathrm{WR}_3$

**Theorem 11.1 ($\mathrm{ISO}_3$ for trees).** For every tree, $Q_3 = 3p_3^2 + p_2^2 - 4p_2p_4 \ge 0$.
This is proved in `docs/ISO3_TREES_THEOREM.md` (replayed by `scripts/prove_iso3_trees.py`)
by exactly the route item 2 above calls for: keep $T$ via the Cauchy–Schwarz bound
$3T \ge 2S^2/D_2 - S$ ($D_2 = 2(n-1) - \ell$, $\ell$ = number of leaves), drop only $P \ge 0$,
use $S \le \binom{\ell}{2} + n - \ell - 1$, and certify the resulting two-variable polynomial
with exact algebra (shift certificate, real-root isolation, Bernstein subdivision). Item 2 is
therefore superseded. **Theorem 11.1' ($\mathrm{ISO}_3$ for forests).** The extension to every
forest is proved in `docs/ISO3_FORESTS_THEOREM.md` (replayed by `scripts/prove_iso3_forests.py`):
the leaf bound is weakest for a single non-trivial component, the sparse regime $S \le e-1$ is
handled through $\ell \ge 2e - 2S$ (from $\binom d2 \ge d/2$), monotonicity of the bound in $n$
reduces every forest to the tree polynomial at $n = e+1$, forests with $e \le 5$ edges reduce to
26 explicit cores times $(1+x)^z$, and $I = 0$ is the real-rooted case.

**Theorem 11.2 ($\mathrm{WR}_3$ wherever needed) [tests/test_core.py].** For every forest,
$\mathrm{WR}_3$ ($p_2 \le 3p_3$) holds whenever $3 \le L(\alpha) - 1$, i.e. whenever the
framework needs it.

*Proof.* By Theorem 3.1 and $S \ge 0$, $e \le n-1$,
$3p_3 - p_2 \ge 3\binom n3 - 3e(n-2) - \binom n2 + e \ge \tfrac{n(n-1)(n-3)}{2} - (n-1)(3n-7)
= \tfrac{(n-1)(n-2)(n-7)}{2} \ge 0$ for $n \ge 7$. If $n \le 6$ then $\alpha \le 6$ and
$L(\alpha) - 1 \ge 3$ forces $\alpha = 6 = n$, i.e. $F = \overline{K_6}$, where
$p_2 = 15 \le 60 = 3p_3$. For trees the bound is sharper ($S \ge n-2$ gives
$3p_3 - p_2 \ge \tfrac{(n-2)(n-3)(n-4) - (n-1)(n-2)}{2} \ge 0$ for $n \ge 6$). $\square$

**Corollary 11.3.** Every forest with $\alpha \le 6$ has a unimodal independence polynomial by the
framework alone (Theorem 2.1 with $L(\alpha) \le 4$, Theorems 4.1, 5.1, 6.1, 11.1', 11.2 and the
cited TAIL). This is of course far weaker than the exhaustive verification for $n \le 29$; its
point is structural: each further index $r$ for which $\mathrm{ISO}_r$ and $\mathrm{WR}_r$ are
proved for all forests extends the range of $\alpha$ covered by the framework by $3/2$.
