# $\mathrm{ISO}_r$ in the tail: the exact range provable from Levit–Mandrescu and Fisher–Ryan

**Scope.** This note determines, rigorously, for which indices $r$ the inequality

$$\mathrm{ISO}_r:\qquad Q_r := r\,p_r^2 + p_{r-1}^2 - (r+1)\,p_{r-1}\,p_{r+1} \;\ge\; 0$$

can be proved *for every forest* from the following cited tools: the Levit–Mandrescu
double-counting bound, the Fisher–Ryan monotonicity, Zykov's bound, and elementary algebra.
The result is a theorem covering the top part of the tail, $r \ge \alpha - \lfloor(\sqrt{4\alpha+1}-1)/2\rfloor$
(Theorem 3.1), a slightly larger exactly-tabulated range (Theorem 4.1), and a precise
**obstruction** (Theorem 5.2) showing that these tools *cannot* reach the whole tail
$r \ge L(\alpha) = \lceil (2\alpha-1)/3\rceil$ for any $\alpha \notin \{2,\dots,7,10\}$, together with an
explanation of what is missing (Section 5.3) and a numerical study of the gap (Section 6).

**Machine verification.** Every identity, inequality and table below is checked with exact
arithmetic (sympy polynomial identities, exact real-root counting, Python integers,
`fractions.Fraction`; no floating point in any statement) by

```
python3 scripts/prove_iso_tail.py        # PASS/FAIL per item, markers, exit 1 on failure
```

which writes `reports/iso_tail_proof.json`. Tags **[T-k]** refer to item `k` of the script. The
markers printed are `PASS_EXACT_ISO_TAIL_RANGE_ROOT` (Theorem 3.1 and its closed form),
`PASS_EXACT_ISO_TAIL_FR_REFINEMENT` (Theorem 4.1 and the table $r_B$),
`PASS_EXACT_ISO_TAIL_OBSTRUCTION_WITNESSES` (Theorem 5.2), `PASS_EXACT_ISO_TAIL_NUMERIC_CONSISTENCY`
(Section 6) and `PASS_EXACT_ISO_TAIL_VARIANCE_FORM` (Proposition 5.4). Enumerations of trees and
forests are consistency checks only; no theorem depends on them.

**Status summary.**

| Statement | Status |
| --- | --- |
| Theorem 3.1: $\mathrm{ISO}_r$ for every forest when $(\alpha-r)^2 \le r$, i.e. $r \ge r_A(\alpha) = \alpha - \lfloor(\sqrt{4\alpha+1}-1)/2\rfloor$ | **proved** (LM + AM–GM) |
| Theorem 3.3: $\mathrm{ISO}_r$ for every forest on $n$ vertices when $(\alpha-r)\,n/\alpha \le 2\sqrt r$ | **proved** (FR + AM–GM) |
| Theorem 4.1: $\mathrm{ISO}_r$ for every forest when $P_{r,\alpha-r}(w)\ge 0$ on $[0,2(\alpha-r+1)]$; exact table $r_B(\alpha)$, $\alpha \le 60$ | **proved** (LM + FR + Zykov) |
| Corollary 4.3: whole tail $r \ge L(\alpha)$ covered for $\alpha \in \{2,3,4,5,6,7,10\}$ | **proved** |
| Theorem 5.2: for every other $\alpha \le 60$ and every $L(\alpha) \le r < r_B(\alpha)$, the tools are *consistent* with $Q_r<0$ | **proved** (explicit witnesses) |
| $\mathrm{ISO}_r$ for $L(\alpha) \le r < r_B(\alpha)$, $\alpha \ge 8$, $\alpha \ne 10$ | **not proved** (Section 7) |

---

## 1. Setting, notation, cited tools

$F$ is a forest with $n \ge 1$ vertices, $p_k$ the number of independent $k$-sets,
$\alpha$ the independence number, $L(\alpha) = \lceil (2\alpha-1)/3 \rceil$ (`checks.tail_cutoff`), and for
$1 \le r \le \alpha-1$

$$d := \alpha - r \ \ (\ge 1),\qquad x := \frac{p_r}{p_{r-1}},\qquad y := \frac{p_{r+1}}{p_r},\qquad
t_k := \Bigl(\frac{p_k}{\binom{\alpha}{k}}\Bigr)^{1/k}\ (1 \le k \le \alpha).$$

All $p_k$ ($0\le k\le\alpha$) are positive (Fact 0.1 of `REDUCTION_LEMMA_AND_PROVED_CASES.md`), so $x, y, t_k$
are well defined. For an independent set $S$ let $H_S := F - N[S]$ (delete $S$ and all its
neighbours) and $e(S) := |V(H_S)|$, the number of one-vertex extensions of $S$.

**Tool LM (Levit–Mandrescu).** V. E. Levit, E. Mandrescu, *Independence polynomials and the
unimodality conjecture for very well-covered, quasi-regularizable, and perfect graphs*,
arXiv:math/0406623 (Graph Theory in Paris, Birkhäuser 2007, 243–254).

* *Lemma 2.3 there* (double counting): for any graph, $(k+1)\,p_{k+1} = \sum_{|S|=k} e(S) \le \omega_{\alpha-k}\,p_k$,
  where $\omega_{\alpha-k} = \max\{ e(S) : S \text{ independent}, |S| = k\}$.
* *Proposition 2.6 there* (perfect graphs, via Lovász' $|V(H)| \le \alpha(H)\,\omega(H)$): for a
  perfect graph $\omega_{\alpha-k} \le \omega\,(\alpha-k)$. For bipartite graphs (*Corollary 2.7*,
  trees *Corollary 2.8*) $\omega \le 2$, hence

$$(k+1)\,p_{k+1} \;\le\; 2(\alpha-k)\,p_k \qquad (0 \le k \le \alpha-1). \tag{LM}$$

  Elementary form of the argument for a forest: $H_S$ is a forest with $\alpha(H_S) \le \alpha - k$
  (as $S \cup I$ is independent for every independent $I \subseteq V(H_S)$), and a bipartite graph on
  $m$ vertices has an independent set of size $\ge m/2$ (its larger colour class), so
  $e(S) = |V(H_S)| \le 2\alpha(H_S) \le 2(\alpha-k)$. Consequently $p_{k+1} \le p_k$ once
  $k+1 \ge 2(\alpha-k)$, i.e. for $k \ge (2\alpha-1)/3$: this is TAIL.

**Tool FR (Fisher–Ryan).** D. C. Fisher, J. Ryan, *Bounds on the number of complete subgraphs*,
Discrete Math. 103 (1992) 313–320; used in the form of Theorem 2.1 of A. Basit, D. Galvin, *On the
independent set sequence of a tree*, arXiv:2006.12562 (Electron. J. Combin. 28(3) (2021) P3.23):
for **every** graph with independence number $\alpha$,

$$t_1 \;\ge\; t_2 \;\ge\; \dots \;\ge\; t_{\alpha}. \tag{FR}$$

**Tool Z (Zykov).** Theorem 2.2 of Basit–Galvin: for every graph, $p_k \le \binom{\alpha}{k}(n/\alpha)^k$,
i.e. $t_k \le n/\alpha$. (This also follows from (FR) since $t_1 = p_1/\alpha = n/\alpha$.) For a forest,
$\alpha \ge n/2$ (bipartite), hence

$$1 \;\le\; t_k \;\le\; \frac{n}{\alpha} \;\le\; 2 \qquad (1 \le k \le \alpha), \tag{Z}$$

the lower bound being Fact 0.1 ($p_k \ge \binom{\alpha}{k}$). Equality $t_k = 2$ for some $k \ge 1$
forces $n = 2\alpha$ and $p_k = 2^k\binom{\alpha}{k}$, i.e. $F = \alpha K_2$ (every choice of $k$ matching
edges and one endpoint each must be independent, so no edge joins two matching edges).

**Also cited but not needed for the theorems.** Basit–Galvin Theorem 1.3 (the tail decreases from
$\lceil \alpha(n-1)/(\alpha+n) \rceil$ on, for every graph; equals $L(\alpha)$ when $n = 2\alpha$) and Theorem 1.6
(every maximal independent set of a tree has size $\ge \lceil (n-\alpha+1)/2 \rceil$). Theorem 1.6 gives
$e(S) \ge 1$ for all independent $S$ with $|S| < (n-\alpha+1)/2$, i.e. $\mathrm{WR}_k$ for small $k$; it says
nothing at tail indices (there $|S| \approx 2\alpha/3 > (n-\alpha+1)/2$ since $n \le 2\alpha$), see Remark 5.5.

---

## 2. The margin, AM–GM, and the window

**Lemma 2.1 [T-1.1, T-1.2, T-1.4].** For $1 \le r \le \alpha-1$,

$$\frac{Q_r}{p_{r-1}p_r} \;=\; r x + \frac1x - (r+1)\,y, \tag{2.1}$$

$$r x + \frac1x - 2\sqrt r \;=\; \frac{(\sqrt r\,x - 1)^2}{x} \;\ge\; 0, \tag{2.2}$$

$$r x + \frac1x - (r+1) \;=\; \frac{(r x - 1)(x-1)}{x}. \tag{2.3}$$

*Proof.* Write $p_{r-1} = a$, $p_r = a x$, $p_{r+1} = a x y$ in $Q_r$ and divide by $a^2 x$; (2.2) and (2.3)
are one-line expansions. All three are checked by `sympy.expand`. $\square$

So $\mathrm{ISO}_r \iff (r+1)\,y \le r x + 1/x$, and $r x + 1/x \ge 2\sqrt r$ with equality iff $x = 1/\sqrt r$.

**Lemma 2.2 (ratio bounds).** For every forest and $1 \le r \le \alpha - 1$:

$$(r+1)\,y \;\le\; 2d, \qquad r x \;\le\; 2(d+1) \tag{2.4}$$

by (LM) at $k = r$ and $k = r-1$; and, for every graph,

$$r x \;=\; (d+1)\,\frac{t_r^{\,r}}{t_{r-1}^{\,r-1}}, \qquad (r+1)\,y \;=\; d\,\frac{t_{r+1}^{\,r+1}}{t_r^{\,r}} \;\le\; d\,t_{r+1} \;\le\; d\,t_r \;\le\; d\,\frac{n}{\alpha}. \tag{2.5}$$

*Proof.* (2.4) is (LM). For (2.5) substitute $p_k = \binom{\alpha}{k} t_k^k$ (with $t_0^0 := 1$) and use
$\binom{\alpha}{r}/\binom{\alpha}{r-1} = (d+1)/r$, $\binom{\alpha}{r+1}/\binom{\alpha}{r} = d/(r+1)$ [T-2.1]; then
$t_{r+1} \le t_r$ (FR) and $t_r \le t_1 = n/\alpha$ (FR, Z). $\square$

**Lemma 2.3 (the window) [T-1.3, T-1.5].** Let $d^2 > r$ and $x_\pm := \bigl(d \pm \sqrt{d^2-r}\bigr)/r$. Then

$$r x^2 - 2 d x + 1 \;=\; r\,(x - x_-)(x - x_+), \tag{2.6}$$

so $r x + 1/x < 2d$ **iff** $x_- < x < x_+$. Moreover $r x + 1/x = r + 1$ at $x = 1$ and $x = 1/r$, and

$$r + 1 \;\ge\; 2d \quad\iff\quad r \;\ge\; L(\alpha), \tag{2.7}$$

so for $r \ge L(\alpha)$ one has $1/r \le x_- < x_+ \le 1$: the window lies inside the "WR-holds-and-descending" interval.

*Proof.* (2.6) is a polynomial identity (checked with $r = d^2 - D^2$, $D = \sqrt{d^2-r}$). (2.7):
$r+1 \ge 2(\alpha - r) \iff 3r \ge 2\alpha - 1 \iff r \ge \lceil (2\alpha-1)/3\rceil$ (checked for all $\alpha \le 300$).
The last claim: for $r \ge L$, $r x + 1/x \ge r+1 \ge 2d$ at $x = 1/r$ and $x = 1$, and $r x + 1/x$ is
decreasing on $(0, 1/\sqrt r]$ and increasing on $[1/\sqrt r, \infty)$, so the set where it is $< 2d$ is
contained in $(1/r, 1)$. $\square$

---

## 3. Theorem A: the root range

**Theorem 3.1 [T-1.1, T-1.2, T-1.6].** Let $F$ be a forest with independence number $\alpha \ge 2$ and let
$1 \le r \le \alpha - 1$ with

$$(\alpha - r)^2 \;\le\; r, \qquad\text{equivalently}\qquad d(d+1) \le \alpha \quad (d = \alpha - r).$$

Then $\mathrm{ISO}_r$ holds; more precisely $\dfrac{Q_r}{p_{r-1}p_r} \ge 2\sqrt r - 2(\alpha - r) \ge 0$.

*Proof.* By (2.1), (2.2) and (2.4): $Q_r/(p_{r-1}p_r) = r x + 1/x - (r+1) y \ge 2\sqrt r - 2d$, and
$2\sqrt r \ge 2d \iff r \ge d^2$. Finally $d^2 \le r = \alpha - d \iff d(d+1) \le \alpha$. $\square$

**Corollary 3.2 (closed form) [T-1.6].** Put

$$d_{\max}(\alpha) := \Bigl\lfloor \frac{\sqrt{4\alpha+1} - 1}{2} \Bigr\rfloor = \max\{ d \ge 0 : d(d+1) \le \alpha \},
\qquad r_A(\alpha) := \alpha - d_{\max}(\alpha).$$

Then $\{ r : 1 \le r \le \alpha-1,\ (\alpha-r)^2 \le r \} = \{ r_A(\alpha), \dots, \alpha - 1\}$, so $\mathrm{ISO}_r$
holds for every forest with independence number $\alpha$ and every $r \ge r_A(\alpha)$. One has
$r_A(\alpha) \ge L(\alpha)$ for all $\alpha \ge 2$ (the proved range lies inside the tail), with equality exactly
for $\alpha \in \{2, 3, 4, 6, 7\}$. Asymptotically $r_A(\alpha) = \alpha - \sqrt{\alpha} + O(1)$, while the tail
starts at $L(\alpha) \approx 2\alpha/3$.

*Proof.* $d(d+1) \le \alpha \iff d \le (\sqrt{4\alpha+1}-1)/2$; the script verifies
$d_{\max}(d_{\max}+1) \le \alpha < (d_{\max}+1)(d_{\max}+2)$ with `isqrt` for all $\alpha \le 10^5$, the set identity for
$\alpha \le 400$, and $r_A \ge L$ for $\alpha \le 10^5$. $\square$

| $\alpha$ | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 20 | 30 | 40 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| $L(\alpha)$ | 1 | 2 | 3 | 3 | 4 | 5 | 5 | 6 | 7 | 7 | 8 | 9 | 9 | 10 | 11 | 13 | 20 | 27 |
| $r_A(\alpha)$ | 1 | 2 | 3 | 4 | 4 | 5 | 6 | 7 | 8 | 9 | 9 | 10 | 11 | 12 | 13 | 16 | 25 | 35 |
| $r_B(\alpha)$ (Thm 4.1) | 1 | 1 | 1 | 3 | 4 | 5 | 6 | 7 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 16 | 25 | 35 |

In particular the known non-log-concave trees (log-concavity failures at $\alpha-1$ or $\alpha-2$) are
covered: $d = 1$ needs $\alpha \ge 2$ and $d = 2$ needs $\alpha \ge 6$.

**Theorem 3.3 ($n$-refined version) [T-2.6].** For a forest on $n$ vertices, $\mathrm{ISO}_r$ holds whenever

$$(\alpha - r)\,\frac{n}{\alpha} \;\le\; 2\sqrt r, \qquad\text{i.e.}\qquad n^2 (\alpha-r)^2 \le 4 r \alpha^2 .$$

*Proof.* Replace (2.4) by the last inequality of (2.5): $(r+1) y \le d\,n/\alpha$; then argue as in
Theorem 3.1. $\square$ For $n = 2\alpha$ this is Theorem 3.1; for trees with $\alpha$ close to $n$ (many leaves)
it is much better (e.g. $n/\alpha = 3/2$ gives $r \ge 24$ instead of $25$ at $\alpha = 30$, and $r \ge 3$ at
$\alpha = 5$; $n/\alpha \to 1$ gives $d \le 2\sqrt r$). The script tabulates the range for $n/\alpha \in \{1, 3/2, 2\}$.

---

## 4. Theorem B: the Fisher–Ryan refinement and the exact table $r_B(\alpha)$

For $r \ge 1$, $d \ge 1$ define

$$q_{r,d}(w) := w + \frac rw - d\Bigl(\frac{2^{r-1} w}{d+1}\Bigr)^{1/r}\quad (w > 0),\qquad
P_{r,d}(w) := (d+1)\,(w^2 + r)^r - 2^{r-1} d^{\,r}\, w^{r+1}.$$

Then $q_{r,d}(w) \ge 0 \iff P_{r,d}(w) \ge 0$, because
$\bigl(w + r/w\bigr)^r (d+1) - 2^{r-1} d^r w = P_{r,d}(w)/w^r$ [T-2.2] and both sides of
$w + r/w \ge d(2^{r-1}w/(d+1))^{1/r}$ are positive.

**Theorem 4.1 [T-2.1–T-2.4].** Let $F$ be a forest with independence number $\alpha$, $1 \le r \le \alpha-1$,
$d = \alpha - r$. Then either $Q_r > 0$, or

$$\frac{Q_r}{p_{r-1}p_r} \;\ge\; \inf_{\sqrt r \,\le\, w \,\le\, 2(d+1)} q_{r,d}(w).$$

Consequently, if $P_{r,d}(w) \ge 0$ for all $w \in [0, 2(d+1)]$, then $\mathrm{ISO}_r$ holds for every forest with
independence number $\alpha = r + d$.

*Proof.* Put $T := t_r \in [1, 2]$ (by (Z)) and $u := t_r^{\,r}/t_{r-1}^{\,r-1}$, so that $r x = (d+1) u$ by (2.5).
Since $t_r \le t_{r-1} \le 2$ (FR, Z),

$$\frac{T^r}{2^{r-1}} \;\le\; u \;\le\; T. \tag{4.1}$$

By (2.1) and (2.5), $M := Q_r/(p_{r-1}p_r) = g(u) - (r+1) y \ge g(u) - dT$, where
$g(u) := (d+1) u + r/((d+1) u)$ is convex on $(0,\infty)$ with minimum $2\sqrt r$ at $u^* = \sqrt r/(d+1)$.
Set $w := (d+1)\,T^r/2^{r-1}$, so the left end of (4.1) is $w/(d+1)$, $g(w/(d+1)) = w + r/w$, and
$w \le (d+1) T \le 2(d+1)$. Three cases:

* $u^* < w/(d+1)$, i.e. $w > \sqrt r$: $g$ is increasing on $[w/(d+1), T]$, so $M \ge w + r/w - dT = q_{r,d}(w)$
  with $w \in (\sqrt r, 2(d+1)]$.
* $w/(d+1) \le u^* \le T$: $M \ge 2\sqrt r - dT$. Here $w \le \sqrt r$, i.e. $T \le T_c := (2^{r-1}\sqrt r/(d+1))^{1/r}$,
  hence $M \ge 2\sqrt r - d\,T_c = q_{r,d}(\sqrt r)$ (note $\sqrt r \le 2(d+1)$ in this case since $u^* \le T \le 2$).
* $u^* > T$: $M \ge g(T) - dT = T + r/((d+1)T) > 0$.

This proves the displayed bound. If $P_{r,d} \ge 0$ on $[0, 2(d+1)]$ then $q_{r,d} \ge 0$ on $(0, 2(d+1)]$, so
$M \ge 0$ in every case. $\square$

**Lemma 4.2 (equivalent forms of the criterion) [T-2.3].** $q_{r,d}$ is convex on $(0,\infty)$
($q'' = 2r/w^3 + c\,(r-1) r^{-2} w^{1/r-2} > 0$, $c = d(2^{r-1}/(d+1))^{1/r}$) and strictly decreasing on
$(0, \sqrt r]$ (there $q' = 1 - r/w^2 - (c/r) w^{1/r-1} < 0$). Hence

$$P_{r,d} \ge 0 \text{ on } [0, 2(d+1)] \iff q_{r,d} \ge 0 \text{ on } (0, 2(d+1)] \iff \inf_{[\sqrt r,\, 2(d+1)]} q_{r,d} \ge 0 .$$

Moreover the criterion contains Theorem 3.1: if $d^2 \le r$ then for $w \le 2(d+1)$,
$q_{r,d}(w) \ge 2\sqrt r - d\,(2^{r-1}\cdot 2(d+1)/(d+1))^{1/r} = 2\sqrt r - 2d \ge 0$.

**Definition and table.** Let $r_B(\alpha)$ be the least $r$ such that $P_{r',\alpha-r'} \ge 0$ on $[0, 2(\alpha-r'+1)]$
for every $r' \in [r, \alpha-1]$. The script decides each criterion exactly: $P_{r,d}(0) = (d+1) r^r > 0$ and
`sympy.Poly.count_roots(0, 2(d+1))` (Sturm sequences, rational endpoints) counts the real roots in the
interval; zero roots means $P > 0$ there, and whenever roots exist a rational point with $P < 0$ is
exhibited, so no case is left undetermined [T-2.4]. Results for $\alpha \le 60$:

* $r_B(\alpha) \le r_A(\alpha)$ always (Lemma 4.2), and $r_B(\alpha) - r_A(\alpha) \in \{0, -1, -2\}$: it is $-2$ only for
  $\alpha = 4$, $-1$ for $\alpha \in \{3, 5, 10, 11, 18, 19, 29, 41, 55\}$, and $0$ otherwise. So the Fisher–Ryan
  chain improves the root range by at most one index (asymptotically: at $w = \sqrt r$ the criterion reads
  $d\,(\sqrt r/(2(d+1)))^{1/r} \le \sqrt r$, i.e. $d \le \sqrt r\,(1 + O(\log r / r))$).
* $r_B(\alpha) \le L(\alpha)$, i.e. **the whole tail is covered, exactly for $\alpha \in \{2,3,4,5,6,7,10\}$.**

**Corollary 4.3.** For every forest with $\alpha \in \{2,3,4,5,6,7,10\}$, $\mathrm{ISO}_r$ holds for all
$L(\alpha) \le r \le \alpha - 1$. For $\alpha \le 7$ this also follows from Theorem 3.1 together with $\mathrm{ISO}_3$
for forests (Theorem 11.1$'$ of the audit note) at $(\alpha, r) = (5, 3)$; the case $\alpha = 10$, $r = 7$ is new
and uses Theorem 4.1 ($d = 3$, $d^2 = 9 > 7 = r$, but $\inf_{[\sqrt 7, 8]} q_{7,3} \approx 0.11 > 0$).

---

## 5. The obstruction: what these tools cannot do

### 5.1 The abstract system

Consider the following system $\Sigma(\alpha)$ of constraints on positive reals $p_0, \dots, p_\alpha$, which
collects everything the tools (LM), (FR), (Z), TAIL and $\mathrm{WR}$ assert about a forest:

* $(\Sigma 1)$ $p_0 = 1$ and (LM): $(k+1)p_{k+1} \le 2(\alpha-k) p_k$ for $0 \le k \le \alpha-1$;
* $(\Sigma 2)$ (FR) in polynomial form: $(p_k/\binom{\alpha}{k})^{k+1} \ge (p_{k+1}/\binom{\alpha}{k+1})^{k}$ for $1 \le k \le \alpha-1$;
* $(\Sigma 3)$ (Z): $\binom{\alpha}{k} \le p_k \le 2^k\binom{\alpha}{k}$;
* $(\Sigma 4)$ TAIL ($p_k \ge p_{k+1}$ for $k \ge L(\alpha)$) and $\mathrm{WR}_k$ ($p_{k-1} \le k p_k$) for all $k$;
* $(\Sigma 5)$ $p_1 = n \le 2\alpha$, and (when $r \ge 4$) the exact forest identities
  $p_2 = \binom n2 - e$, $p_3 = \binom n3 - e(n-2) + S$ of Theorem 3.1 of the audit note, with the data
  $n = 2\alpha$, $e = \alpha$, $S = 0$ of the perfect matching $\alpha K_2$.

**Theorem 5.2 (obstruction) [T-2.5].** Let $2 \le \alpha \le 60$ and $L(\alpha) \le r < r_B(\alpha)$ (these pairs
exist exactly for $\alpha \in \{8, 9\} \cup \{11, \dots, 60\}$; there are 343 of them). Then $\Sigma(\alpha)$ has a solution
with $Q_r < 0$. Explicitly, with $d = \alpha - r$ and a rational $T \in (1,2)$ found by the script,

$$p_k = 2^k \binom{\alpha}{k}\ (k \le r-1), \qquad p_k = \binom{\alpha}{k}\,T^k\ (k \ge r)$$

satisfies $(\Sigma1)$–$(\Sigma5)$ and $Q_r < 0$; all of this is verified with exact rational arithmetic.

*Why it works.* This sequence has $t_k = 2$ for $k < r$ and $t_k = T$ for $k \ge r$, so (FR) holds
(constant, then a drop), (Z) holds, (LM) at $k \le r-2$ holds with equality (the matching values), at
$k = r-1$ it reads $T^r \le 2^r$, at $k \ge r$ it reads $T \le 2$. Its margin is exactly
$M = g(u) - dT$ with $u = T^r/2^{r-1}$, i.e. $M = q_{r,d}(w)$ with $w = (d+1)T^r/2^{r-1}$: the first case of the
proof of Theorem 4.1 is attained. By Lemma 4.2, whenever the criterion fails there is $w_0 \in [\sqrt r, 2(d+1)]$
with $q_{r,d}(w_0) < 0$, and $T = (2^{r-1} w_0/(d+1))^{1/r} \in [1,2]$ realises it (the script finds a nearby
rational $T$ with $Q_r < 0$ exactly). Examples:

| $(\alpha, r, d)$ | $T$ | $x = p_r/p_{r-1}$ | $y = p_{r+1}/p_r$ | window $(x_-, x_+)$ | $Q_r/(p_{r-1}p_r)$ |
| --- | --- | --- | --- | --- | --- |
| $(8, 5, 3)$ | $207/128$ | $0.5531$ | $207/256 = 0.8086$ | $(0.2, 1)$ | $-0.278$ |
| $(9, 6, 3)$ | $27/16$ | $0.4811$ | $81/112 = 0.7232$ | $(0.212, 0.788)$ | $-0.097$ |
| $(11, 7, 4)$ | $217/128$ | $0.4492$ | $217/256 = 0.8477$ | $(0.143, 1)$ | $-1.41$ |
| $(30, 20, 10)$ | $119/64$ | $0.2559$ | $85/96 = 0.8854$ | $(0.0528, 0.947)$ | $-9.57$ |

**Consequence.** No proof of $\mathrm{ISO}_r$ for all forests at such $(\alpha, r)$ can consist solely of
inequalities implied by (LM), (FR), (Z), TAIL, $\mathrm{WR}_k$ and the exact formulas for $p_1, p_2, p_3$ — in
particular the whole tail $r \ge L(\alpha)$ is out of reach of these tools for every $\alpha \ge 8$, $\alpha \ne 10$.
For $\alpha \le 60$ the uncovered tail indices are $\{r : L(\alpha) \le r < r_B(\alpha)\}$, e.g. $\{5\}$ for $\alpha = 8$,
$\{6\}$ for $\alpha = 9$, $\{7\}$ for $\alpha = 11$, $\{13,14,15\}$ for $\alpha = 20$, $\{20,\dots,24\}$ for $\alpha = 30$
(listed in the report under `tail_uncovered_indices`); asymptotically about $\alpha/3 - \sqrt\alpha$ indices.

### 5.2 Which ingredient is missing

By Lemma 2.3, at a tail index the margin can only be negative when $x \in (x_-, x_+) \subset (1/r, 1)$
**and** $(r+1)y$ exceeds $r x + 1/x$. The tools give the sharp upper bound $(r+1) y \le 2d$ (tight for
$\alpha K_2$) but no *lower* bound on $x$ beyond $x \ge (d+1)/(r 2^{r-1})$ (from $(\Sigma 3)$), which is why the
abstract system can place $x$ at the AM–GM minimiser $1/\sqrt r$. Two facts from the data
(Section 6) show that a proof cannot come from excluding the window either:

* real trees *do* sit in the window: among the 36060 pairs (tree, $r$) with $n \le 16$, $r \ge L(\alpha)$ and
  $d^2 > r$, 28197 (78%) have $x \in (x_-, x_+)$ (forests $n \le 14$: 11498 of 13443, 86%);
* for those pairs the LM bound on $y$ is never more than 63% tight: $\max (r+1)y/(2d) = 1408/2241 \approx 0.628$
  (trees) and $146/231 \approx 0.632$ (forests), while $(r+1)y/(2d)$ does reach $163/181 \approx 0.90$ (trees) and
  $1$ (forests, $2K_2$) at tail pairs with $x > 1$, where $\mathrm{ISO}_r$ is trivial by (2.7).

So the **key obstruction** is the absence of an upper bound on $y = p_{r+1}/p_r$ that improves on
$2(\alpha-r)/(r+1)$ *when $x < 1$*: what is needed is an inequality of the type
$(r+1)\,y \le r x + 1/x$ itself, i.e. $E_r \le E_{r-1} + r/E_{r-1}$ for the mean extension counts
$E_k := (k+1)p_{k+1}/p_k$ (a weak form of log-concavity that tolerates the known log-concavity failures,
which all have small $x$). Neither (LM) nor (FR) relates $E_r$ to $E_{r-1}$ in this direction.

### 5.3 The variance form and the two-point extension statistics

**Proposition 5.4 [T-1.7, T-4.1].** Let $1 \le r \le \alpha-1$ and let $S$ be uniform over the independent
$(r-1)$-sets; write $a_S := e(S) = |V(H_S)|$ and $m_S := |E(H_S)|$. Then
$r\,p_r = \sum_S a_S$ and $\binom{r+1}{2} p_{r+1} = \sum_S p_2(H_S)$ with $2p_2(H_S) = a_S^2 - a_S - 2m_S$, hence

$$Q_r \;=\; \frac{p_{r-1}^2}{r}\Bigl(\mathbb E[a]^2 + r - \mathbb E[a^2 - a - 2m]\Bigr), \qquad
\mathrm{ISO}_r \iff \operatorname{Var}(a_S) \;\le\; \mathbb E[a_S] + 2\,\mathbb E[m_S] + r .$$

*Proof.* Each independent $r$-set contains $r$ independent $(r-1)$-sets and each $(r-1)$-set $S$ extends to
$a_S$ of them (Lemma 2.3 of LM / identity (4) of Basit–Galvin); each independent $(r+1)$-set contains
$\binom{r+1}{2}$ independent $(r-1)$-sets, and $S$ extends to an $(r+1)$-set exactly by an independent pair
of $H_S$, of which there are $\binom{a_S}{2} - m_S$. Substituting into $Q_r$ gives the identity
(checked symbolically), and $\mathbb E[a^2] - \mathbb E[a]^2 = \operatorname{Var}(a)$. All identities are also
verified by brute-force enumeration of independent sets on all 947 pairs (tree, $r$) with $n \le 10$,
together with the per-set bounds $a_S \le 2(d+1)$, $2p_2(H_S) \le 2d\,a_S$ and $e(T) \le 2d$ for $r$-sets. $\square$

The per-set (LM) inequality is $p_2(H_S) \le d\,a_S$, with equality iff $H_S = (d+1)K_2$. Averaging it gives
exactly Theorem 3.1. The two-point statistics [T-1.8]

$$(a_S, p_2(H_S)) = \begin{cases} (2(d+1),\ 2d(d+1)) & \text{with probability } q = \tfrac{d}{2(d+1)} \\ (0, 0) & \text{otherwise}\end{cases}$$

(a fraction $q$ of the $(r-1)$-sets extends to a perfect-matching forest with $d+1$ edges, the rest are
maximal independent sets) satisfy every per-set bound and give
$\mathbb E[2p_2] - \mathbb E[a]^2 - r = d^2 - r$: **exactly** the AM–GM threshold. So the per-set bound alone can
never beat Theorem 3.1; only a *coupling* between different $S$ (a structural statement about forests,
e.g. that maximal independent $(r-1)$-sets and $(r-1)$-sets with $H_S \cong (d+1)K_2$ cannot coexist in the
proportions above) could.

**Remark 5.5.** Basit–Galvin's Theorem 1.6 ($e(S) \ge 1$ when $|S| < (n-\alpha+1)/2$, trees) removes the atom
at $a_S = 0$ only for $r - 1 < (n - \alpha + 1)/2 \le (\alpha+1)/2$, never at tail indices $r \ge L(\alpha) \approx 2\alpha/3$
for $\alpha \ge 5$; and even then replacing the atom $0$ by $1$ moves the threshold only to $d \lesssim \sqrt r + 1/2$.
The "trivial" bound $x \le \binom{\alpha}{r}/\binom{\alpha}{r-1} = (\alpha-r+1)/r$ is false: it fails for 213617 of the
277096 pairs (tree, $r$) with $n \le 16$ (Fisher–Ryan only gives $t_r \le t_{r-1}$, an upper bound on $x$ by
$(d+1) t_{r-1}/r \le 2(d+1)/r$); in any case upper bounds on $x$ are useless here.

---

## 6. Numerical study: the true tail margin versus what is proved [T-3.1–T-3.3]

All 32508 trees with $n \le 16$ (counts equal OEIS A000055) and all 15205 forests with $n \le 14$
(A005195), via `erdos993lib.trees` and `indpoly_parent_array`; all numbers exact.

* $Q_r \ge 0$ at **every** index $1 \le r \le \alpha-1$ for all of them (277096 resp. 114941 pairs), in
  particular on $[r_A, \alpha-1]$, on $[r_B, \alpha-1]$ and on the whole tail; and on the proved range the exact
  lower bound $Q_r/(p_{r-1}p_r) \ge 2\sqrt r - 2d$ of Theorem 3.1 holds (compared via squares).
* Minimum tail margin $\min_{r \ge L(\alpha)} Q_r/(p_{r-1}p_r)$: trees $11/6$ (at $K_{1,3}$, $r = 2 = \alpha-1$);
  forests $3/2$ (at $2K_1$, $\alpha = 2$, $r = 1$). By order $n$, the tree minimum is $2.17$ ($n = 10$), $2.16$ ($11$),
  $2.17$ ($12$), $2.19$ ($13$), $2.28$ ($14$), $2.31$ ($15, 16$), attained at $(\alpha, r) = (8, 5)$ for
  $10 \le n \le 14$ and $(11, 7)$ for $n = 15, 16$. By $\alpha$ (trees, $n \le 16$): the minimiser is always
  $r = L(\alpha)$ for $\alpha \ge 4$, with values $2.39, 1.89, 2.22, 2.50, 2.16, 2.41, 2.62, 2.31, 2.53, 2.75, 2.48, 2.67$ for
  $\alpha = 4, \dots, 15$. So the tail is far from critical: the true margin at the start of the tail is $> 1.8$,
  whereas the binomial sequence has margin $1 + r/(d+1)$ and the matching $\alpha K_2$ has $1 + r/(4(d+1))$.
* For comparison, the global minimum over *all* indices is $233/840 \approx 0.277$ at $r = 2$ for the star
  $K_{1,15}$ (forests: $88/273$ at $r = 2$ for $K_{1,13}$): the difficulty of $\mathrm{ISO}$ sits entirely in the prefix.
* The gap: proved for $r \ge r_B(\alpha) \approx \alpha - \sqrt\alpha$; true (for $n \le 16$, and for all $n \le 25$ by the
  repository's scans) for $r \ge L(\alpha) \approx 2\alpha/3$ with margin $> 1.8$; in between, roughly
  $\alpha/3 - \sqrt\alpha$ indices per $\alpha$, where the tools are provably insufficient (Theorem 5.2) although
  the inequality is comfortably true on all available data.

---

## 7. What is NOT proved

1. $\mathrm{ISO}_r$ for $L(\alpha) \le r < r_B(\alpha)$ is **not proved** for any $\alpha \ge 8$ with $\alpha \ne 10$; the first
   open tail instance is $(\alpha, r) = (8, 5)$. By Theorem 5.2 it cannot be proved from (LM), (FR), (Z), TAIL,
   WR and the low-order formulas alone. The framework of the audit note does not need these instances
   (it needs $\mathrm{ISO}_r$ only for $r \le L(\alpha)-1$), so nothing there is affected.
2. Theorem 4.1's table is exact only for $\alpha \le 60$ (the criterion is decidable for any given $(\alpha, r)$ by the
   same computation); the statement "$r_B \in \{r_A - 2, r_A - 1, r_A\}$" is verified for $\alpha \le 60$ only.
3. The variance formulation (Proposition 5.4) is an exact reformulation, not a proof strategy that has been
   carried out; the coupling statement suggested in Section 5.3 is a conjecture-shaped remark.
4. All enumerations are finite consistency checks.

---

## 8. Map of the machine verification (`scripts/prove_iso_tail.py`)

| Item | What is checked |
| --- | --- |
| [T-1.1]–[T-1.4] | (2.1), (2.2), (2.6), (2.3) by `sympy` |
| [T-1.5] | (2.7) for all $\alpha \le 300$, all $r$ |
| [T-1.6] | Corollary 3.2: $d_{\max}$, the set identity, $r_A \ge L$ ($\alpha \le 10^5$), $r_A = L$ iff $\alpha \in \{2,3,4,6,7\}$ |
| [T-1.7], [T-1.8] | Proposition 5.4's identity; the two-point computation $d^2 - r$ |
| [T-2.1]–[T-2.3] | (2.5) (symbolic $\alpha \le 15$, ratios $\alpha \le 200$); $P_{r,d}/w^r$ identity ($r \le 12$); $q''$ |
| [T-2.4] | exact table $r_B(\alpha)$, $\alpha \le 60$, by `count_roots`; $B \supseteq A$; negative points exhibited |
| [T-2.5] | 343 rational witnesses for Theorem 5.2, each checked against $(\Sigma1)$–$(\Sigma5)$ and $Q_r < 0$ |
| [T-2.6] | Theorem 3.3 table for $n/\alpha \in \{1, 3/2, 2\}$; agreement with $r_A$ at $n/\alpha = 2$ |
| [T-3.1]–[T-3.3] | Section 6 (trees $n \le 16$, forests $n \le 14$) |
| [T-4.1] | brute-force variance form on all trees $n \le 10$ |

Markers: `PASS_EXACT_ISO_TAIL_RANGE_ROOT`, `PASS_EXACT_ISO_TAIL_FR_REFINEMENT`,
`PASS_EXACT_ISO_TAIL_OBSTRUCTION_WITNESSES`, `PASS_EXACT_ISO_TAIL_NUMERIC_CONSISTENCY`,
`PASS_EXACT_ISO_TAIL_VARIANCE_FORM`. Report: `reports/iso_tail_proof.json` (SHA-256 printed by the script).
