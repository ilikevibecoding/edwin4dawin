# The scaled-three coefficient-prefix reduction

Date: 2026-07-26

Status: the reductions, identities, cutoff analysis, and finite
counterexample below are proved.  The scaled-three prefix statement (SM3)
and its final local boundary inequality remain conjectural.  This note is
not a solution of Erdős Problem 993.

## 1. The coefficient statement

For a forest \(F\), write

\[
I(F;x)=\sum_{j=0}^{\alpha}i_j(F)x^j
\]

and define

\[
D_j(F)=3i_j(F)-i_{j-1}(F),
\qquad i_{-1}(F)=0.
\]

The exact statement suggested by the fugacity-three theorem and the
pendant-cascade computations is

\[
\tag{SM3}
\boxed{\quad
D_j(F)\geq0
\quad\text{for}\quad
1\leq j\leq\left\lfloor\frac{2\alpha(F)}3\right\rfloor .
\quad}
\]

Equivalently, the coefficients of \(I(F;3x)\) are nondecreasing through
rank \(\lfloor2\alpha(F)/3\rfloor\).  The already-proved mean theorem

\[
\frac{3I'(F;3)}{I(F;3)}\geq\frac{2\alpha(F)}3
\]

is consistent with (SM3), but a mean inequality alone does not imply a
coefficientwise inequality.  No such implication is used here.

The exact scans support the slightly stronger and cleaner rounding

\[
\tag{SM3+}
D_j(F)\geq0
\quad\text{for}\quad
1\leq j\leq
\left\lceil\frac{2\alpha(F)}3\right\rceil.
\]

Through order 17, (SM3+) survives 1,150,009 exact forest-polynomial
comparisons.  It also survives 911,883 comparisons in the exact
60-vertex PatternBoost corpus.  It is false for general bipartite
graphs: the bipartite graph with independence polynomial

\[
1+8x+19x^2+16x^3+5x^4+x^5
\]

has \(\alpha=5\) and

\[
D_4=3\cdot5-16=-1.
\]

Thus even this one-rank rounding improvement uses more than
bipartiteness.  It remains conjectural for forests, and the proof route
below only needs the weaker statement (SM3).

## 2. Consequence for the three-quarters pendant cascade

Let \(\ell p\) be a pendant edge of \(G\), and put

\[
T=G-\ell,\qquad F=G-\{\ell,p\}.
\]

If \(g_j,t_j,f_j\) are the respective independent-set coefficients, then

\[
g_j=t_j+f_{j-1}.
\tag{1}
\]

Also \(\alpha(G)=\alpha(F)+1\), and every independent set of \(F\) is an
independent set of \(T\), so \(t_j\geq f_j\).

Recall

\[
L(G)=\left\lfloor\frac{2\alpha(G)+1}{3}\right\rfloor.
\]

Writing \(\beta=\alpha(F)\), exact cutoff arithmetic gives

\[
L(G)=\left\lfloor\frac{2\beta}{3}\right\rfloor+1.
\tag{2}
\]

Thus \(2\leq k<L(G)\) implies
\(k\leq\lfloor2\beta/3\rfloor\).  If (SM3) holds for \(F\), then

\[
f_{k-1}\leq3f_k\leq3t_k.
\]

Together with (1), this proves the leaf-occupancy inequality

\[
\tag{3}
\boxed{\qquad
4f_{k-1}\leq3g_k.
\qquad}
\]

In particular,

\[
3k\,g_k\geq4(k-1)f_{k-1},
\tag{4}
\]

which is exactly the non-curvature coefficient part of the
three-quarters cascade.

To see the decomposition precisely, put \(a_j=j!p_j\).  Then

\[
\begin{aligned}
H_k(P)
&=\frac{kG_k(P)}{p_{k-1}}\\
&=
\frac{a_k^2-a_{k-1}a_{k+1}}
     {(k-1)!\,a_{k-1}}
+kp_k.
\end{aligned}
\tag{5}
\]

Consequently the coefficient summand in
\(3H_k(I(G))-4H_{k-1}(I(F))\) is the left side of (4) minus its right
side.  Statement (SM3) does not by itself control the remaining
factorial-curvature summand; it isolates and settles one of the two exact
pieces.

## 3. Leaf induction leaves only one boundary rank

The identity (1) immediately gives

\[
\tag{6}
D_k(G)=D_k(T)+D_{k-1}(F).
\]

Let \(\alpha=\alpha(G)\) and
\(r(\alpha)=\lfloor2\alpha/3\rfloor\).  Since
\(\alpha(F)=\alpha-1\),

\[
k\leq r(\alpha)
\quad\Longrightarrow\quad
k-1\leq r(\alpha-1).
\tag{7}
\]

Hence the second term in (6) is always covered by induction.

There are two possibilities for \(T\).

1. If \(\alpha(T)=\alpha\), induction also covers \(D_k(T)\).
2. If \(\alpha(T)=\alpha-1\), induction covers \(D_k(T)\) except when
   \(r(\alpha)=r(\alpha-1)+1\) and \(k=r(\alpha)\).

The latter equality occurs exactly when

\[
\alpha\equiv0\ \text{or}\ 2\pmod3.
\tag{8}
\]

Thus ordinary leaf induction proves every instance of (SM3) except one
top boundary rank in precisely two congruence classes.

For the exceptional case, put

\[
H=G-N[p].
\]

Since

\[
I(T)=I(F)+xI(H),
\]

substitution into (6) gives the exact boundary identity

\[
\tag{9}
D_k(G)=D_k(F)+D_{k-1}(F)+D_{k-1}(H).
\]

Here

\[
\beta:=\alpha(F)=\alpha(T)=\alpha-1,\qquad
r:=k-1=\left\lfloor\frac{2\beta}{3}\right\rfloor,
\]

and necessarily \(\beta\equiv1\) or \(2\pmod3\).  Moreover
\(\alpha(H)\leq\beta-1\).

The entire coefficient proof is therefore reduced to the following
local statement:

> **Boundary-SM3.** In the leaf setup above, whenever
> \(\alpha(T)=\alpha(F)=\beta\), \(\beta\equiv1,2\pmod3\), and
> \(r=\lfloor2\beta/3\rfloor\),
> \[
> \tag{10}
> D_{r+1}(F)+D_r(F)+D_r(H)\geq0.
> \]

This statement retains essential local information.  In \(F\), the
neighbors of \(p\) lie in separate rooted branch components, while \(H\)
is obtained by deleting the root of each such component.  Treating
\(F,H\) as unrelated coefficient sequences discards exactly the structure
that the finite tests show is needed.

### 3.1 A useful failed strengthening

Put

\[
R_r(F):=D_{r+1}(F)+D_r(F)
=3f_{r+1}+2f_r-f_{r-1}.
\]

Since \(D_r(H)\geq-h_{r-1}\), the tempting sufficient condition

\[
\tag{11}
R_r(F)\geq h_{r-1}
\]

would prove (10).  It holds in every exceptional leaf instance through
order 17, but it is false.

Let \(T_m\) be the tree from (14) below and take

\[
F=T_7\cup2K_1.
\]

Let \(v\) be the centre of \(T_7\), add a vertex \(p\) adjacent only to
\(v\), and then add a leaf at \(p\).  This is an exact exceptional leaf
setup with

\[
\beta=17,\qquad r=11,\qquad
H=F-v=(1+3x+x^2)^7(1+x)^2.
\]

Exact expansion gives

\[
R_r(F)=34109
<37730=h_{r-1}.
\]

This does **not** violate the actual boundary.  In the same example,

\[
D_r(H)=15883>0,\qquad
R_r(F)+D_r(H)=49992>0.
\]

Thus (11) fails only by demanding payment when the closed-deleted term
is already favorable.  The surviving, strictly weaker target is the
conditional statement

\[
\tag{12}
D_r(H)<0\quad\Longrightarrow\quad
R_r(F)\geq h_{r-1}.
\]

It would still prove (10).  Equivalently, one may try the more structured
conditional split

\[
D_r(H)<0
\quad\Longrightarrow\quad
h_{r-1}\leq f_r\leq R_r(F).
\tag{13}
\]

Neither implication in (12)--(13) is proved.  They survive the exact
tests described below and preserve information that the unconditional
claim (11) discarded.

### 3.2 A stronger single boundary target

The same computations support a cleaner strengthening of the actual
boundary inequality:

\[
\tag{14}
\boxed{\quad
D_{r+1}(F)+D_r(F)+D_r(H)\geq f_r.
\quad}
\]

Equivalently, at the exceptional rank \(k=r+1\),

\[
D_k(G)\geq f_r.
\]

The term \(f_r\) has a direct combinatorial meaning: every independent
\(r\)-set of \(F=G-\{\ell,p\}\) has the distinguished extension obtained
by adjoining the leaf \(\ell\).  Thus (14) asks the three scaled copies
of the \((r+1)\)-sets of \(G\) to dominate all \(r\)-sets of \(G\) while
leaving those evident leaf extensions as reserve.

Statement (14) is strictly stronger than Boundary-SM3 but is a single
linear coefficient inequality, unlike the conditional alternatives
(12)--(13).  It was initially conjectured from the bounded scans, but is
false in all orders; the exact counterexample is recorded next.

### 3.3 Exact counterexample to the split and to (14)

Let `T_m` be the tree with a center joined to `m` support vertices, each with
two leaves.  Then

```text
I(T_m)=(1+3x+x^2)^m+x(1+x)^(2m).
```

Take `F=T_17 union 3K_1`, add `p` adjacent to the center and all three
isolates, and attach the pendant leaf at `p`.  This is an exceptional
57-vertex tree setup with `beta=38`, `r=25`, and `H=17K_(1,2)`.  Exact
expansion gives

```text
D_25(H)=-107372408<0,
3f_26+f_25-f_24=-339459400<0.
```

Consequently the second inequality in (13) is false even under its intended
negative-`D_r(H)` hypothesis.  The actual Boundary-SM3 margin is positive,

```text
D_26(F)+D_25(F)+D_25(H)=57086629816,
```

but after subtracting `f_25` the margin is `-446831808`; hence (14) is false
as well.  The resulting tree's independence sequence is unimodal.  The
independent graph-DP replay is
`verify_boundary_sm3_second_split_counterexample.py`, and the full exact
record is `BOUNDARY_SM3_SECOND_SPLIT_COUNTEREXAMPLE_2026-08-13.md`.  Thus the
only surviving statement from this section is the unsplit Boundary-SM3
inequality (10); neither the two-payment split nor (14) may be cited as a
valid all-order route.

## 4. Exact evidence

The corrected exhaustive forest-polynomial census through order 17
checks (SM3) in

\[
1,040,175
\]

exact coefficient comparisons and finds no failure.  It covers all
90,965 distinct order-17 forest independence polynomials.  The closest
ratio is

\[
\frac{i_{k-1}}{3i_k}
=\frac{1477}{2265}
=0.6520971302\ldots
\]

at order \(17\), independence number \(12\), and rank \(8\).

An independent leaf-boundary scan covers all 866,379 pendant polynomial
instances through order 17.  Among these, 542,969 have
\(\alpha(G-\ell)=\alpha(G)-1\), and 344,313 reach one of the exceptional
congruence boundaries in (8).  No instance violates (10).  When the
term \(D_r(H)\) is negative, there are 47,825 such instances.  None
violates (12) or either half of (13), and the largest observed ratio

\[
\frac{-D_r(H)}{D_{r+1}(F)+D_r(F)}
\]

is \(1/6\).

No one of the 344,313 exceptional instances violates the stronger
direct inequality (14).

The exact 60-vertex PatternBoost corpus supplies another 43,595 distinct
tree polynomials and 871,902 comparisons, again with no (SM3) failure.
Sampling five roots in every one of those trees gives 108,391 additional
exceptional rooted boundary instances and no violation of either (10)
or (14).

A separate exact random-root stress test appends both common isolated
vertices and extra isolated roots adjacent to the support.  A 5,000-tree
run checks 4,280,730 exceptional boundaries, including 2,112,290 cases
with \(D_r(H)<0\).  It finds no failure of (10), (12), either half of
(13), or the stronger inequality (14).  The largest observed ratio

\[
\frac{-D_r(H)}{R_r(F)}
\]

in that run is \(0.0209387131\ldots\).  These computations are
deliberately aimed at the negative-\(D_r(H)\) regime; they remain
evidence only.

The 24-vertex construction in Section 3.1 is an independently
reconstructed counterexample to the unconditional strengthening (11).
These computations are evidence only.

The executable artifacts are:

- `scan_pgc_all_forest_polynomials.py`;
- `pgc_three_quarters_all_forest_polynomials_n17_20260726.json`;
- `scan_scaled_three_boundary.py`;
- `scaled_three_boundary_n17_20260726.json`;
- `scan_scaled_three_leaf_boundary.py`;
- `scaled_three_leaf_boundary_n17_20260726.json`;
- `scan_scaled_three_patternboost.py`;
- `scaled_three_patternboost60_20260726.json`.
- `scan_patternboost_scaled_three_boundary_payment.py`;
- `patternboost60_scaled_three_boundary_exact_r5_20260726.json`;
- `random_scaled_three_leaf_boundary_search.py`;
- `random_scaled_three_leaf_boundary_extra_roots_5k_20260726.json`.

## 5. The tempting factor two is false

The order-17 census nearly satisfies the stronger inequality
\(i_{k-1}\leq2i_k\), but that strengthening is false.

Let \(T_m\) be the tree consisting of a central vertex joined to \(m\)
support vertices, with two leaves joined to every support.  Splitting on
the central vertex gives

\[
I(T_m;x)=(1+3x+x^2)^m+x(1+x)^{2m}.
\tag{15}
\]

For

\[
Q=T_6\cup2K_1
\]

we have \(|V(Q)|=21\), \(\alpha(Q)=15\), and
\(\lfloor2\alpha(Q)/3\rfloor=10\).  Exact expansion gives

\[
i_9(Q)=10431,\qquad i_{10}(Q)=5173,
\]

so

\[
i_9(Q)>2i_{10}(Q)
\quad\text{but}\quad
i_9(Q)<3i_{10}(Q).
\]

Thus the constant three in (SM3) cannot currently be replaced by the
apparently cleaner constant two.  This family is also a useful
asymptotic stress test for any proposed proof.

## 6. Independent verification

`verify_scaled_three_prefix_reduction.py` reconstructs (6), (9), the
leaf-occupancy implication, and the factorial identity (5) symbolically.
It checks the cutoff arithmetic through \(\alpha=1000\), reconstructs
the polynomial (15), verifies the exact 21-vertex factor-two
counterexample, and reconstructs the 24-vertex counterexample to the
unconditional boundary payment while checking its positive true
boundary.  It prints `PASS`.
