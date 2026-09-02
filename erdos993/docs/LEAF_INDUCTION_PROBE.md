# Leaf-deletion induction for ISO: a structural probe

**Scope.** This note records an exact, exhaustive probe of the natural inductive route to the
open target theorem of this repository (ISO$_r$ for every forest and every $1 \le r \le L(\alpha)-1$,
which together with WR and TAIL would settle Erdős #993): delete a leaf, apply the induction
hypothesis to the two smaller forests that appear in the leaf recursion, and control the
residual. Everything below is computed by `scripts/probe_leaf_induction.py` (exact integers and
`Fraction`s; the only floating point is inside the HiGHS LP solver, and every LP solution is
rationalised and re-verified exactly against the data). The machine-readable results are in
`reports/leaf_induction_probe.json`. Notation follows `docs/REDUCTION_LEMMA_AND_PROVED_CASES.md`:
$p_k$ = number of independent $k$-sets, $\alpha = \deg I$, $L(\alpha) = \lceil (2\alpha-1)/3 \rceil$,

$$Q_r(p) = r p_r^2 + p_{r-1}^2 - (r+1)\,p_{r-1}p_{r+1}, \qquad \mathrm{ISO}_r \iff Q_r \ge 0,$$

with the convention $p_k = 0$ for $k \notin [0,\alpha]$ (so $Q_0 = 0$ and $Q_r \ge 0$ trivially for $r \ge \alpha$).

**Summary of findings (details and tables below).**

1. **The plain leaf induction closes on all data.** For every tree with $3 \le n \le 16$, every
   leaf $l$ (244 690 rooted instances from 32 506 trees) and every index $1 \le r \le \alpha-1$
   (2 133 459 rows), the residual
   $R := Q_r(T) - Q_r(A) - Q_{r-1}(B)$ is **strictly positive**. The same holds on every forest
   instance tested (a tree instance with any forest added on the remaining vertices). So the
   single inequality $R \ge 0$ (the *leaf lemma*) would prove ISO$_r$ at **every** index for
   **every** forest by induction on $n$; no product-closure argument is needed.
2. **The cross term is negative only on stars at $r=2$.** CROSS $<0$ on exactly 99 of the
   2 133 459 rows, all of them $(K_{1,m}, \text{any leaf}, r=2)$ with $7 \le m \le 15$. Closed forms:
   CROSS $= 2m - \binom{m-1}{2}\cdot\!1 = -(m^2-7m+2)/2$, but $R = 3m-1 > 0$: the log-concavity
   term $b_1^2 - b_0b_2 = \binom m2$ of $B = \overline{K_{m-1}}$ pays for CROSS exactly at leading
   order. The normalised residual $R/(p_1p_2) = (6m-2)/(m^3-m) \sim 6/m^2$ is the global minimum
   ($11/420$ at $m=15$): the leaf lemma is asymptotically tight on stars at $r = 2$ and any proof
   must be exact there. At descent indices ($p_r \le p_{r-1}$) the minimum jumps to $2/3$.
3. **Strengthening the hypothesis by a non-negative quadratic form can never help**: for
   $\Phi_r = \sum \mu_{ij} p_ip_j$ with $\mu \ge 0$, superadditivity gives
   $\Phi_r(a)+\Phi_{r-1}(b) \le \Phi_r(T)$. In particular the "payment" LP of the task is degenerate
   (its optimum is $\lambda = 0$); what is meaningful is (i) which payments are *affordable*
   (capacities) and (ii) whether $R$ has a *certificate* as a non-negative combination of provable
   quadratic forms. Result: the IH is usable in full ($\lambda_a=\lambda_b=1$) at every $r$, the
   payment LPs are feasible with exactly verified rational coefficients, and stars at $r=2$ are the
   binding rows that pin the coefficient of $LC_{r-1}(b)$ near $0$.
4. **No certificate exists in the natural cone.** For every $2 \le r \le 8$ the exact certificate LP
   (write $R$, or the closing polynomials of the FLC/PLC inductions, identically as a non-negative
   combination of products of the non-negative linear forms $b_k, c_k, b_k-c_k$ together with
   ISO / LC / FLC hypotheses on $B$ and $C$ and the synchronisation inequalities that hold on the
   data) is **infeasible**; only $r = 1$ is certified. So the leaf lemma is true on all data but is
   *not* a formal consequence of the induction hypotheses plus the obvious coordinate relations:
   a proof needs genuinely new structure linking $b = I(B)$ and $c = I(C) = I(B - N(v))$.
5. **FLC and PLC are consistent induction targets in the prefix, not at all indices.** On all
   trees $n \le 18$ FLC ($Q_r \ge p_{r-1}^2$) and PLC ($p_r^2 \ge p_{r-1}p_{r+1}$) never fail in the
   prefix, and the closing inequalities of their leaf inductions ($E_{\rm FLC} = R - 2a_{r-1}b_{r-2} \ge 0$,
   $E_{\rm PLC} \ge 0$) hold on every tree instance $n \le 16$ at every index. On the
   non-log-concave trees $T_{3,4,4}$, $T^*_{3,3,4}$ and `bush([3,3,3])` both FLC and PLC fail only in
   the tail $r \ge L$, and there the closing inequalities fail too (as they must).
6. **Convolution closure.** ISO at all indices is *not* closed under convolution for general
   (even log-concave) sequences, so "forests reduce to trees" is false for ISO as an abstract
   property; it is true on all tree data because trees $n \le 18$ satisfy the stronger FLC at all
   indices and FLC *is* convolution-closed (Liggett). For a forest induction this is irrelevant:
   the leaf identity holds for forests verbatim and the base case is the binomial $(1+x)^n$.

---

## 0. Setting and the exact identity

Let $T$ be a forest with at least one edge, $l$ a leaf and $v$ its neighbour. Put
$A = T - l$, $B = T - l - v$, $C = T - N[v]$ and $a = I(A)$, $b = I(B)$, $c = I(C)$. Then
$I(T) = I(A) + x I(B)$ and $I(A) = I(B) + xI(C)$, i.e.

$$p_r(T) = a_r + b_{r-1}, \qquad a_r = b_r + c_{r-1}, \qquad p_r(T) = b_r + b_{r-1} + c_{r-1}.$$

If $W = N(v)\setminus\{l\}$ and $T_w$ is the component of $B$ containing $w \in W$ (rooted at $w$)
then $B = \bigsqcup_w T_w$, $C = \bigsqcup_w (T_w - w)$, so $b = \prod_w I(T_w)$ and
$c = \prod_w I(T_w - w)$. Expanding $Q_r(T)$,

$$Q_r(T) = Q_r(a) + \underbrace{\bigl[r b_{r-1}^2 + b_{r-2}^2 - (r+1) b_{r-2}b_r\bigr]}_{= Q_{r-1}(b) + LC_{r-1}(b)} + \mathrm{CROSS},$$

$$\mathrm{CROSS} = 2r a_r b_{r-1} + 2 a_{r-1} b_{r-2} - (r+1)\bigl(a_{r-1} b_r + a_{r+1} b_{r-2}\bigr),
\qquad LC_{r-1}(b) = b_{r-1}^2 - b_{r-2} b_r,$$

and the **residual** is $R := Q_r(T) - Q_r(a) - Q_{r-1}(b) = LC_{r-1}(b) + \mathrm{CROSS}$. In the
free coordinates $(b_{r-2},b_{r-1},b_r,b_{r+1},c_{r-2},c_{r-1},c_r)$:

$$R = \bigl[b_{r-1}^2 + (r-1) b_{r-1}b_r + 2 b_{r-2}b_{r-1} - b_{r-2}b_r - (r+1) b_{r-2}b_{r+1}\bigr]
 + \bigl[2r\, b_{r-1}c_{r-1} + 2 b_{r-2}c_{r-2} - (r+1)\, b_r c_{r-2} - (r+1)\, b_{r-2} c_r\bigr].$$

The script checks $p_r = a_r + b_{r-1}$, $a_r = b_r + c_{r-1}$ and $R = LC_{r-1}(b) + \mathrm{CROSS}$
on every row. **Induction scheme.** If $R \ge 0$ for every forest instance, then ISO$_r$ at every
index follows for every forest by induction on $n$: a forest with an edge has a leaf, $A$ and $B$
are forests with fewer vertices, $Q_r(a) \ge 0$ and $Q_{r-1}(b) \ge 0$ by the hypothesis (trivially
true outside the index range by the zero convention), and the base case $(1+x)^n$ satisfies
$Q_r > 0$ by Newton's inequalities (Theorem 7.1 of the audit note). Normalisation throughout is
$N := p_{r-1}(T)\,p_r(T)$, the scale of the dimensionless ISO margin.

## 1. Signs of CROSS and of the residual (all trees $n \le 16$, every leaf)

Data: 32 506 trees ($3 \le n \le 16$, counts match OEIS A000055), 244 690 (tree, leaf)
instances, 2 133 459 (instance, $r$) rows with $1 \le r \le \alpha(T)-1$.

| restriction | rows | CROSS $<0$ | fraction | $R<0$ | $R=0$ | worst $R/N$ | attained at |
| --- | --- | --- | --- | --- | --- | --- | --- |
| all indices | 2 133 459 | 99 | $4.6\cdot10^{-5}$ | **0** | 0 | $11/420 = 0.0262$ | $K_{1,15}$, $r=2$ |
| prefix $r \le L-1$ | 1 348 526 | 99 | $7.3\cdot10^{-5}$ | **0** | 0 | $11/420$ | $K_{1,15}$, $r=2$ |
| descent $p_r \le p_{r-1}$ | 891 080 | 0 | 0 | **0** | 0 | $2/3$ | $K_{1,3}$, $r=2$ |

Per index (all indices; the prefix rows have the same minima wherever the index is in the prefix):

| $r$ | rows | CROSS $<0$ | min $R/N$ | witness |
| --- | --- | --- | --- | --- |
| 1 | 244 690 | 0 | $3/16$ | $P_{16}$ ($R = 3$ always at $r=1$: $R = 1 + 2(e_T - e_A) = 3$) |
| 2 | 244 686 | 99 | $11/420$ | $K_{1,15}$, any leaf |
| 3 | 244 673 | 0 | $2/7$ | $n=16$, one hub of degree 13 plus a pendant $P_3$ |
| 4 | 244 623 | 0 | $8273/19497 = 0.424$ | $n=16$, hubs of degree 9 and 6 |
| 5 | 244 416 | 0 | $1276885/2247699 = 0.568$ | $n=16$ double star, degrees 9 and 7 |
| 6 | 243 473 | 0 | $0.7246$ | (see report) |
| 7 | 238 813 | 0 | $0.85$ | |
| 8 | 214 602 | 0 | $1$ | |
| 9–14 | 141 031 … 15 | 0 | $1.13, 1.27, 1.40, 1.53, 1.67, 1.80$ | (stars, $R/N = (2r-1)/15$-type growth) |

The 99 rows with negative CROSS are exactly $(K_{1,m}, \text{leaf}, r=2)$ for $7 \le m \le 15$
($m$ leaves each, $\sum_{m=7}^{15} m = 99$). **Star closed forms** (verified symbolically with sympy
and numerically for $3 \le m \le 40$): with $b = (1+x)^{m-1}$, $c = 1$, $a = (1+x)^{m-1} + x$,

$$\mathrm{CROSS}(K_{1,m}, r=2) = 2m - \tbinom{m-1}{2} = -\tfrac{m^2 - 7m + 2}{2} \ (<0 \iff m \ge 7),
\qquad LC_1(b) = \tbinom m2, \qquad R = 3m - 1,$$

$$\frac{R}{p_1 p_2} = \frac{6m-2}{m^3 - m} \sim \frac{6}{m^2} \to 0 .$$

So the expectation "stars give negative CROSS at $r = 2$" is confirmed, but the *residual* is
positive: the log-concavity term of $B = \overline{K_{m-1}}$ (which is just $n_B^2 \ge p_2(B)$)
cancels CROSS to leading order and leaves $3m-1$. For $r \ge 3$ the star residual is large
($R/N = 1/2, 7/10, 9/10, 11/10$ at $r = 3..6$ for $m = 10$).

**Consequences for the shape of a proof.** $R > 0$ everywhere, but $R/N \to 0$ along stars at
$r=2$ while all individual terms of $R$ are of order $m^3$: any proof of the leaf lemma must be
exact to two orders on stars. At $r=2$ one can write (from Theorem 3.1 of the audit note, with
$N_B = |B|$, $e_B$, $S_B = \sum_u \binom{d_u}{2}$ over $B$)

$$R_{r=2} = 3N_B + 2 + 2e_B(N_B - 1) - 3 S_B + 4 c_1 N_B - 3 c_2 ,$$

which is a degree-data inequality of the type proved in Theorem 5.1 — a concrete sub-lemma.

**Descent propagation and range bookkeeping** (relevant for the prefix / descent-conditional
versions of the theorem):

* At descent rows of $T$, $A$ also descends at $r$ in every case, but $B$ descends at $r-1$ in
  only a minority (e.g. $r=4$: 268 of 1130 rows; $r=3$: 12 of 66). A *descent-conditional*
  induction hypothesis therefore does not propagate to $B$; the hypothesis must be unconditional.
* If the target is the prefix statement only, the hypothesis on $A$ at $r$ and on $B$ at $r-1$ is
  available only when $r \le L(\alpha(A)) - 1$ and $r-1 \le L(\alpha(B)) - 1$. This fails on a
  large share of prefix rows at higher $r$ (e.g. $r = 5$: 49 867 of 214 602 rows; $r=6$:
  70 358 of 141 031; $r = 8$: 1807 of 2042) because $\alpha(A)$ or $\alpha(B)$ drops. A prefix-only
  induction needs a separate argument for the top index; the all-indices statement (which the
  data support for trees $n \le 25$ and forests $n \le 22$) has no such gap.

## 2. Payment terms, capacities, LPs and the certificate attempt

### 2.1 Which candidate terms are universally non-negative on the data

Candidate terms evaluated on every row (all indices, $n \le 16$); "provable" means non-negative
for every forest instance by a known argument (IH on a smaller forest, product of counts,
$c_k \le b_k$ because $C$ is an induced subgraph of $B$, or a square).

| term | provable? | universal on data (all indices) | universal in prefix |
| --- | --- | --- | --- |
| $Q_r(b)$, $Q_{r-1}(c)$, $Q_r(c)$ | yes (IH) | yes | yes |
| $LC_{r-1}(b)$, $LC_r(b)$, $LC_{r-1}(c)$, $LC_r(c)$ | no ($T_{3,4,4}$) | yes for $n \le 16$ | yes |
| $FLC_{r-1}(b)$, $FLC_r(b)$, $FLC_{r-1}(c)$ | no | yes for $n \le 16$ | yes |
| $c_{r-1}b_{r-1}$, $c_{r-1}b_{r-2}$, $c_{r-1}b_r$, $c_{r-1}a_{r-1}$, $c_{r-1}^2$, $c_{r-1}c_{r-2}$ | yes | yes | yes |
| $(b_k - c_k)\cdot(\text{count})$ | yes | yes | yes |
| squares $(c_{r-1}-b_{r-1})^2$, $(b_{r-1}-b_{r-2})^2$, $(a_r - p_{r-1})^2$ | yes | yes | yes |
| sync $a_r b_{r-1} - a_{r-1} b_r$ | no | **fails** (stars: $c_1b_1 - c_0 b_2 = -\binom{m-1}{2}$) | fails |
| sync $a_{r-1} b_r - a_r b_{r-1}$ | no | see report (`task2_payment.universality`) | |
| sync $b_r c_{r-1} - b_{r-1} c_r$ and reverse | no | see report | |
| sync $b_{r-1}c_{r-2} - b_{r-2}c_{r-1}$ and reverse | no | see report | |
| sync $p_r a_{r-1} - p_{r-1} a_r$ and reverse; $p_r b_{r-1} - p_{r-1} b_r$ and reverse | no | see report | |
| ULC $(r+1)b_{r-1}b_r - (r-1)b_{r-2}b_{r+1}$ | no | see report | |

The exact per-term verdicts with a witness for every failure are in
`task2_payment.universality`; per-$r$ verdicts in `task2_payment.per_r[r].universality`. The
synchronisation inequality $a_{r-1} b_r \le a_r b_{r-1}$ suggested in the task is **false**
(it is equivalent to $c_{r-1} b_{r-1} \ge c_{r-2} b_r$, violated by every star at $r = 2$ where
$c_1 = 0$).

### 2.2 Why the literal payment LP is degenerate, and what was solved instead

The task asks for $\lambda \ge 0$ with $Q_r(T) - \sum_i \lambda_i t_i \ge 0$ on all instances,
maximising the minimum slack. Since every $t_i \ge 0$, adding payments only lowers the slack, so
the optimum is always $\lambda = 0$ (the untouched statement ISO$_r(T)$). Moreover, for the
strengthened-hypothesis reading ($Q_r \ge \Phi_r$ with $\Phi_r$ a non-negative quadratic form
in $p_{r-1}, p_r, p_{r+1}$), the closing slack changes by
$\Phi_r(a) + \Phi_{r-1}(b) - \Phi_r(T) = -(\text{cross terms}) \le 0$
because $p_k(T) = a_k + b_{k-1}$ — so no non-negative-form strengthening can ever help a leaf
induction (e.g. FLC costs exactly $2a_{r-1}b_{r-2}$; see Section 4). Three non-degenerate
questions were therefore solved, all with HiGHS and exact re-verification:

* **IH-usage LP.** $\max \lambda_a + \lambda_b$ s.t. $Q_r(T) \ge \lambda_a Q_r(a) + \lambda_b Q_{r-1}(b)$
  on all rows, $0 \le \lambda \le 1$. Optimum $\lambda_a = \lambda_b = 1$ at every $r$ (exactly
  verified) — the plain induction closes. The exact extremal ratios
  $\max\{\lambda_a : Q_r(T) \ge \lambda_a Q_r(a) + Q_{r-1}(b)\}$ and the analogue for $\lambda_b$
  (both $>1$; values per $r$ in `task2_payment.per_r[r].ih_usage_*`) measure how much *more*
  than the hypotheses is true.
* **Payment capacities.** For each universal term $t$, the largest universal coefficient
  $\lambda_t^{\max} = \min_{\text{rows}, t>0} R/t$ such that $R \ge \lambda_t^{\max}\, t$ still
  holds on all data (exact; `capacity_all_indices`, `capacity_prefix`). Stars at $r=2$ force the
  capacity of $LC_1(b)$ to $\approx 6/m^2$: CROSS eats essentially all of the log-concavity term.
* **Payment LP.** $\max \sum_i w_i \lambda_i$ s.t. $\sum_i \lambda_i t_i \le R$ on all (de-duplicated,
  $N$-normalised) rows with $w_i$ the mean normalised size of $t_i$ — i.e. the *strongest* true
  lemma of the form $Q_r(T) \ge Q_r(a) + Q_{r-1}(b) + \sum_i \lambda_i t_i$ in this family. Solved for
  the provable terms and for all universal terms, all indices and prefix. Every solution was
  rationalised and re-verified exactly on all rows (`exact_verification.ok = true`, zero
  violations, no shrink steps needed). The binding rows (non-zero duals) are reported with full
  witnesses in `binding_rows`; at $r=2$ they are stars / near-stars, as expected.

### 2.3 Certificate LP: can $R \ge 0$ be *proved* from the hypotheses? (No, not in the natural cone)

The residual is a quadratic form in $x = (b_{r-2},b_{r-1},b_r,b_{r+1},c_{r-2},c_{r-1},c_r)$. A
proof from the induction hypotheses plus the obvious relations would be an identity

$$R \equiv \sum_j \nu_j\, u_j(x), \qquad \nu_j \ge 0,$$

where the $u_j$ are quadratic forms known (or hypothesised) to be non-negative on every instance:

* level 0: the 55 pairwise products of the non-negative linear forms $b_k$, $c_k$, $b_k - c_k$
  ($C \subseteq B$ induced);
* level 1: $+\,Q_r(b)$, $Q_{r-1}(c)$ (ISO on the smaller forests $B$, $C$: the induction hypotheses);
* level 2: $+\,LC_{r-1}(b)$, $LC_r(b)$, $LC_{r-1}(c)$ (log-concavity hypotheses);
* level 3: $+\,FLC_{r-1}(b)$, $FLC_r(b)$, $FLC_{r-1}(c)$ (fractional log-concavity hypotheses);
* extra: the synchronisation / ULC forms that are universal on the data (hypothetical).

Coefficient matching on the 28 monomials gives a small LP (HiGHS), and any float-feasible
solution is converted to an exact rational certificate and checked symbolically with sympy.
**Result:** for $r = 1$ the residual is certified at level 0 (indeed $R = 3$, and
$E_{\rm FLC}$, $E_{\rm PLC}$ are certified too). For **every $2 \le r \le 8$, every level 0–3 and
also with the universal synchronisation forms added, the LP is infeasible** — for $R$ and for the
closing polynomials $E_{\rm FLC}$, $E_{\rm PLC}$ of Section 4. Hence $R \ge 0$ is not a formal
consequence of {ISO/LC/FLC of $B$ and $C$} + {$0 \le c_k \le b_k$}: a proof must use relations
between $b$ and $c$ that these do not capture. The tight family shows what is missing: on
$K_{1,m}$ at $r=2$ the term $-3 b_{r-2} b_{r+1} = -3\binom{m-1}{3}$ is cancelled only by
$b_{r-1}b_r = (m-1)\binom{m-1}{2}$, i.e. by the *splitting inequality* $b_1 b_2 \ge 3 b_3$ (each
independent triple arises from three (vertex, pair) splits), which is non-homogeneous and lies
outside every homogeneous quadratic cone above. In general one needs, for the pair
$b = \prod_w I(T_w)$, $c = \prod_w I(T_w - w)$: a bound of the form
$b_{r-2} b_{r+1} \le \frac{r-1}{r+1}\, b_{r-1} b_r$ (this is exactly what FLC$_{r-1}$ and FLC$_r$
of $B$ give, and it is tight for the binomial $b$ of the star), plus control of
$(r+1) b_r c_{r-2} - 2r\, b_{r-1} c_{r-1}$ by $b$-quantities — i.e. an inequality relating the
"root-deleted" polynomial $c$ to $b$ that is exact when $c = 1$.

## 3. Descent-conditional and $r \ge 3$ versions

Restricting to descent rows ($p_r(T) \le p_{r-1}(T)$; these are the only indices at which
Theorem 2.2 needs ISO$_r$):

| $r$ | descent rows | CROSS $<0$ | $R < 0$ | min $R/N$ |
| --- | --- | --- | --- | --- |
| 2 | 3 | 0 | 0 | $2/3$ ($K_{1,3}$) |
| 3 | 66 | 0 | 0 | see report |
| 4 | 1130 | 0 | 0 | see report |
| $\ge 5$ | 889 881 | 0 | 0 | $\ge$ the all-indices minima (see report) |

No row with negative CROSS is a descent row (stars ascend at $r=2$), so the entire tightness of
the leaf lemma sits at *ascent* indices, which Theorem 2.2 never uses. For $r \ge 3$ (where
$r=2$ is excluded because ISO$_2$ is a theorem, Theorem 5.1): min $R/N = 2/7$ over all rows and
much larger over descent rows; all payment LPs are feasible with exact rational coefficients
(`task3_descent_and_r_ge_3`). The "feasibility" question of the task has therefore a positive
answer in every version — the LPs are never infeasible because $R>0$ always; the *obstruction* is
provability (Section 2.3), not truth.

Two caveats for a descent-conditional induction, from the data of Section 1: the hypothesis
must be unconditional on $B$ (descent does not propagate to $B$ at $r-1$), and the prefix range
gap must be handled.

## 4. Strengthened targets FLC and PLC as induction hypotheses

FLC$_r$: $p_r^2 \ge (1+\tfrac1r) p_{r-1}p_{r+1}$, equivalently $r!\,p_r$ log-concave, equivalently
$Q_r \ge p_{r-1}^2$ (since $Q_r - p_{r-1}^2 = r p_r^2 - (r+1)p_{r-1}p_{r+1}$). PLC$_r$:
$p_r^2 \ge p_{r-1}p_{r+1}$, equivalently $Q_r \ge p_{r-1}(p_{r-1} - p_{r+1})$ (sign-indefinite
strengthening). Normalised slacks: FLC $1 - (1+1/r)p_{r-1}p_{r+1}/p_r^2$, PLC $1 - p_{r-1}p_{r+1}/p_r^2$.

**Validity on trees $n \le 18$** (`task4_flc_plc.trees_scan`): FLC and PLC never fail in the
prefix; see the report for failures at all indices and the minimal prefix slacks per $n$
(the FLC prefix slack decreases like $\approx 0.4/n$, attained on stars, where FLC$_2$ reads
$2\binom m2^2 \ge 3(m+1)\binom m3$; the ISO prefix margin minimum is the star value
$2/n + 2n/((n-1)(n-2))$).

**Named non-log-concave trees** (`task4_flc_plc.families`): $T_{3,4,4}$ ($n=26$),
$T^*_{3,3,4}$ ($n=26$) and `bush([3,m,n])` members fail FLC and PLC **only at tail indices
$r \ge L$**, and satisfy ISO at every index.

**Closing inequalities of the FLC / PLC leaf inductions.** By the identity of Section 0, if
$Q_r(a) \ge \Phi_r(a)$ and $Q_{r-1}(b) \ge \Phi_{r-1}(b)$ then $Q_r(T) \ge \Phi_r(T)$ follows iff
$E_\Phi := R + \Phi_r(a) + \Phi_{r-1}(b) - \Phi_r(T) \ge 0$:

$$E_{\rm FLC} = R - 2a_{r-1}b_{r-2}, \qquad E_{\rm PLC} = R - 2a_{r-1}b_{r-2} + a_{r-1}b_r + b_{r-2}a_{r+1}.$$

On all 2 133 459 tree rows $n \le 16$ both are $\ge 0$ at every index (`closing_inequalities_on_instances`;
on stars at $r = 2$, $E_{\rm FLC} = 3m - 1 - 2m = m - 1$). Following the leaf recursion on
$T_{3,4,4}$, $T^*_{3,3,4}$, `bush([3,3,3])`, $E_{\rm FLC}$ and $E_{\rm PLC}$ become negative exactly at
tail rows (never in the prefix), while $R$ stays positive on every row. So FLC/PLC are viable
*prefix* induction targets on the data, with the range-gap caveat of Section 1, and their closing
polynomials are — like $R$ — not certifiable in the natural cone (Section 2.3).

## 5. Convolution closure (forests versus trees)

`task5_closure`: for all pairs of tree polynomials with $n_1, n_2 \le 12$ (487 578 pairs) and
200 000 random pairs from $n \le 14$, the product satisfies ISO, FLC and PLC at every index
whenever the factors do; multiplying trees $n \le 12$ by $(1+x)^k$, $k \le 5$, never breaks ISO.
For random log-concave integer sequences (both factors ISO at all indices) ISO of the product
**fails in a large fraction of pairs**, and also for random ISO-only factors; FLC and PLC are never
broken. So ISO is not convolution-closed as an abstract property of sequences; the closure seen on
tree data is explained by FLC: trees $n \le 18$ satisfy FLC at every index, and the ordinary
convolution of $p, q$ is the *binomial* convolution of $r!p_r$, $r!q_r$, which preserves
log-concavity (T. M. Liggett, *Ultra logconcave sequences and negative dependence*, JCTA 79
(1997), the ULC($\infty$) case; see also Wang–Yeh, JCTA 114 (2007)). Consequently a proof of ISO
for forests cannot go "trees first, then convolution" unless it proves FLC (false in the tail); the
leaf induction of Section 0, which treats forests directly, avoids the issue entirely.

## 6. Conclusion: is a leaf-deletion induction viable?

* **Numerically, yes, in its plainest form.** The exact residual $R = Q_r(T) - Q_r(T-l) - Q_{r-1}(T-l-v)$
  is strictly positive on every one of the 2 133 459 tree rows ($n \le 16$, every leaf, every
  index) and on every forest instance tested. No strengthening, payment or descent restriction is
  needed to make the step *true*; the induction hypothesis is used with coefficient exactly one,
  the base case is Newton's inequality for $(1+x)^n$, and forests need no separate reduction.
  This upgrades the target from "ISO$_r$ for $r \le L-1$" to "ISO$_r$ at every index for every
  forest", which is what the exhaustive data already suggest.
* **Formally, not yet.** The whole difficulty is compressed into one quadratic inequality in the
  seven coordinates of $(b, c) = (I(B), I(B - N(v)))$. It has vanishing relative margin along stars
  at $r=2$ ($R/N \sim 6/m^2$, $R = 3m-1$ against terms of size $m^3$), and it is **not** implied by
  the induction hypotheses on $B$, $C$ (ISO, or even LC / FLC) together with $0 \le c_k \le b_k$ and
  the synchronisation inequalities that hold on the data: the exact certificate LP is infeasible
  for all $2 \le r \le 8$. Strengthening the hypothesis by any non-negative quadratic form is
  provably useless for the closing step (superadditivity), and the sign-indefinite strengthenings
  (PLC) are false in the tail.
* **What a proof would need.** An inequality tying $c = I(B - W)$ to $b = I(B)$ that is exact
  when $c \equiv 1$ (stars) and homogeneous of degree two in the relevant coordinates — e.g. of the
  form $(r+1) b_r c_{r-2} \le 2r\, b_{r-1} c_{r-1} + (\ldots)$ together with the FLC-strength bound
  $b_{r-2}b_{r+1} \le \frac{r-1}{r+1} b_{r-1} b_r$ — or a non-homogeneous ingredient such as the
  splitting inequalities $b_j b_k \ge \binom{j+k}{j} b_{j+k}$ (which is what makes $R_{r=2}$ work on
  stars). At $r = 2$ the lemma reduces to the explicit degree-data inequality
  $3N_B + 2 + 2e_B(N_B-1) - 3S_B + 4c_1N_B - 3c_2 \ge 0$ and should be provable by the methods of
  Theorem 5.1; a proof at $r = 3$ would already give ISO$_3$ for all forests by a new route, and
  the general-$r$ statement is the natural next conjecture to attack, with the star family as the
  extremal case to calibrate every estimate.

## 7. Replay

```
pip install scipy            # HiGHS for the LPs (only floating-point component; all results re-verified exactly)
python3 scripts/probe_leaf_induction.py --nmax 16 --nmax-flc 18 --forest-n0 11 --forest-ntot 16 --cert-rmax 8
```

writes `reports/leaf_induction_probe.json` (SHA-256 printed at the end; the report carries no
timestamp so a replay is byte-for-byte reproducible; seed 993 for the random closure tests).
Runtime is a few minutes; the report is written incrementally after each task.
