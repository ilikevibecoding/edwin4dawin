# Pendant GSB cascade reduction for Erdős Problem 993

Date: 2026-07-26

Status: the identities and conditional reduction below are proved. The
pendant-cascade inequality (PGC) remains conjectural. This is not yet a
proof of Erdős Problem 993.

## 1. The GSB reserve

For a polynomial \(P(x)=\sum_jp_jx^j\), define

\[
G_k(P)=kp_k^2+p_{k-1}p_k-(k+1)p_{k-1}p_{k+1}
\]

and

\[
H_k(P)=\frac{kG_k(P)}{p_{k-1}}\qquad(k\ge1).
\]

When \(P=I(G;x)\), nonnegativity of \(G_k\) is equivalent to the
one-unit extension drift inequality

\[
\mu_k\le\mu_{k-1}+1,\qquad
\mu_j=(j+1)\frac{p_{j+1}}{p_j}.
\]

Writing

\[
L(G)=\left\lfloor\frac{2\alpha(G)+1}{3}\right\rfloor,
\]

the inequalities \(G_k\ge0\) for \(1\le k<L(G)\), combined with the
known decreasing tail for bipartite graphs, imply unimodality.

## 2. Pendant-edge setup

Let \(\ell p\) be a pendant edge of a forest \(G\), where \(\ell\) is
the leaf, and put

\[
T=G-\ell,\qquad F=G-\{\ell,p\}.
\]

Write

\[
I(T;x)=\sum_ja_jx^j,\qquad I(F;x)=\sum_jb_jx^j.
\]

Then

\[
I(G;x)=I(T;x)+xI(F;x),
\]

so its coefficients are \(g_j=a_j+b_{j-1}\).

The proposed pendant GSB cascade is

\[
\tag{PGC}
\boxed{\quad
H_k(I(G))\ge H_{k-1}(I(F))
\quad}
\]

for every pendant edge and every \(2\le k<L(G)\). Clearing positive
denominators, (PGC) is the exact integer inequality

\[
\tag{1}
k\,b_{k-2}G_k(I(G))
\ge
(k-1)\,g_{k-1}G_{k-1}(I(F)).
\]

This is substantially more targeted than global ordered log-concavity,
global GSB, or leaf monotonicity: Galvin's \(T_{14,8}\) violates (PGC)
at rank \(114\), but \(L(T_{14,8})=84\), and every prefix rank passes.

## 3. Exact leaf-mixture derivation

For a graph \(Q\), let \(\mathcal S_Q(r)\) denote the GSB variance
slack on a uniform independent \(r\)-set:

\[
\mathcal S_Q(r)
=2\mathbb Ee+2\mathbb Eq-\operatorname{Var}(e)
=\frac{(r+1)G_{r+1}(I(Q))}{i_r(Q)^2}.
\]

Split a uniform independent \((k-1)\)-set of \(G\) according to whether
\(\ell\) is absent or present. The class weights are

\[
w=\frac{a_{k-1}}{a_{k-1}+b_{k-2}},
\qquad 1-w=\frac{b_{k-2}}{a_{k-1}+b_{k-2}}.
\]

The leaf-present class is exactly a uniform independent \((k-2)\)-set
of \(F\). The law of total variance therefore has the exact form

\[
\tag{2}
\mathcal S_G(k-1)
=w\mathcal R_k(T,p)
+(1-w)\mathcal S_F(k-2),
\]

where \(\mathcal R_k\) is the entire leaf-absent slack after paying the
between-class mean square. Direct algebra gives

\[
\begin{aligned}
\mathcal R_k
&=\frac{kG_k(I(G))}
        {a_{k-1}(a_{k-1}+b_{k-2})}
 -\frac{(k-1)G_{k-1}(I(F))}
        {a_{k-1}b_{k-2}}\\
&=\frac{H_k(I(G))-H_{k-1}(I(F))}{a_{k-1}}.
\end{aligned}
\tag{3}
\]

Thus \(\mathcal R_k\ge0\) is exactly (PGC), not merely a sufficient
approximation to the mixture calculation.

`verify_pendant_gsb_cascade_reduction.py` reconstructs (2)--(3)
symbolically and checks the cutoff arithmetic.

### 3.1 Exact local-payment decomposition

There is a sharper algebraic decomposition of the cleared cascade.
At \(r=k-1\), abbreviate

\[
a=a_r,\quad a^+=a_{r+1},\qquad
b^-=b_{r-1},\quad b=b_r,\quad b^+=b_{r+1},
\]

and define

\[
\begin{aligned}
\Lambda&=ab+b^2+2k(a^+b-ab^+),\\
M&=b^-(ka^++b)-(k-1)ba,\\
\Pi&=b^-(a+b^-)\Lambda-M^2.
\end{aligned}
\tag{LP-def}
\]

If

\[
\mathcal C_k
=k\,b^-G_k(I(G))
 -(k-1)\,g_{k-1}G_{k-1}(I(F))
\]

is the left side minus the right side of (1), then direct expansion
gives the exact identity

\[
\tag{LP-id}
\boxed{\quad
a\,\mathcal C_k
=\Pi+k\,b^-g_{k-1}G_k(I(T)).
\quad}
\]

Thus the two inequalities

\[
\tag{LP}\Pi\geq0
\qquad\text{and}\qquad
\tag{CGSB}G_k(I(T))\geq0
\]

pay for the cascade separately.  The first is a five-coefficient
rooted local-payment inequality.  The second is the ordinary same-rank
GSB reserve of the leaf-deleted forest.

The identity is correct, but the proposed separation is now known to
be too strong.  In the outer-rooted Galvin tree with

\[
t=22,\qquad m=9200,\qquad r=141065,
\]

the required terminal-prefix rank has

\[
\frac{M^2}{b^-(a+b^-)\Lambda}
=1.081711978147566\ldots>1,
\]

so \(\Pi<0\).  The same-rank term in (LP-id) compensates: at the same
witness the ordinary cascade ratio is

\[
\frac{H_r(I(R))}{H_{r+1}(I(G))}
=0.393601443918456\ldots<\frac34.
\]

Thus both ordinary PGC and the three-quarters cascade remain strictly
positive.  The exact bounded-memory replay is
`verify_terminal_local_payment_galvin_failure.py`.

The local payment has a useful dimensionless form.  Put

\[
s=\frac ba,\quad z=\frac{b^-}{b},\quad
u=(k-1)\frac b{b^-},\quad
v=k\frac{a^+}{a},\quad
w=k\frac{b^+}{b}.
\]

Then \(\Pi\geq0\) is equivalent to

\[
\tag{LP-norm}
\boxed{\quad
(u+(k-1)s)\,[1+s+2(v-w)]
\geq (k-1)(v+s-u)^2.
\quad}
\]

Here \(u,v,w\) are extension means.  The square on the right is exactly
the between-class mean gap created by splitting a uniform independent
\(r\)-set according to the new leaf, while the first factor on the left
is the remaining within-class reserve.  This exposes (LP) as a
determinant/variance payment rather than an opaque polynomial
inequality.

For the same-rank term in (5), ordinary induction covers \(G_k(T)\)
except when deleting the new leaf lowers the independence number and
\(k\) lands exactly at

\[
L(T)=\left\lfloor\frac{2\alpha(T)+1}{3}\right\rfloor.
\]

This isolates a second precise conjectural target:

> **Cutoff GSB.** Every forest \(Q\) satisfies
> \[
> G_{L(Q)}(I(Q))\geq0.
> \]

The formerly proposed implication “(LP) plus Cutoff GSB proves PGC” is
algebraically valid but unusable globally because (LP) is false.  Any
successful proof through (LP-id) must retain the compensation between
its two summands, or prove the full cascade directly.  Cutoff GSB
remains a live statement.

### 3.2 Terminal cross-determinant reduction

The longest-path reduction makes (LP) substantially more rigid.  In the
degree-two terminal case, \(G\) is obtained from a rooted forest
\((R,q)\) by adjoining the path \(q-p-\ell\).  Write

\[
B_j=i_j(R),\qquad C_j=i_j(R-q).
\]

Then \(T=G-\ell\) has polynomial \(B+xC\), while \(F=R\).  The first
factor in (LP-def) becomes

\[
\tag{TC}
\boxed{\quad
\Lambda
=2B_r^2+B_rC_{r-1}
+2(r+1)\Delta_r(R,q),
\quad}
\]

where

\[
\Delta_r(R,q)
=B_rC_r-B_{r+1}C_{r-1}.
\tag{TD}
\]

Thus the terminal local payment is exactly

\[
\begin{aligned}
\Pi={}&B_{r-1}(B_r+C_{r-1}+B_{r-1})\Lambda\\
&-\left\{
B_{r-1}\bigl((r+1)(B_{r+1}+C_r)+B_r\bigr)
-rB_r(B_r+C_{r-1})
\right\}^2.
\end{aligned}
\tag{TLP}
\]

The determinant \(\Delta_r\geq0\) says that, after attaching a leaf at
\(q\), the probability that this leaf is occupied is nondecreasing
between uniform independent-set sizes \(r\) and \(r+1\).  This
likelihood-ratio interpretation is specific enough to fail outside the
needed structure: negative determinants occur for nonterminal roots and
for cyclic graphs, and they occur in the tail of forests.  In the needed
terminal prefix, however, no negative determinant occurs in 490,720
exact ranks from all unlabeled trees through order \(15\), in 2,484,921
sampled-root ranks from the exact 60-vertex PatternBoost corpus, or in
the large random rooted-tree tests.

Equations (TC)--(TLP) are proved algebraically.  Positivity of
\(\Delta_r\) alone does not yet prove (TLP), because the squared
between-class mean still needs to be paid.  They nevertheless reduce the
terminal problem to a rooted likelihood-ratio inequality plus one
explicit scalar variance bound.

There is an additional normalization that removes the remaining five
coefficient symbols.  Put

\[
m=\frac{B_{r-1}}{B_r},\qquad
c=\frac{C_{r-1}}{B_r},\qquad
\delta=\frac{\Delta_r(R,q)}{B_r^2},
\]

and let

\[
g=\frac{
rB_r^2+B_{r-1}B_r-(r+1)B_{r-1}B_{r+1}
}{B_r^2}
\]

be the normalized same-rank GSB reserve of \(R\).  Exact cancellation
gives

\[
\tag{TN}
\frac{\Lambda}{B_r^2}=2+c+2(r+1)\delta,
\qquad
\frac{M}{B_r^2}
=m\bigl(2+c+(r+1)\delta\bigr)-(1+c)g.
\]

Accordingly, (TQ) is exactly the four-variable inequality

\[
\tag{TQ'}
4\left[
m\bigl(2+c+(r+1)\delta\bigr)-(1+c)g
\right]^2
\leq
m(1+c+m)\bigl(2+c+2(r+1)\delta\bigr).
\]

This identifies the missing structural statement precisely: the
ordinary GSB reserve \(g\) and the leaf-occupation minor \(\delta\)
cannot be bounded independently.  Coarse bounds on either one alone
admit false numerical configurations; the rooted-tree proof must retain
their joint dependence.

A particularly clean strengthening was initially suggested by the
small and random tests:

\[
\tag{TQ}
\boxed{\quad
4M^2\leq
B_{r-1}(B_r+C_{r-1}+B_{r-1})\Lambda,
\quad}
\]

where \(M\) is the expression inside braces in (TLP).  Since (TLP) only
requires the same inequality without the factor \(4\), (TQ) would pay
the terminal local determinant with at least three quarters of the
reserve left over.  Through order \(15\), the largest observed ratio

\[
\frac{M^2}
 {B_{r-1}(B_r+C_{r-1}+B_{r-1})\Lambda}
\]

is \(16/77\), attained by the seven-vertex star at the indicated
terminal rank.  The full exact 60-vertex PatternBoost test adds
2,484,921 rooted prefix ranks; its largest ratio is
\(0.1338794881\ldots\), and no instance in that corpus violates the
\(1/4\) bound.

This global strengthening is nevertheless **false**.  Galvin's
closed-form non-log-concave family gives an exact required-prefix
witness at \(t=11,m=23,r=183\):

\[
\frac{M^2}
 {B_{r-1}(B_r+C_{r-1}+B_{r-1})\Lambda}
=0.250662967440967\ldots>\frac14.
\]

The true local payment remains positive at the witness, as do the
ordinary and three-quarters cascades.  The exact replay is
`verify_terminal_quarter_payment_galvin_failure.py`.

The first two local ranks of (TQ) are proved for every forest.
`verify_terminal_quarter_payment_rank2_forests.py` gives an exact
concavity-and-orthant certificate for \(r=1,2\); the proof is recorded
in `TERMINAL_QUARTER_PAYMENT_RANK2_CERTIFICATE_2026-07-26.md`.  These
low-rank theorems remain correct despite the global counterexample.

The next quantitative target was the factor-three payment

\[
3M^2\leq
B_{r-1}(B_r+C_{r-1}+B_{r-1})\Lambda.
\]

In the normalized variables above, put

\[
A_0=2+c+(r+1)\delta,\quad
x_0=\frac{(1+c)g}{mA_0},\quad
s_0=\frac{mA_0^2}
{(1+c+m)(2+c+2(r+1)\delta)}.
\]

Then the payment ratio is exactly \(s_0(1-x_0)^2\).
A sufficient piecewise package is

\[
\frac13\leq x_0\leq\frac32,
\]

\[
x_0\leq1\Longrightarrow s_0\leq4x_0-1,
\qquad
x_0\geq1\Longrightarrow x_0(3s_0+20)\leq36.
\]

The two elementary factor identities do prove that this package implies
the factor-three payment.  However, the factor-three payment is also
**false**: the outer-rooted Galvin tree at
\(t=13,m=186,r=1735\) has

\[
\frac{M^2}
 {B_{r-1}(B_r+C_{r-1}+B_{r-1})\Lambda}
=0.333388270634976\ldots>\frac13.
\]

The true local payment and both cascade inequalities remain strictly
positive at this witness.  Consequently neither quantitative
strengthening nor the sufficient package may be used globally.  The
exact witnesses and the remaining true target are recorded in
`TERMINAL_PAYMENT_GALVIN_BOUNDARY_2026-07-26.md`.

## 4. Why PGC would solve the conjecture

Suppose (PGC) holds for all forests. Let \(G\) be a forest and
\(1\le k<L(G)\).

If \(G\) is edgeless, then \(I(G;x)=(1+x)^n\) and

\[
G_k=2\binom n{k-1}\binom nk>0.
\]

Otherwise choose a pendant edge and form \(F=G-\{\ell,p\}\).
If \(\beta=\alpha(F)\), then

\[
\alpha(G)=\beta+1.
\]

For all three residue classes of \(\beta\pmod3\),

\[
k<L(G)\quad\Longrightarrow\quad k-1<L(F).
\]

Applying (PGC) repeatedly decreases both the rank and the forest order:

\[
H_k(I(G))
\ge H_{k-1}(I(F))
\ge H_{k-2}(I(F'))
\ge\cdots.
\]

The chain ends either at rank \(1\) or at an edgeless forest. At rank
one,

\[
G_1(I(Q))=2\bigl(|V(Q)|+|E(Q)|\bigr)>0.
\]

Consequently every prefix \(G_k\) is nonnegative. Prefix GSB propagates
any first descent until it meets the known decreasing tail, proving that
every forest, and hence every tree, has a unimodal independent-set
sequence.

Therefore:

> **Conditional solution theorem.** The pendant cascade (PGC) for
> \(2\le k<L(G)\) implies the full Alavi--Malde--Schwenk--Erdős
> tree-and-forest conjecture.

This formulation automatically handles the formerly separate
new-cutoff boundary reserve.

## 5. Exact evidence

The following independent tests found no prefix (PGC) failure:

* every attachment vertex of every unlabeled tree through order \(14\):
  5,447 trees, 72,145 attachments, and 353,732 prefix ranks;
* every distinct forest-polynomial product through order \(16\), covering
  all pendant-edge polynomial pairs: 37,524 order-16 forest polynomials,
  332,799 pair instances, and 1,511,925 prefix ranks;
* the local-payment inequality (LP) at every vertex of every unlabeled
  tree through order \(15\): 13,188 trees, 188,260 rooted attachments,
  and 1,009,671 prefix ranks;
* 3,000 random trees of orders \(16\) through \(500\), five attachment
  vertices each: 15,000 attachments and 1,459,357 prefix ranks;
* all 43,595 distinct polynomials in the published 60-vertex
  PatternBoost corpus, with three independently sampled vertices per
  tree: 130,785 attachments and 2,615,702 prefix ranks;
* the 5,000 strongest PatternBoost records at all 60 vertices:
  300,000 attachments and 6,000,000 prefix ranks;
* 9,000 attachment-orbit instances in the uniform height-three
  star-branch family, reaching order \(754\);
* Galvin's tail-failing \(T_{14,8}\) pendant pair after multiplying both
  polynomials by \((1+x)^s\) and by \((1+2x)^s\) for every
  \(0\leq s\leq2000\): 2,996,164 additional exact prefix comparisons;
* the new 35-vertex counterexample to mode-prefix support-ratio
  dominance;
* every prefix rank of Galvin's \(T_{14,8}\).

Cutoff GSB also has no failure among all 90,965 distinct order-17 forest
polynomials, among all 43,595 exact 60-vertex PatternBoost polynomials,
or in the 1,320 tested Galvin-family instances with \(2\leq t\leq12\)
and \(1\leq m\leq120\).

Durable outputs include:

* `leaf_gsb_pendant_cascade_n14_20260726.json`;
* `pgc_all_forest_polynomials_n16_20260726.json`;
* `random_pendant_gsb_cascade_3k_n500_a5_20260726.json`;
* `patternboost60_pendant_gsb_cascade_all_a3_20260726.json`;
* `patternboost60_pendant_gsb_cascade_top5k_allvertices_20260726.json`;
* `galvin_t14_8_pgc_common_padding_s2000_20260726.json`;
* `prefix_gsb_local_payment_uniform_star_branch_e3_s50_m15_20260726.json`.

This evidence is finite and does not prove (PGC). The remaining problem is
now the single rooted, rank-shifting inequality (1).

The SHA-256 digest of the order-16 forest-product certificate is
`A1CA67D843BAB10D95DC0DC4A924A8E26C25466633F26FAFA6177677EB9C837A`.

## 6. Exact cyclic bipartite negative control

The cascade is not a consequence of bipartiteness plus the existence of a
pendant edge.  For the Bhattacharyya--Kahn graph with parameters
\(a=95,b=151\), write

\[
A_t=(2^t-1)\binom{95}{t}+\binom{151}{t}.
\]

Attach a new leaf to a vertex on the \(151\)-vertex independent side.  After
deleting the new leaf and its neighbour, the coefficients are

\[
B_t=(2^t-1)\binom{95}{t}+\binom{150}{t},
\]

and the enlarged graph has \(Q_t=A_t+B_{t-1}\).  Its independence number is
151, so the prefix cutoff is 101.  Exact integer arithmetic gives (PGC)
failures precisely at ranks

\[
68,69,70,71,72,73.
\]

Thus the surviving claim genuinely requires forest structure, rather than
only bipartiteness.  The negative control is independently reproduced by
`verify_bhattacharyya_kahn_pgc_failure.py`, which also writes
`bhattacharyya_kahn_pgc_failure_20260726.json`.

## 7. Terminal-support reduction

It is not necessary to prove (PGC) for every pendant edge.  In each
nontrivial tree choose an endpoint \(\ell\) of a longest path and let \(p\)
be its neighbour.  Every neighbour of \(p\), except possibly the next
vertex \(q\) on the path, is a leaf: otherwise a path beginning two edges
down another branch and continuing from \(p\) to the opposite endpoint
would be longer.

Suppose \(p\) has \(m\geq1\) leaf neighbours, including \(\ell\).  Delete
\(p\) and all those leaves, and call the remaining tree \(R\); when it is
nonempty, \(q\in V(R)\).  Put

\[
A=I(R;x),\qquad C=I(R-q;x),
\]

with the convention \(A=C=1\) in the star case.  Splitting according to
whether \(p\) is chosen gives

\[
\tag{4}
I(G;x)=(1+x)^mA+xC,
\]

whereas deleting only \(\ell,p\) gives

\[
\tag{5}
I(F;x)=(1+x)^{m-1}A.
\]

Consequently the full conditional solution theorem needs only the
following narrower statement:

> **Terminal PGC.** For every rooted tree \((R,q)\), every \(m\geq1\), and
> \(Q=(1+x)^mI(R)+xI(R-q)\),
> \(B=(1+x)^{m-1}I(R)\), one has
> \[
> H_k(Q)\geq H_{k-1}(B)
> \quad(2\leq k<L(Q)).
> \]

Indeed, at every cascade step choose a longest-path terminal support in a
nontrivial component.  Equations (4)--(5) identify that step with Terminal
PGC, and the cutoff arithmetic and terminal cases in Section 4 are
unchanged.

This reduction isolates the degree-two case \(m=1\),

\[
Q=(1+x)A+xC,\qquad B=A,
\]

as the least binomially padded transform.  It also explains why the cyclic
Bhattacharyya--Kahn negative control does not refute the surviving target:
the support vertex in that graph does not sit at the end of a tree path.

The exact Galvin-family test
`galvin_terminal_pgc_t20_m100_20260726.json` checks this terminal
degree-two transform for \(2\leq t\leq20\), \(1\leq m\leq100\), and all
763,800 prefix ranks.  It finds no failure.  Here the \(m\) in
\(T_{m,t}\) is Galvin's branch count; the tested pendant support itself has
one leaf child.

## 8. Terminal PGC is proved for paths

For the path \(P_N\),

\[
i_j(P_N)=\binom{N-j+1}{j}.
\]

Deleting an endpoint and its degree-two support leaves \(P_{N-2}\).
Writing \(h=N-2k\), exact simplification gives

\[
\begin{aligned}
&H_k(I(P_N))-H_{k-1}(I(P_{N-2}))\\
&\quad=
\binom{N-k}{k-1}
\frac{\Phi(h,k)}
 {(N-k)(N-k+1)(N-k+2)},
\end{aligned}
\tag{6}
\]

where

\[
\begin{aligned}
\Phi(h,k)={}&4h^4+10h^3k+20h^3+7h^2k^2+39h^2k+34h^2\\
&+hk^3+19hk^2+50hk+20h+2k^3+12k^2+22k.
\end{aligned}
\]

Every monomial has a nonnegative coefficient, and \(\Phi(h,k)>0\) for
\(k\geq1,h\geq0\).  If \(k<L(P_N)\), then
\(\alpha(P_N)=\lceil N/2\rceil\) implies \(k\leq\alpha(P_N)-1\), hence
\(h=N-2k\geq0\).  Formula (6) proves the required strict cascade inequality
throughout the prefix.

`verify_terminal_pgc_paths.py` symbolically verifies (6), independently
checks every applicable rank for \(4\leq N<80\), and prints `PASS`.
Thus the new proof obligation is already discharged for the entire
degree-two unbranched case; branching interactions in the rooted remainder
are the unresolved part.

The star endpoint is also exact.  For \(G=K_{1,m}\) and
\(F=(m-1)K_1\), the cascade gap is

\[
\frac{(m-1)^2(m+2)}{m+1}\quad(k=2)
\]

and

\[
2(m-k+1)\binom{m-1}{k-1}\quad(k\geq3).
\]

Both are positive whenever the rank occurs.  The independent verifier is
`verify_terminal_pgc_stars.py`.

## 9. Rank-two PGC is proved for every forest

The first nontrivial cascade rank admits a proof without restricting the
pendant edge.  Let \(G\) be a forest with \(n\) vertices, \(e\) edges, and

\[
Z=\sum_v\binom{d(v)}2.
\]

If \(p\) is the neighbour of the deleted leaf, put \(d=d(p)\).  Then
\(F=G-\{\ell,p\}\) has \(n-2\) vertices and \(e-d\) edges.  The standard
triangle-free coefficient identities give

\[
i_2=\binom n2-e,\qquad
i_3=\binom n3-e(n-2)+Z,
\]

and hence

\[
G_2(I(G))
=2e^2+en^2-5en+n^3-n^2-3nZ.
\]

The denominator-free rank-two cascade gap is therefore

\[
\begin{aligned}
\Delta_2
&=2G_2(I(G))-nG_1(I(F))\\
&=2\{dn+2e^2+en^2-6en+n^3-2n^2-3nZ+2n\}.
\end{aligned}
\tag{7}
\]

If \(c=n-e\) is the number of components, then
\(Z\leq\binom e2\), since \(Z\) counts pairs of incident edges and a pair
of forest edges can meet at most once.  Substituting this upper bound into
(7) leaves

\[
\begin{aligned}
P(e,c,d)={}&e^3+7e^2c-9e^2+8ec^2-17ec+4e\\
&+2c^3-4c^2+4c+2d(e+c).
\end{aligned}
\]

For \(c\geq2\), this is increasing in \(c\) and \(d\), and

\[
P(e,2,1)=e^3+5e^2+4e+12>0.
\]

For \(c=1,e\geq2\), a leaf neighbour has \(d\geq2\), and

\[
P(e,1,2)=(e-2)(e^2-1)+4>0.
\]

The sole remaining connected case \(e=1\) is \(K_2\), where rank two is
outside the support.  Thus (PGC) is proved at \(k=2\) for all forests.
`verify_pendant_pgc_rank2_forests.py` checks every symbolic identity and
the two positivity reductions.

## 10. Exact forest-product and terminal-bouquet stress tests

The forest-product enumeration in
`scan_pgc_all_forest_polynomials.py` identifies equal polynomial states
but otherwise covers every pendant pair in every forest through order 16.
It checks 332,799 pendant-pair instances and 1,511,925 prefix ranks
(225,966 terminal instances and 1,028,027 terminal ranks), with no
failure.  The closest all-edge ratio is \(0.592871979\), and the closest
terminal ratio is \(0.590895527\); both witnesses are connected.

Two repeated-branch terminal families were then used to push directly on
the apparent boundary rank.  The Galvin-bouquet family has

\[
A_t=(1+2x)^t+x(1+x)^t,\qquad E_t=(1+2x)^t
\]

and

\[
\begin{aligned}
Q&=A_t^a((1+x)^m+x)+xE_t^a(1+x)^m,\\
B&=(1+x)^{m-1}(A_t^a+xE_t^a).
\end{aligned}
\]

The exact boundary scan \(a\leq100,t\leq20,m\leq20\) checks 39,999
nonvacuous ranks without failure.  Its closest ratio is
\(0.7012646482\) at \((a,t,m,k)=(100,2,7,204)\).

More generally, `scan_terminal_pgc_rooted_bouquets.py` enumerates every
distinct rooted-tree polynomial state

\[
A=I(T),\qquad E=I(T-r)
\]

and uses the same formulas with \(A,E\).  Through rooted order 8, with
\(a\leq100,m\leq15\), it tests 298,495 nonvacuous boundary ranks and
finds no failure.  The closest ratio rises to \(0.7093431426\), for

\[
A=1+8x+21x^2+21x^3+7x^4+x^5.
\]

Scaling this exact rooted state through \(a=500,m=20\) gives the closest
ratio \(0.7110372711\), still strictly below one.

The three output hashes are, respectively,

```text
09E344AFEC2FB170FA6C730517244747CF30642027B0EC16164863EE197E0FD1
D5564290986996057DF14C56DDF2D4D5EFBE88A8AB9B10157D1D340BEF98B6E0
58BC00B94B89DB2D8655F3DD42A076444E12CBDF986DE1E8C909B1CB022B360A
```

## 11. Saddle-point explanation of the repeated-branch boundary

The preceding ratios have a common asymptotic explanation.  Let
\(A(x)\) be a fixed positive polynomial of degree \(d\), let
\(P_a=A^a\), and take a coefficient index

\[
k=\frac{2ad}{3}+O(1).
\]

The positive saddle \(\rho\) is defined by

\[
\frac{\rho A'(\rho)}{A(\rho)}=\frac{2d}{3}.
\tag{8}
\]

For fixed positive auxiliary polynomials \(C,D\), the standard
large-powers coefficient estimate gives

\[
\frac{[x^{k-1}]P_aD}{[x^k]P_aC}
\longrightarrow \frac{\rho D(\rho)}{C(\rho)}.
\]

Writing

\[
\sigma^2=\rho\frac{d}{d\rho}
\left(\frac{\rho A'(\rho)}{A(\rho)}\right),
\]

the neighboring coefficient-ratio expansion also gives

\[
\frac{G_k(P_aC)}{[x^{k-1}]P_aC\,[x^k]P_aC}
\longrightarrow
1-\frac1\rho+\frac{(2d/3)}{\rho\sigma^2}.
\]

The same nonzero factor occurs on the two sides of the cascade.
Consequently, for the terminal factors

\[
C=(1+x)^m+x,\qquad D=(1+x)^{m-1},
\]

the right-to-left cascade ratio tends to

\[
R_\infty(\rho,m)
=\frac{\rho(1+\rho)^{m-1}}{(1+\rho)^m+\rho},
\qquad
\lim_{m\to\infty}R_\infty(\rho,m)=\frac{\rho}{1+\rho}.
\tag{9}
\]

This explains the earlier \(1/\sqrt2\): the fork and \(t=2\) Galvin
branches both have

\[
A=1+5x+6x^2+x^3,
\]

whose two-thirds saddle is \(\rho=1+\sqrt2\).  It also explains why the
order-8 rooted state crosses that value: its saddle is
\(\rho=2.4661496978\), so (9) tends to \(0.7114954381\).

Equation (9) does **not** prove PGC.  It does turn the most successful
repeated-branch counterexample search into the concrete extremal question:
how large can the two-thirds saddle (8) be for a tree independence
polynomial?

## 12. Exact and asymptotic search for large two-thirds saddles

`scan_tree_saddle_fugacity.py` enumerates unlabeled trees, computes their
independence polynomials exactly, and solves (8) stably.  Through order 17
the champion is

\[
1+17x+120x^2+458x^3+1029x^4+1387x^5+1097x^6
+482x^7+111x^8+15x^9+x^{10},
\]

with

\[
\rho=2.5809121963,\qquad \frac{\rho}{1+\rho}=0.7207415471.
\]

The output SHA-256 is
`F6C425FF3535593EF7CF1267B4A5649B6C95CC6FE2B25E09623642CA7928D0D1`.

The small champions reveal a stable structure: a cubic core with
unsubdivided internal edges and two length-3 terminal paths at each
bottom core vertex.  `scan_cubic_core_saddle.py` verifies the polynomial
calculation through height 8.  The message recurrence in
`analyze_cubic_core_saddle_limit.py` then continues the same family
without expanding its enormous polynomial.  At height 30 (a conceptual
8,589,934,593 vertices) it has stabilized at

\[
\rho=2.6538919167,\qquad \frac{\rho}{1+\rho}=0.7263192172.
\]

The output SHA-256 is
`F03EA71D3779214710C1F91F8834900B1B65DF3AD34F1BE75B1775D51362B608`.
This is numerical asymptotic reconnaissance, not a proof certificate.

Finally, `scan_regular_core_saddle_limit.py` varies branching factors
1 through 12, internal path lengths 1 through 8, and terminal lengths
1 through 12 at height 20.  Among 1,152 regular-core families the same
binary/length-3 construction is extremal; branching factors at least
three are weaker.  The output SHA-256 is
`1A460402544D8CF901C712E0A095EEBB78E6D36A8CF64F6B64FF75EC0C49E606`.

Thus every presently identified asymptotic terminal bouquet remains
bounded well away from the PGC failure threshold.  The surviving proof
task is to replace this regular-family evidence by a structural bound for
arbitrary rooted products, or to find an irregular hierarchy that evades
it.

## 13. Irregular core hierarchies

`beam_irregular_core_saddle.py` removes the regularity assumption.  Its
rooted trees start with a bottom hub carrying equal terminal paths and
then apply levels having independently chosen branching factors and
internal path lengths.  A beam search through depth 20, branching factors
2 and 3, internal lengths at most 4, terminal lengths at most 6, and beam
width 50 evaluates 7,708 states.

The best hierarchy has bottom branching 2 and terminal length 3, followed
mostly by branching-3 unsubdivided levels with a small number of
branching-2 levels.  At depth 20 it has

\[
\rho=2.6718083792,\qquad
\frac{\rho}{1+\rho}=0.7276546332.
\]

Thus irregularity does improve on the best regular-core limit
\(0.7263192172\), but only slightly, and the values have stabilized to
the displayed precision.  This is numerical reconnaissance rather than
a proof or exhaustive optimization.  The output SHA-256 is
`0B33401464D8F9A109D2EA44C7A031280CC25DF545ECD1D67C8E2720EFED9539`.

## 14. A rigorous universal bound on the two-thirds saddle

There is a crude but unconditional upper bound on the saddle in (8).
Let \(G\) be a forest with independence number \(\alpha>0\), let

\[
Z_G(\lambda)=\sum_j i_j(G)\lambda^j,
\qquad
\mu_G(\lambda)=\frac{\lambda Z_G'(\lambda)}{Z_G(\lambda)}.
\]

Because a forest is bipartite, \(n\leq 2\alpha\).  Zykov's coefficient
bound (equivalently, Maclaurin's inequality applied to the balanced
\(\alpha\)-clique extremizer) gives

\[
i_j(G)\leq { \alpha\choose j}\left(\frac n\alpha\right)^j
\leq {\alpha\choose j}2^j.
\]

Consequently the number of independent sets satisfies

\[
|\mathcal I(G)|=\sum_j i_j(G)\leq 3^\alpha.
\tag{10}
\]

Let \(X\) be the hard-core random independent set at fugacity
\(\lambda\), and let \(H(X)\) be its Shannon entropy.  The Gibbs identity
and (10) give

\[
\log Z_G(\lambda)
=H(X)+\mu_G(\lambda)\log\lambda
\leq \alpha\log3+\mu_G(\lambda)\log\lambda.
\tag{11}
\]

On the other hand, all subsets of one maximum independent set contribute
to the partition function, so

\[
Z_G(\lambda)\geq(1+\lambda)^\alpha.
\tag{12}
\]

Combining (11)--(12), if \(\mu_G(\lambda)<2\alpha/3\), then

\[
\log(1+\lambda)
<\log3+\frac23\log\lambda.
\tag{13}
\]

For \(\lambda>2\), the difference between the two sides of (13) is
strictly increasing.  Its large root is

\[
\Lambda=(1+2\cos(\pi/9))^3
=23.8725781081\ldots,
\]

because \(y=\Lambda^{1/3}\) obeys \(y^3-3y^2+1=0\).  Hence

\[
\mu_G(\Lambda)\geq\frac{2\alpha}{3}.
\]

Since \(\mu_G(\lambda)\) is strictly increasing, every two-thirds saddle
of a nonempty forest satisfies

\[
\rho\leq\Lambda.
\tag{14}
\]

In particular, the asymptotic terminal-bouquet ratio in (9) has the
uniform rigorous gap

\[
\lim_{m\to\infty}R_\infty(\rho,m)
\leq\frac{\Lambda}{1+\Lambda}
=0.9597950805\ldots<1.
\]

This proves that no repeated copy of a fixed forest branch can approach
an asymptotic PGC failure merely by making its two-thirds saddle
unbounded.  It does not control the finite-copy error uniformly and
therefore does not by itself prove PGC.

## 15. Fugacity-three theorem

The separate proof
`FUGACITY3_FOREST_THEOREM_PROOF_2026-07-26.md` establishes

\[
\mu_F(3)\geq\frac{2\alpha(F)}3
\]

for every forest.  It is equivalent to

\[
\rho\leq3,
\]

so the limiting ratio in (9) is at most \(3/4\).  The proof is a
simultaneous induction on three exact rooted-tree states, with an
essential reserve \(1/28\) that tensorizes across child branches.  The
finite polynomial sublemmas have an exact rational Bernstein verifier.
An independent enumeration also checks all 81,137 unlabeled trees
through order 17.  The claim remains false for general graphs.

This closes the saddle-location part of the asymptotic argument.  What
remains is to control the coefficient approximation uniformly at the
finite copy counts and ranks required by PGC.

## 16. The three-quarters cascade

The fugacity-three theorem suggests a quantitatively stronger finite
target.  With the pendant-edge notation of Section 2, define

\[
\tag{15}
\boxed{\qquad
3H_k(I(G))\ \geq\ 4H_{k-1}(I(F))
\qquad(2\leq k<L(G)).
\qquad}
\]

Equivalently, whenever both reserves are positive,

\[
\frac{H_{k-1}(I(F))}{H_k(I(G))}\leq\frac34.
\]

Notice the orientation of the constants: after clearing denominators,
(15) is

\[
4(k-1)g_{k-1}G_{k-1}(I(F))
\leq
3k b_{k-2}G_k(I(G)).
\tag{16}
\]

If (15) holds at every step of the terminal cascade, iteration reaches
the positive rank-one or edgeless base case and proves ordinary PGC
(indeed with a geometric reserve).  Thus Terminal three-quarters PGC
would solve Erdős Problem 993.

This stronger statement is now proved in three nontrivial regimes.

### 16.1 Every forest at rank two

Continue with the notation \(n,e,Z,d,c=n-e\) of Section 9.  Multiplying
\(3H_2(I(G))-4H_1(I(F))\) by \(n\) gives

\[
6G_2(I(G))-8n(n+e-d-2).
\]

Since \(Z\leq\binom e2\), the resulting lower-bound polynomial is

\[
\begin{aligned}
P={}&3e^3+21e^2c-31e^2+24ec^2-57ec+8ed+16e\\
&+6c^3-14c^2+8cd+16c.
\end{aligned}
\]

For \(c\geq2\), \(P\) is increasing in \(c\) and \(d\), and

\[
P(e,2,1)=(e+4)(3e^2-e+10)>0.
\]

For a connected nontrivial tree, \(c=1,e\geq2,d\geq2\), and

\[
P(e,1,2)=3e^3-10e^2-e+24.
\]

This equals \(6\) at \(e=2\); its forward difference is
\(9e^2-11e-8>0\) for \(e\geq2\).  Hence (15) holds strictly at rank
two for every forest whenever that rank is required.  The exact symbolic
certificate is `verify_pendant_pgc_rank2_forests.py`.

### 16.2 Every forest at rank three

The strengthened cascade is also proved at rank three for every
forest.  The connected core of the proof starts with a tree having
\(e\) edges and puts
\(x_v=d(v)-1\), and define

\[
M_j=\sum_vx_v^j,\qquad
J=\sum_{uv\in E}x_ux_v.
\]

The low-rank inclusion-exclusion formulas reduce the cleared cascade
gap to a quadratic expression in \(M_2\), with positive contributions
controlled by

\[
J\geq x_pS,\qquad J\geq e-2,
\]

and the two moment bounds

\[
M_3\geq3M_2-2(e-1),\qquad
M_3\geq\frac{M_2^2}{e-1}.
\]

The two moment bounds meet at \(M_2=2(e-1)\).  For \(e\geq8\), exact
Bernstein coefficients prove positivity uniformly in the remaining
local parameter \(1\leq x_p\leq e-2\); the finite edge counts
\(e=6,7\) have positive exact continuous lower-bound minima.  Stars
are covered separately at every rank.

For a disconnected forest, let \(h\) be the number of nontrivial
components and \(c\) the total number of components.  The same degree
excess variables have total \(E=e-h\).  After the positive local
\(J,S\) contribution is removed, the two moment regions reduce to a
finite collection of nonnegative lattice orthants.  Exact
power-coefficient and Bernstein certificates cover every orthant;
three exceptional parameter tuples are forced to feasible boundary
values with positive lower bounds \(4119,12400,42030\).  A pendant
\(K_2\) component is handled separately and also has positive exact
coefficients.

The derivations are in
`RANK3_THREE_QUARTERS_TREE_CERTIFICATE_2026-07-26.md` and
`RANK3_THREE_QUARTERS_FOREST_CERTIFICATE_2026-07-26.md`.
The two exact verifiers reconstruct all identities; the disconnected
verifier checks 13,675 nonnegative rational coefficients and prints
`PASS`.

### 16.3 Every path

For the path \(P_N\), put \(h=N-2k\).  Exact simplification gives

\[
\begin{aligned}
&3H_k(I(P_N))-4H_{k-1}(I(P_{N-2}))\\
&\quad=
\binom{N-k}{k-1}
\frac{\Psi(h,k)}
{(N-k)(N-k+1)(N-k+2)},
\end{aligned}
\]

where

\[
\begin{aligned}
\Psi={}&12h^4+26h^3k+64h^3+11h^2k^2+113h^2k+116h^2\\
&-4hk^3+39hk^2+163hk+72h-k^4-2k^3+31k^2+80k.
\end{aligned}
\]

The prefix condition implies \(h\geq k\).  On writing \(h=k+r\), the
numerator becomes

\[
\begin{aligned}
{}&12r^4+74r^3k+64r^3+161r^2k^2+305r^2k+116r^2\\
&+144rk^3+457rk^2+395rk+72r\\
&+44k^4+214k^3+310k^2+152k,
\end{aligned}
\]

which is strictly positive.  This proves (15) for every required rank
of every path.  The augmented exact verifier is
`verify_terminal_pgc_paths.py`.

### 16.4 Stars and exhaustive evidence

For \(G=K_{1,m}\), the ratio at \(k\geq3\) is

\[
\frac{H_{k-1}((1+x)^{m-1})}{H_k(I(G))}
=\frac{k-1}{m}<\frac23
\]

in the prefix.  Rank two is positive by

\[
3H_2(I(G))-4H_1((1+x)^{m-1})
=\frac{(m-1)(3m^2+m-8)}{m+1}.
\]

The augmented verifier is `verify_terminal_pgc_stars.py`.

The corrected exact forest-product scan through order 17 covers
81,137 unlabeled trees, 866,379 pendant-pair instances, and 4,275,315
prefix ranks.  It finds no failure of (15), including among 2,838,303
terminal ranks.  The closest all-edge and terminal ratios remain
\(0.5928719792\) and \(0.5908955272\), respectively.  The output is
`pgc_three_quarters_all_forest_polynomials_n17_20260726.json`.

The large repeated-rooted-branch examples reach ratio
\(0.7110372711\), while Section 15 proves their limiting ratio is at
most \(3/4\).  This is strong evidence for (15), not a proof beyond the
regimes above.  The unresolved task is to connect the fugacity-three
rooted induction to the finite-rank coefficient reserves in (16).

## 17. Scaled-three coefficient-prefix reduction

Put

\[
D_k(P)=3[x^k]P-[x^{k-1}]P.
\]

The standalone statement

\[
D_k(I(F))\geq0
\qquad
\left(k\leq\left\lfloor\frac{2\alpha(F)}3\right\rfloor\right)
\tag{17}
\]

would prove the leaf-occupancy bound

\[
4i_{k-1}(G-\{\ell,p\})\leq3i_k(G)
\]

at every pendant-cascade rank.  It therefore proves the non-curvature
coefficient summand of the three-quarters cascade.

Leaf deletion gives the exact recurrence

\[
D_k(G)=D_k(G-\ell)+D_{k-1}(G-\{\ell,p\}).
\]

Induction covers every term except one top rank when
\(\alpha(G)\equiv0,2\pmod3\) and deleting the leaf lowers the
independence number.  Writing

\[
F=G-\{\ell,p\},\qquad H=G-N[p],\qquad
r=\left\lfloor\frac{2\alpha(F)}3\right\rfloor,
\]

the sole remaining coefficient obligation is

\[
D_{r+1}(F)+D_r(F)+D_r(H)\geq0.
\tag{18}
\]

The complete derivation, the exact order-17 and PatternBoost evidence,
and a 21-vertex counterexample to the tempting factor-two strengthening
are in
`FUGACITY3_COEFFICIENT_PREFIX_REDUCTION_2026-07-26.md`.

Thus the current three-quarters route has two sharply separated live
tasks:

1. prove the local boundary inequality (18);
2. control the factorial-curvature summand in (16).

## 18. Normalized-curvature reduction and its sharp obstruction

The identity

\[
H_k(P)=p_k\tau_k(P),\qquad
\tau_k(P)=\frac{kG_k(P)}{p_{k-1}p_k},
\]

suggests separating the cascade into a coefficient factor and a
dimensionless curvature factor.  Full normalized monotonicity,

\[
\tau_k(I(G))\geq\tau_{k-1}(I(F)),
\]

would imply PGC immediately because adjoining the pendant leaf injects
the \((k-1)\)-sets of \(F\) into the \(k\)-sets of \(G\).

That strengthening is false.  The outer-rooted Galvin tree at
\((t,m,r)=(27,47725,890865)\) has a rigorous SCC ratio

\[
0.9999999500195473225001\ldots<1,
\]

while its actual PGC right/left ratio is only
\(0.3992656634047382673915\ldots\).  The standalone Arb verifier is
`verify_scaled_curvature_galvin_failure_arb.py`.

The coefficient factor makes a piecewise repair possible.  For any
\(c\in(0,1)\), it is enough to prove

\[
\tau_k(G)\geq c\,\tau_{k-1}(F)
\]

globally and full SCC only when
\(f_{k-1}\geq c g_k\).  The choices \(c=1/2\) and \(c=2/3\), their exact
PGC decompositions, and the current exhaustive evidence are recorded in
`SCALED_CURVATURE_CASCADE_REDUCTION_2026-07-27.md`.  This threshold
package is now an alternative live route to ordinary PGC that does not
require SM3.
