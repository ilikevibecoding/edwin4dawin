# Scaled-curvature cascade reduction for Erdős Problem 993

Date: 2026-07-27

Status: the reduction and identities below are proved.  The
scaled-curvature cascade (SCC) is false; Section 6 gives a rigorous finite
Arb counterexample in the Galvin family.  The actual ordinary and
three-quarters pendant cascades remain positive at that witness.  This
note is not a solution of Erdős Problem 993.

## 1. A dimensionless reserve

For a polynomial \(P(x)=\sum_jp_jx^j\), recall

\[
G_k(P)=kp_k^2+p_{k-1}p_k-(k+1)p_{k-1}p_{k+1}
\]

and

\[
H_k(P)=\frac{kG_k(P)}{p_{k-1}}.
\]

Define

\[
\sigma_k(P)=\frac{G_k(P)}{p_{k-1}p_k}
=1+k\frac{p_k}{p_{k-1}}-(k+1)\frac{p_{k+1}}{p_k}
\]

and

\[
\tau_k(P)=k\sigma_k(P).
\]

Then the exact identity

\[
\tag{1}
\boxed{\qquad H_k(P)=p_k\tau_k(P)\qquad}
\]

separates the GSB reserve into a level-size factor and a dimensionless
curvature factor.

If \(h_j=j!p_j\) and
\(C_j=h_j^2-h_{j-1}h_{j+1}\), then equivalently

\[
\tag{2}
\sigma_k(P)=1+\frac{C_k}{h_{k-1}h_k}.
\]

Thus \(\tau_k\) is a normalized factorial-curvature reserve, not a new
coefficient statistic.

## 2. The scaled-curvature cascade

Let \(\ell p\) be a pendant edge of a forest \(G\), and put

\[
F=G-\{\ell,p\}.
\]

The proposed statement is

\[
\tag{SCC}
\boxed{\qquad
\tau_k(I(G))\geq\tau_{k-1}(I(F))
\qquad(3\leq k<L(G)),
\qquad}
\]

where

\[
L(G)=\left\lfloor\frac{2\alpha(G)+1}{3}\right\rfloor .
\]

In coefficients, (SCC) is the exact integer inequality

\[
\tag{3}
k\,G_k(I(G))\,f_{k-2}f_{k-1}
\geq
(k-1)\,G_{k-1}(I(F))\,g_{k-1}g_k.
\]

The restriction \(k\geq3\) is necessary.  There is a ten-vertex terminal
pendant pair with

\[
\begin{aligned}
I(G)={}&1+10x+36x^2+77x^3+105x^4+91x^5\\
       &\quad+49x^6+15x^7+2x^8,\\
I(F)={}&1+8x+21x^2+35x^3+35x^4+21x^5+7x^6+x^7
\end{aligned}
\]

for which

\[
\frac{2\sigma_2(I(G))}{\sigma_1(I(F))}
=\frac{214}{225}<1.
\]

The ordinary and three-quarters pendant cascades are nevertheless
positive there.  Rank two is already proved directly for every forest,
so this isolated failure does not obstruct the reduction.

## 3. Why SCC would solve the conjecture

Every independent \((k-1)\)-set of \(F\) gives a distinct independent
\(k\)-set of \(G\) after adjoining the leaf \(\ell\).  Hence

\[
\tag{4}
g_k\geq f_{k-1}.
\]

Assuming the lower-rank reserve is nonnegative, (1), (SCC), and (4) give

\[
\begin{aligned}
H_k(I(G))
&=g_k\tau_k(I(G))\\
&\geq g_k\tau_{k-1}(I(F))\\
&\geq f_{k-1}\tau_{k-1}(I(F))
=H_{k-1}(I(F)).
\end{aligned}
\tag{5}
\]

The cutoff arithmetic for pendant deletion gives

\[
k<L(G)\Longrightarrow k-1<L(F).
\]

Thus induction descends to the already-proved rank-two cascade (or to an
edgeless forest), and also proves the nonnegativity needed in (5).
Consequently:

> **Conditional solution theorem.** If (SCC) holds for every pendant
> edge of every forest at \(3\leq k<L(G)\), then the pendant GSB cascade
> holds at every required rank.  Hence every forest has a unimodal
> independent-set sequence.

This is a strictly normalized version of the surviving PGC target:
because \(g_k\) can be strictly larger than \(f_{k-1}\), (SCC) is
stronger than ordinary PGC.

## 4. Exact link to the three-quarters route

The scaled-three coefficient statement gives the leaf-occupancy bound

\[
\tag{6}
3g_k\geq4f_{k-1}.
\]

Combining (SCC), (6), and nonnegativity of
\(\tau_{k-1}(I(F))\) yields

\[
\tag{7}
3H_k(I(G))\geq4H_{k-1}(I(F)).
\]

Thus SCC is precisely a possible replacement for the unresolved
factorial-curvature summand in the existing three-quarters reduction:
SM3 pays the coefficient factor and SCC pays the normalized curvature
factor.

Importantly, this split retains the compensation that the false local
variance-payment lemmas discarded.  On the outer-rooted Galvin witness
\((t,m,r)=(22,9200,141065)\), the raw curvature ratio is slightly below
one,

\[
\frac{\sigma_{r+1}(Q)}{\sigma_r(R)}
=0.999997985908921\ldots,
\]

but the required scaled ratio remains above one because of the rank
factor:

\[
\frac{(r+1)\sigma_{r+1}(Q)}
{r\sigma_r(R)}
=1.000005074825278\ldots.
\]

The same example has a negative isolated local payment, so the survival
of SCC is genuinely new information rather than a reformulation of that
false lemma.

## 5. Exact evidence

No failure of (SCC) at \(k\geq3\) occurs in:

- every pendant-pair polynomial product in every forest through order
  \(15\): 129,111 pair instances and 530,294 prefix ranks, including
  90,078 terminal instances and 370,937 terminal ranks;
- every degree-two terminal attachment to every rooted tree through
  order \(15\): 397,296 applicable normalized-curvature comparisons;
- three sampled roots in every one of the 43,595 exact 60-vertex
  PatternBoost trees: 130,785 rooted instances and 2,484,921 ranks;
- the 10,000 boundary instances of the previous repeated-rooted-bouquet
  extremizer through 500 repeated branches and 20 terminal leaves.
- Galvin's \(T_{14,8}\) pendant pair after multiplying both polynomials
  by \((1+x)^s\) and by \((1+2x)^s\) for every \(0\leq s\leq2000\):
  2,996,164 additional exact prefix ranks.

In the bouquet scan, the smallest ratio is

\[
\frac{k\sigma_k(I(G))}
{(k-1)\sigma_{k-1}(I(F))}
=1.0003382401765955\ldots.
\]

At the formerly closest PGC point
\((a,m,k)=(498,9,1666)\), the ratio is
\(1.0004472143186796\ldots\).

The closest ratios in the two common-padding scans are
\(1.0008736437108787\ldots\) and
\(1.0007037423192697\ldots\), respectively.

The next exact Galvin phase-boundary instance is substantially larger:

\[
(t,m,r)=(23,14000,223999),\qquad |R|=658001.
\]

Its isolated local-payment ratio has already risen to
\(1.2508972152935924\ldots\), so both separated-payment approaches fail
badly.  Nevertheless SCC remains positive:

\[
\frac{(r+1)\sigma_{r+1}(Q)}
{r\sigma_r(R)}
=1.0000028909478862\ldots.
\]

The exact coefficient integers have 153,363 decimal digits.

These are finite falsification tests, not a proof.

## 6. Rigorous finite counterexample beyond the integer scans

The rare-branch identity

\[
\tag{8}
A^m
=\sum_{s=0}^m\binom ms x^s
  (1+2x)^{t(m-s)}(1+x)^{ts}
\]

has only positive terms.  Near the two-thirds boundary, its effective
number of special branches is \(O(m(2/3)^t)\), which is bounded in the
phase-transition regime \(m\asymp(3/2)^t\).  Thus (8) permits stable
high-precision evaluation far beyond the size of the exact coefficients.

`locate_galvin_scaled_curvature_positive.py` reproduces the exact
\(t=20,23,24\) ratios to every displayed digit.  It then predicts an SCC
failure at

\[
\tag{9}
t=27,\qquad m=47725,\qquad r=890865,
\]

where

\[
\begin{aligned}
E&=(1+2x)^{27},\\
A&=E+x(1+x)^{27},\\
I(R)&=A^{47725}+xE^{47725},\\
I(R-q)&=A^{47725},\\
I(Q)&=(1+x)I(R)+xI(R-q).
\end{aligned}
\]

Here \(R\) is a finite tree on \(2,624,876\) vertices, and \(Q\) is the
tree on \(2,624,878\) vertices obtained by adjoining \(q-p-\ell\).

with

\[
\frac{(r+1)\sigma_{r+1}(Q)}
{r\sigma_r(R)}
=0.9999999500195473225001\ldots
\]

and scaled signed margin

\[
r(\text{ratio}-1)
=-0.04452583597454092361636\ldots.
\]

The finite sign is certified rigorously by
`verify_scaled_curvature_galvin_failure_arb.py`.  It sums (8) through
\(s=60\) using 320-bit Arb balls.  For the omitted positive tail it uses
Cauchy's coefficient bound at the exact \((1+2x)^{tm}\) saddle and a
decreasing geometric bound on
\(\binom ms\{x(1+x)^t/(1+2x)^t\}^s\).  The largest omitted-tail enclosure
is

\[
2.9105362877\ldots\times10^{-96}.
\]

The resulting rigorous enclosures are

\[
\frac{(r+1)\sigma_{r+1}(Q)}
{r\sigma_r(R)}
\in
0.9999999500195473225001278349\ldots
\ \pm 2.59\times10^{-82}
\]

and a denominator-cleared SCC difference

\[
-72.7770472950122739520\ldots
\ \pm 5.62\times10^{-73}.
\]

Thus SCC is strictly false.  This is a finite, independently replayable
counterexample to the strengthened lemma.

It is not a counterexample to the real target.  At the same witness the
rigorous ordinary cascade right/left ratio is

\[
0.3992656634047382673914778997\ldots
\ \pm 7.08\times10^{-83},
\]

so both the genuine PGC and three-quarters PGC retain large positive
margins.

## 7. Independent verification

`verify_scaled_curvature_cascade_reduction.py` checks (1)--(3), the
ordinary and three-quarters implications, reconstructs the ten-vertex
rank-two counterexample from its graph, and verifies that the failed rank
lies inside the required prefix while the actual pendant cascades remain
positive.

`verify_scaled_curvature_galvin_failure_arb.py` is the standalone rigorous
counterexample certificate for (9).  It prints `PASS`.

## 8. A surviving piecewise curvature tradeoff

The SCC counterexample has leaf-occupancy ratio

\[
w=\frac{B_r}{Q_{r+1}}
=0.39926564344925967184\ldots<\frac12.
\]

It therefore suggests retaining the coefficient factor instead of asking
for full SCC everywhere.  The following two weaker statements survive all
current tests:

\[
\tag{C12}
2\tau_k(I(G))\geq\tau_{k-1}(I(F)),
\]

\[
\tag{C23}
3\tau_k(I(G))\geq2\tau_{k-1}(I(F)),
\]

and

\[
\tag{HOC}
2f_{k-1}\geq g_k
\quad\Longrightarrow\quad
\tau_k(I(G))\geq\tau_{k-1}(I(F)).
\]

Together with the SM3 leaf-occupancy inequality

\[
4f_{k-1}\leq3g_k,
\]

these imply the three-quarters cascade exactly.  If
\(2f_{k-1}\leq g_k\), then

\[
\begin{aligned}
3H_k(G)-4H_{k-1}(F)
={}&g_k\{3\tau_k(G)-2\tau_{k-1}(F)\}\\
&+2\{g_k-2f_{k-1}\}\tau_{k-1}(F)\geq0.
\end{aligned}
\]

If \(2f_{k-1}\geq g_k\), then

\[
\begin{aligned}
3H_k(G)-4H_{k-1}(F)
={}&3g_k\{\tau_k(G)-\tau_{k-1}(F)\}\\
&+\{3g_k-4f_{k-1}\}\tau_{k-1}(F)\geq0.
\end{aligned}
\]

As before, the lower-rank \(\tau\) is nonnegative by induction from the
proved rank-two cascade.

More importantly, the weaker C12 and HOC already imply the **ordinary**
pendant cascade without SM3.  In the low-occupancy case,

\[
\begin{aligned}
H_k(G)-H_{k-1}(F)
={}&\frac{g_k}{2}\{2\tau_k(G)-\tau_{k-1}(F)\}\\
&+\left(\frac{g_k}{2}-f_{k-1}\right)
  \tau_{k-1}(F)\geq0.
\end{aligned}
\]

In the high-occupancy case, HOC and the leaf injection
\(g_k\geq f_{k-1}\) give

\[
H_k(G)=g_k\tau_k(G)
\geq f_{k-1}\tau_{k-1}(F)=H_{k-1}(F).
\]

Therefore C12 plus HOC, if proved, would solve Erdős Problem 993 through
the existing conditional PGC theorem.  SM3 is needed only for the
stronger three-quarters conclusion, not for unimodality.

Both C12 (indeed the stronger C23) and the conditional statement HOC
pass all 530,294
forest-product prefix comparisons through order 15.  The rigorous SCC
counterexample satisfies (C23) with a large margin and lies outside the
hypothesis of (HOC).  This package remains conjectural; it is the next
surviving curvature target, not a solution.

### 8.1 C12 alone is sufficient for unimodality

There is a simpler implication than the ordinary-PGC decomposition
above.  To prove unimodality, it is not necessary to recover the
full-strength comparison

\[
H_k(G)\ge H_{k-1}(F).
\]

It is enough to propagate the sign of the normalized reserve.  Assume
C12:

\[
2\tau_k(I(G))\ge\tau_{k-1}(I(F)).
\]

Pendant-pair deletion gives

\[
\alpha(F)=\alpha(G)-1
\]

and the cutoff arithmetic gives

\[
k<L(G)\Longrightarrow k-1<L(F).
\]

Starting with the already-proved nonnegative ranks one and two, rank
induction therefore yields

\[
\tau_{k-1}(I(F))\ge0
\quad\Longrightarrow\quad
\tau_k(I(G))\ge\frac12\tau_{k-1}(I(F))\ge0.
\]

Since

\[
H_k(I(G))=i_k(G)\tau_k(I(G)),
\]

this proves \(G_k(I(G))\ge0\) at every required prefix rank.  The GSB
inequality propagates any first coefficient descent forward until it
meets the known decreasing tail, proving unimodality.

Consequently:

> **Sharper conditional solution theorem.** C12 by itself, for one
> usable pendant edge in every nontrivial forest at every required
> rank \(k\ge3\), proves the full tree-and-forest conjecture.

HOC is needed only if one insists on recovering the stronger ordinary
PGC comparison.  It is not needed for the sign induction that resolves
the original problem.  This makes C12, rather than C12 plus HOC, the
smallest surviving normalized-curvature target in this note.

The required range can be shortened further by retaining the order in
the Fisher--Ryan--Zykov tail theorem.  If \(n=|G|\) and
\(\alpha=\alpha(G)\), it is enough to prove C12 only for

\[
3\le k<
L_*(G):=
\left\lceil
\frac{\alpha(n-1)}{\alpha+n}
\right\rceil.
\]

Pendant-pair deletion satisfies \(L_*(F)\ge L_*(G)-1\), so the same sign
induction works unchanged.  The proof and ceiling audit are in
`ORDER_SENSITIVE_TAIL_AND_C12_REDUCTION_2026-07-28.md`.  This strictly
weakens the target whenever \(n<2\alpha\).

An independent random Prüfer-code scan adds 3,000 trees of orders
16--500, five arbitrary pendant attachments per tree: 15,000 attachment
instances and 1,447,081 exact prefix ranks.  It finds no failure of C12,
C23, or HOC.  The executable scan is
`random_leaf_gsb_local_payment.py`.

The full repeated-bouquet scan over all 199 rooted polynomial states
through rooted order 8 adds 298,500 parameter instances and 298,495 exact
boundary ranks.  It finds no failure of C12, C23, or HOC; its closest
full-SCC ratio is \(1.001130578613896\ldots\).

### 8.2 Exact scalar form of C12

The half-curvature target has a particularly short relation to the
ordinary pendant cascade.  Use the notation of
`MATCHING_CONTRACTION_AND_SCALAR_CASCADE_2026-07-28.md`: put
\(r=k-1\), and write

\[
\begin{aligned}
a&=i_r(T),&a^+&=i_{r+1}(T),\\
b^-&=i_{r-1}(F),&b&=i_r(F),
\end{aligned}
\]

\[
u=r\frac b{b^-},\qquad
v=k\frac{a^+}{a},\qquad
w=k\frac{b^+}{b},\qquad
y=(k+1)\frac{a^{++}}{a^+},\qquad
s=\frac ba,
\]

\[
\theta=\frac{rs}{u+rs}.
\]

Let

\[
\begin{aligned}
E={}&v(v-y+1)+2s(u-w+1)+\frac{su}{r}-s\\
&\quad-\theta\left(v-\frac{k}{r}u\right)^2.
\end{aligned}
\tag{10}
\]

The ordinary pendant GSB cascade is exactly \(E\ge0\).  If

\[
q_F=u-w+1=\sigma_r(I(F)),
\]

then direct cancellation gives

\[
\boxed{\quad
2\tau_k(I(G))-\tau_r(I(F))
=
\frac{2kuE+r(ks-v)\,u q_F}
       {u(v+ks)}.
\quad}
\tag{11}
\]

Equivalently, after clearing coefficient denominators, let

\[
\mathcal C
=k b^-G_k(I(G))-r(a+b^-)G_r(I(F))
\]

be the ordinary pendant-cascade margin.  Then the C12 numerator is

\[
\boxed{\quad
2kG_k(I(G))b^-b
-rG_r(I(F))(a+b^-)(a^++b)
=2b\mathcal C+r(a+b^-)G_r(I(F))(b-a^+).
\quad}
\tag{12}
\]

There is also an exact variance-mixture interpretation.  Put

\[
S_F=u q_F,\qquad d=v+s-u,
\]

\[
S_A=v(v-y+1)+s\{2(v-w)+s+1\},
\qquad
R=S_A-\theta d^2.
\]

Then \(R=E\), and (11) says that C12 is equivalent to

\[
\boxed{\qquad
2kuR+r(ks-v)S_F\ge0.
\qquad}
\tag{13}
\]

Thus C12 retains exactly one compensation term that full ordinary PGC
discards.  This also explains why the known counterexamples to isolated
local payment do not refute C12.

The identity sharply limits what can prove C12.  Random positive local
coefficient windows satisfying coefficientwise root deletion, the
forest bound \(0\le\sigma\le4\), prefix GSB for the two lower
polynomials, and even ordered log-concavity of those local windows can
violate (11).  Hence a proof must use a genuinely global realizability
property of forest independence polynomials, not only these adjacent
coefficient inequalities.  Those abstract failures are not graph
counterexamples.

### 8.3 A candidate half-local payment

There is a sharper decomposition inside (11).  Put

\[
q_T=v-y+1=\sigma_k(I(T)),\qquad q_F=u-w+1,
\]

and let

\[
J=2kE+r(ks-v)q_F.
\]

Thus C12 is exactly \(J\ge0\).  Split

\[
J=2kvq_T+L,
\]

where

\[
\begin{aligned}
L={}&2k\{E-vq_T\}+r(ks-v)q_F\\
={}&\{ks(r+4)-rv\}q_F
  +\frac{2ks(u-r)}r
  -2k\theta\left(v-\frac{k}{r}u\right)^2.
\end{aligned}
\tag{14}
\]

The new candidate is

\[
\tag{HL}
\boxed{\qquad L+kvq_T\ge0.\qquad}
\]

In words, the rooted local loss may consume at most one half of the
same-rank \(T\) contribution.  If \(q_T\ge0\), then

\[
J=(L+kvq_T)+kvq_T\ge0,
\]

so (HL) proves C12.

There is a completely integral form.  With

\[
\begin{aligned}
G_T&=G_k(I(T)),&G_G&=G_k(I(G)),&G_F&=G_r(I(F)),\\
g_-&=a+b^-,&g_0&=a^++b,
\end{aligned}
\]

(HL) is

\[
\boxed{
a\{2kG_Gb^-b-rG_Fg_-g_0\}
\ge kbb^-g_-G_T.
}
\tag{15}
\]

The symbolic verifier proves (14)--(15) and the equivalent local-payment
decomposition

\[
\begin{aligned}
&a\{2kG_Gb^-b-rG_Fg_-g_0\}-kbb^-g_-G_T\\
&\qquad=
2b\Pi+kbb^-g_-G_T+ar g_-G_F(b-a^+),
\end{aligned}
\tag{16}
\]

where \(\Pi\) is the exact rooted payment in (LP-id).

The factor \(1/2\) is best possible already on stars.  Let
\(G=K_{1,N}\), choose any leaf, and take \(k\ge3\).  Then
\(T=K_{1,N-1}\), \(F=(N-1)K_1\), and direct binomial cancellation gives

\[
2kvq_T=4k(N-k),
\]

\[
L=4k^2-2(k-1)N,
\]

\[
L+kvq_T=2(N+k^2)>0.
\]

Whenever \(L<0\), the fraction of the same-rank term needed is

\[
\frac{-L}{2kvq_T}
=
\frac{(k-1)N-2k^2}{2k(N-k)}.
\tag{17}
\]

Taking \(N=m^2\) and \(k=m\) gives

\[
\frac{m-3}{2(m-1)}\longrightarrow\frac12.
\]

These ranks lie in the required prefix for all sufficiently large
\(m\).  Hence no universal constant smaller than \(1/2\) can replace
the half-payment in (HL).

The wider exact data agree with this sharp family.

- All 187,785 terminal-edge prefix checks through tree order 15 satisfy
  (HL).  The largest fraction of the same-rank term needed by one edge is
  \(291901/1215669=0.2401155\ldots\); after choosing the best terminal
  edge for each tree and rank it is \(0.2158767\ldots\).
- In 2,223,348 checks obtained by adjoining a leaf at three sampled
  roots in every one of the 43,595 exact 60-vertex PatternBoost trees,
  the maximum is \(0.3545314\ldots\).  This census disproves the
  stronger quarter-local version, but not (HL).
- In the exact two-level family \(T(m,t)\), all 400,669 prefix ranks with
  \(1\le t\le15\) and \(1\le m\le100\) satisfy (HL).  The maximum rises
  to \(0.4750723\ldots\), at \((t,m,k)=(15,100,38)\).  Larger
  reconnaissance points reach \(0.4898194\ldots\) at
  \((30,300,94)\), consistent with the sharp star calculation.
- The large Galvin points \((t,m,r)=(22,9200,141065)\) and
  \((27,47725,890865)\) require respectively
  \(0.1754558\ldots\) and \(0.1676855\ldots\).

The exhaustive and two-level outputs are
`scalar_c12_half_local_terminal_n15_20260728.json` and
`two_level_c12_half_local_t15_m100_20260728.json`.  The PatternBoost
output is `patternboost_full_c12_half_local_20260728.json`.

(HL) is still conjectural.  Moreover, the implication (HL)
\(\Rightarrow\) C12 uses \(q_T\ge0\); ordinary induction supplies this
except at the familiar independence-number boundary.  Thus a complete
proof must either establish (HL) together with the cutoff reserve, or
retain enough extra payment to handle that boundary directly.

### 8.4 Threshold form

The split is not tied to \(1/2\).  For any fixed \(c\in(0,1)\), the two
statements

\[
\tag{A_c}
\tau_k(I(G))\geq c\,\tau_{k-1}(I(F))
\]

and

\[
\tag{B_c}
f_{k-1}\geq c\,g_k
\quad\Longrightarrow\quad
\tau_k(I(G))\geq\tau_{k-1}(I(F))
\]

imply ordinary PGC.  If \(f_{k-1}\leq c g_k\), use \(A_c\) and the
coefficient factor \(g_k/f_{k-1}\geq1/c\).  Otherwise use \(B_c\) and
the leaf injection \(g_k\geq f_{k-1}\).

The choices \(c=1/2\) and \(c=2/3\) give respectively

- C12 plus HOC at occupancy \(1/2\);
- C23 plus full SCC only at occupancy \(2/3\).

This threshold formulation is useful for a proof: lowering \(c\) weakens
the global curvature bound but broadens the conditional SCC regime, while
raising \(c\) does the reverse.  The current exact data leave a wide
interval between the observed low curvature ratios and the occupancies
where SCC first fails.

### 8.5 Three-comparison and compensation repair

The scalar C12 expression has a further proved reduction recorded in
`THREE_COMPARISON_C12_REDUCTION_2026-07-28.md`.  A one-vertex
curvature comparison and two adjacent extension-ratio sandwiches imply
C12 by a single concave-quadratic endpoint calculation.  All three
comparisons pass 1,820,135 unsolved-rank terminal checks in the full
PatternBoost corpus.

The lower sandwich is slightly false on the large Galvin family, and
larger numerical Galvin points also reverse the one-vertex curvature
comparison.  Retaining their joint payment gives the repaired
curvature--likelihood inequality (CLC), with the exact integral form
(16) in that note.  CLC passes all 163,355 eligible small terminal
checks and the large Galvin stress points by wide margins.  It is now a
more robust direct target than either false comparison separately.
