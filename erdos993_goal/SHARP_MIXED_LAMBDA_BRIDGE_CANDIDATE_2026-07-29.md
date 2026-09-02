# Sharp mixed-payment/Lambda bridge

Date: 2026-07-29

## Status

This note records a new exact bridge in the current proof program for
Erdős Problem 993.  The defining identities and factorial reduction
are proved.  The stated nonnegativity inequalities have extensive
exact evidence but are not yet proved.

## Definitions

For a forest \(F\) and \(q\ge2\), write

\[
U_q(F)=P_q(F)-2S_q(F)^2,\qquad
R_q(F)=P_q(F)-S_q(F)^2.
\]

For a tree \(H\) with distinguished vertex \(v\), let \(H+v^*\) be
obtained by attaching a new leaf at \(v\), put \(G=H-v\), and define

\[
\mathcal M_q(H,v)=
U_q(H+v^*)-U_q(H)-R_{q-1}(G).
\tag{1}
\]

For the uniform family of independent \(q\)-sets in a forest \(G\),
let

\[
N=\sum_K1,\quad S=\sum_Kh_K,\quad
H_2=\sum_Kh_K^2,\quad C_0=\sum_Kc_K,
\]

where \(h_K=|V(G-N[K])|\) and \(c_K\) is the number of components of
the residual forest.  Put

\[
\Lambda_q(G)
=(q-2)N^2+C_0N-H_2N+S^2.
\tag{2}
\]

Equivalently,

\[
\Lambda_q(G)=N^2
\left(q-2+\mathbb E c_K-\operatorname{Var}(h_K)\right).
\tag{3}
\]

## Sharp bridge candidate

Every exact audit supports

\[
\boxed{\quad
\mathcal M_q(H,v)\ge(2q+1)\Lambda_q(H-v).
\quad}
\tag{4}
\]

The factor \(2q+1\) is sharp in the audited range.  For the path
\(P_{11}\), rooted at its central vertex, equality occurs at \(q=6\):

\[
\mathcal M_6=52,\qquad \Lambda_6=4,\qquad
52=(2\cdot6+1)4.
\]

Thus (4) is not an arbitrary strengthening chosen for numerical
margin.  It exposes the exact coefficient at which the main quadratic
block in the factorial remainder cancels.

If (4) and \(\Lambda_q(F)\ge0\) for forests are proved, then
\(\mathcal M_q(H,v)\ge0\), which is exactly the missing mixed part of
the recursive tree-leaf payment inequality.

## Exact factorial remainder

Put \(n=q+1\),

\[
f_k(X)=k!\,i_k(X),\qquad
g_k(X)=(k-2)!\,b_k(X),
\]

where \(b_k(X)\) counts \(k\)-vertex subsets inducing exactly one
edge.  Use the abbreviations

\[
\begin{array}{c|ccccc}
H&F_0=f_n&F_1=f_{n+1}&F_2=f_{n+2}
  &G_1=g_{n+1}&G_2=g_{n+2}\\
G=H-v&a=f_{n-1}&b=f_n&c=f_{n+1}
  &d=g_n&e=g_{n+1}\\
R=H-N_H[v]&r=f_{n-1}&s=f_n&&&
\end{array}
\]

Then direct symbolic expansion gives

\[
q!^2\left\{
\mathcal M_q(H,v)-(2q+1)\Lambda_q(G)
\right\}=\mathcal B_n,
\tag{5}
\]

where

\[
\begin{aligned}
\mathcal B_n={}&
F_0\bigl(
2an^2-6an-cn-2c+2dn-2d-3en+2r-3s
\bigr)\\
&+2b(n+1)F_1-anF_2\\
&+G_1(2an-8dn+8d-8r)-3anG_2\\
&+a(-2cn+2dn-2d+2nr-3ns)\\
&+(2n+1)b^2-8(n-1)dr-4r^2.
\end{aligned}
\tag{6}
\]

Before subtracting the sharp factor, the mixed remainder contains a
large \(a^2\) block.  In (6) that block cancels identically.  The
executable
`verify_factorial_sharp_lambda_bridge_identity.py` proves (5)
symbolically and independently replays it from exact forest moments.

## Induction-shaped strengthening

For a non-root leaf \(w\) of \(H\), every current audit also supports

\[
\begin{aligned}
&\mathcal M_q(H,v)-\mathcal M_q(H-w,v)\\
&\quad\ge(2q+1)
\left\{
\Lambda_q(H-v)-\Lambda_q(H-\{v,w\})
\right\}.
\end{aligned}
\tag{7}
\]

Equivalently, the sharp bridge gap

\[
\mathcal B_q(H,v)
=\mathcal M_q(H,v)-(2q+1)\Lambda_q(H-v)
\]

is nondecreasing when a non-root leaf is restored.  Pruning to the
isolated root would prove (4).  This is a substantially better proof
target than the original global inequality because both sides of
(7) are local leaf increments.

## Uniform-moment recursion

The forest inequality has a sharper floor.  For \(q\ge3\), every
exact audit supports

\[
\boxed{\quad
\Lambda_q(F)\ge i_q(F)^2,
\quad}
\tag{8}
\]

or, in normalized form,

\[
\operatorname{Var}(h_K)\le q-3+\mathbb E c_K.
\tag{9}
\]

There is also a denominator-free two-copy form.  If
\(\Theta_q(F)=\Lambda_q(F)-i_q(F)^2\), then symmetrizing the variance
over two independent uniform sets \(K,L\in I_q(F)\) gives

\[
\boxed{
2\Theta_q(F)=
\sum_{K,L\in I_q(F)}
\left\{
2(q-3)+c_K+c_L-(h_K-h_L)^2
\right\}.
}
\tag{9a}
\]

Thus the forest floor is exactly an averaged two-set switching
inequality.  It is not pointwise: already at order seven and rank
three there are pairs with
\((h_K-h_L)^2>c_K+c_L\).  Any switching proof must average across
the full pair family rather than compare individual pairs.

If \(F=H+\ell\), with support \(v\), and
\(G=F-\{\ell,v\}\), the sharp audited recursion is

\[
\boxed{\quad
\Lambda_q(F)-\Lambda_q(H)
\ge \Lambda_{q-1}(G)+i_q(F)^2-i_q(H)^2.
\quad}
\tag{10}
\]

Equivalently,

\[
\{\Lambda_q(F)-i_q(F)^2\}
\ge
\{\Lambda_q(H)-i_q(H)^2\}+\Lambda_{q-1}(G).
\tag{11}
\]

At \(q=2\), the plain leaf increment is nonnegative.  Thus a proof
of (10), together with the rank-two base, gives (8) and
\(\Lambda_q\ge0\) for every forest by induction on order and rank.
The earlier, weaker recursion

\[
\Lambda_q(F)-\Lambda_q(H)
\ge \Lambda_{q-1}(G)+i_{q-1}(G)^2
\tag{12}
\]

follows from (10), since
\(i_q(F)=i_q(H)+i_{q-1}(G)\).

The sharp recursion also has a compact exact factorial remainder.
Write

\[
\begin{array}{c|cccc}
H&A=f_q&B=f_{q+1}&C=f_{q+2}&X=g_{q+2}\\
G=H-v&a=f_{q-1}&b=f_q&c=f_{q+1}&e=g_{q+1}\\
R=H-N_H[v]&&&&r=f_q .
\end{array}
\]

Then

\[
\begin{aligned}
q!^2\{&
\Lambda_q(F)-\Lambda_q(H)-\Lambda_{q-1}(G)\\
&-i_q(F)^2+i_q(H)^2\}
=\mathcal E_q,
\end{aligned}
\tag{12a}
\]

where

\[
\begin{aligned}
\mathcal E_q={}&
A(2aq^2-6aq-cq-2c-3eq-3r)\\
&+2(q+1)Bb-qaC-3qaX-2qac-3qar\\
&+(2q+1)b^2.
\end{aligned}
\tag{12b}
\]

The executable
`verify_factorial_sharp_lambda_recursion_identity.py` proves
(12a)--(12b) symbolically and replays it from exact forest moments.
Thus the first structural obligation is precisely
\(\mathcal E_q\ge0\), with no unverified normalization hidden in the
reduction.

There is now an induction-shaped strengthening of this obligation.
For a forest \(F\), designated leaf \(\ell\), and its support \(v\),
write

\[
\mathcal E_q(F,\ell)=
\Lambda_q(F)-\Lambda_q(F-\ell)
-\Lambda_{q-1}(F-\{\ell,v\})
-i_q(F)^2+i_q(F-\ell)^2.
\tag{12c}
\]

Every exact audit supports the local pruning inequality

\[
\boxed{
\mathcal E_q(F,\ell)\ge
\mathcal E_q(F-w,\ell)
}
\tag{12d}
\]

whenever \(w\ne\ell\) is a leaf or isolate and deleting \(w\) leaves
\(\ell\) as a leaf.  This statement has the exact global consequence
needed here: repeatedly delete every other leaf and isolate.  All
other components disappear, and the component containing \(\ell\)
reduces to \(K_2\).  Since \(\mathcal E_q(K_2,\ell)=0\) for \(q\ge3\),
(12d) proves (10) for every forest.

The evidence supports a stronger double-induction form.  If \(w\) is
an isolate, put \(Q=F-w\).  If \(w\) is a leaf with support \(u\)
different from \(v\), put \(Q=F-\{w,u\}\).  Then

\[
\boxed{
\mathcal E_q(F,\ell)-\mathcal E_q(F-w,\ell)
\ge \mathcal E_{q-1}(Q,\ell).
}
\tag{12e}
\]

If \(u=v\), the lower term is absent.  Thus (12e) supplies the exact
lower-rank payment required for a simultaneous induction rather than
merely asserting a positive leaf increment.

The connected form has passed all \(52{,}746\) exact ordered-leaf
rank checks through order \(11\), 150 random trees through order
\(120\), and phase-separated Galvin trees through order \(484\).
The forest form has independently passed every atlas forest through
order seven and random disconnected forests through order \(100\).
The executables are
`scan_nested_sharp_lambda_recursion.py` and
`scan_nested_sharp_lambda_forest_pruning.py`.

The strong two-terminal base is now proved for every path.  If
\(P_n\) has endpoint leaves \(\ell,w\), put

\[
\mathcal N_q(n)=
\mathcal E_q(P_n,\ell)-\mathcal E_q(P_{n-1},\ell)
-\mathcal E_{q-1}(P_{n-2},\ell).
\]

For \(q\ge4\), exact falling-factorial simplification gives

\[
\begin{aligned}
q!^2\mathcal N_q(n)
={}&2q(q-1)(n-q-2)(n-2q+1)\\
&\times
(n-q-3)_{\underline{q-4}}^2Q_q(n),
\end{aligned}
\tag{12f}
\]

where the quartic \(Q_q(n)\) is positive on the full support
\(n\ge2q-1\).  The rank-three endpoint increment has the separate
factorization

\[
3!^2\{\mathcal E_3(P_n,\ell)-\mathcal E_3(P_{n-1},\ell)\}
=6(n-6)(n-5)(20n^2-238n+707)\ge0.
\tag{12g}
\]

The proof and a 61,752-case exact replay through path order 500 are
in `TWO_TERMINAL_PATH_NESTED_LAMBDA_THEOREM_2026-07-29.md` and
`verify_two_terminal_path_nested_lambda.py`.

There is a precise remaining tree reduction.  For three designated
leaves \(\ell,w,z\), let \(\mathcal N_q(T;\ell,w)\) denote the
left side of (12e) after its lower-rank term is moved left.  Every
exact audit supports

\[
\mathcal N_q(T;\ell,w)-\mathcal N_q(T-z;\ell,w)
\ge
\mathcal N_{q-1}(T-\{z,s\};\ell,w),
\tag{12h}
\]

where \(s\) supports \(z\); the lower term is omitted at rank three
and in the two support-collision cases where the lower graph would
destroy a designated terminal.  If (12h) is proved, remove every
leaf other than \(\ell,w\).  The surviving tree is their connecting
path, so (12f)--(12g) prove the strong two-terminal inequality for
every tree.  Equation (12h) has passed every unlabeled tree through
order ten:

- 190 trees with at least three leaves;
- 14,904 ordered leaf triples;
- 69,168 exact rank checks;
- zero plain or strong failures, including every support-collision
  case.

It also passed 1,093 sampled ranks on 40 random trees through order
90.  The exhaustive verifier is
`scan_third_leaf_nested_lambda_tree.py`.

The analogous fourth mixed leaf difference is false (already on the
seven-vertex tree `FqPA?`), so (12h) cannot be obtained from an
indefinite complete-monotonicity hierarchy.  Its order-three
structure must be used directly.

## Two-copy form of the sharp leaf remainder

The sharp subtraction in (12c) has an exact structural explanation.
Partition the independent \(q\)-sets of \(F=H+\ell\) into

\[
A=I_q(H),\qquad B=\ell+I_{q-1}(H-v).
\]

For \(K\in A\), let \(x_K\) be one when \(v\notin K\), and let
\(y_K\) be one when \(v\notin K\) but \(K\) meets \(N_H(v)\).
Thus adding the absent leaf changes the residual order and component
count by \(x_K,y_K\).  Write \(N,S,H_2,C\) for the four residual
moments of \(A\) measured in \(H\), put

\[
X=\sum_Kx_K,\qquad
Y=\sum_Ky_K,\qquad
H_X=\sum_Kh_Kx_K,
\]

and write \(M,T,J_2,D\) for the corresponding moments of
\(I_{q-1}(H-v)\).  Direct two-copy expansion gives

\[
\begin{aligned}
\mathcal E_q(F,\ell)={}&
NY-2NH_X+2SX-NX+X^2\\
&+2(q-3)NM+M(C+Y)+ND\\
&-M(H_2+2H_X+X)-NJ_2+2(S+X)T.
\end{aligned}
\tag{12i}
\]

The first line is the change inside the \(AA\) pair block; the last
two lines are the complete \(AB+BA\) cross-payment.  The \(BB\)
block cancels identically: the constant in
\(\Theta_q=\Lambda_q-i_q^2\) is \(q-3\), exactly the constant in
\(\Lambda_{q-1}\).

`verify_two_copy_sharp_lambda_leaf_identity.py` proves (12i)
symbolically and independently reconstructs all ordered-pair terms
on every tree through order eight.  Its 67,058 nonzero pair terms
give zero identity failures.  Individual terms can be negative
(6,892 in that audit), so the remaining proof must average or switch
between pairs; a pointwise kernel bound is false.

There is now a substantially smaller rooted target.  In the
factorial notation of (12b), define the absent-leaf block

\[
\mathcal A_q=2Bb+b^2-2Ac-3Ar
\tag{12j}
\]

and the cross block

\[
\begin{aligned}
\Gamma_q={}&
2Aaq-6Aa-Ac-3Ae+2Bb\\
&-Ca-3Xa-2ac-3ar+2b^2.
\end{aligned}
\tag{12k}
\]

The two-copy identity is equivalently

\[
q!^2\mathcal E_q=\mathcal A_q+q\Gamma_q.
\tag{12l}
\]

Put

\[
W_q=6\Gamma_q+2\mathcal A_q.
\tag{12m}
\]

Then the exact decomposition

\[
\boxed{\quad
q!^2\mathcal E_q=\frac12W_q+(q-3)\Gamma_q
\quad}
\tag{12n}
\]

shows that only two rooted nonnegativity statements are needed:

\[
\Gamma_q(H,v)\ge0,\qquad W_q(H,v)\ge0
\tag{12o}
\]

for every rooted forest \((H,v)\).

Both quantities have an induction-shaped pruning rule.  For a
degree-at-most-one vertex \(w\ne v\), let \(Q=H-w\) when \(w\) is
isolated, and let \(Q=H-\{w,u\}\) when \(w\) is a leaf with support
\(u\ne v\).  If \(u=v\), omit the lower term.  Every current audit
supports

\[
\begin{aligned}
\Gamma_q(H,v)-\Gamma_q(H-w,v)
&\ge q(q-1)\Gamma_{q-1}(Q,v),\\
W_q(H,v)-W_q(H-w,v)
&\ge q^2W_{q-1}(Q,v).
\end{aligned}
\tag{12p}
\]

For a disconnected forest, use this deterministic pruning regime:
first remove leaves from the component containing \(v\); once \(v\)
is isolated, remove an external isolate if one exists, and otherwise
remove a leaf whose support has maximum degree.  Proving (12p) for
those choices proves (12o), and (12n) then proves the sharp Lambda
recursion (10).

The symbolic decomposition and pruning program are in
`scan_rooted_cross_W6_lambda_pruning.py`.  The present certificate
covers:

- 2,333 rooted instances;
- 8,819 pruning pairs;
- 118,062 exact rank/quantity checks;
- every rooted tree through order ten;
- every disconnected atlas forest through order seven;
- 200 random forests through order 120;
- zero global or pruning failures.

The coefficient six in (12m) is structural, not cosmetic.  The
tempting smaller combination \(3\Gamma+2\mathcal A\) passes all
rooted trees through order eleven but its leaf recursion fails on a
57-vertex tree already at rank three.  The exact witness is
`rooted_Z_recursion_counterexample_20260729.json`.  The repaired
\(W=6\Gamma+2\mathcal A\) passed 22,332 additional random-tree rank
checks through order 150, while the analogous coefficients four and
five both failed.

The cross block also has an exact variance-bridge form.  Let
\(\Theta_H\) be the \(q!^2\)-scaled sharp-\(\Lambda\) surplus of
\(I_q(H)\), let \(\Theta_A\) be the same surplus when those sets'
residual statistics are measured after the new leaf is attached at
\(v\), and let \(\Theta_G\) be the
\((q-1)!^2\)-scaled surplus of \(I_{q-1}(H-v)\).  Directly,

\[
\begin{aligned}
\Theta_H&=(q-3)A^2-AC-3AX+B^2,\\
\Theta_A&=\Theta_H+\mathcal A_q,\\
\Theta_G&=(q-4)a^2-ac-3ae+b^2.
\end{aligned}
\tag{12q}
\]

The two cross families have mean residual orders

\[
\mu_A=\frac{B+b}{A},\qquad \mu_G=\frac ba.
\]

Writing \(\Delta=a(B+b)-Ab\), exact expansion gives

\[
\boxed{\quad
Aa\Gamma_q
=a^2\Theta_A+A^2\Theta_G+A^2a^2-\Delta^2.
\quad}
\tag{12r}
\]

Thus, whenever \(A,a>0\),

\[
\boxed{\quad
\frac{\Gamma_q}{Aa}
=\frac{\Theta_A}{A^2}+\frac{\Theta_G}{a^2}
1-(\mu_A-\mu_G)^2.
\quad}
\tag{12s}
\]

Consequently \(\Gamma_q\ge0\) is exactly one mean-gap inequality,
not a nine-variable polynomial accident.  The companion quantity
has the equally short identity

\[
\frac12W_q=3\Gamma_q+\Theta_A-\Theta_H.
\tag{12t}
\]

The factor three in (12t) is attained: for the forest consisting of
a five-vertex path and an isolated root, at \(q=3\),
\(\Gamma=144\), \(\Theta_H=576\), \(\Theta_A=144\), and \(W=0\).
Hence the coefficient six in \(W=6\Gamma+2\mathcal A\) is sharp for
this bridge.

`verify_rooted_gamma_variance_bridge_identity.py` proves
(12r)--(12t) symbolically.  Its independent finite replay covers
1,173 rooted forests and 5,992 ranks with zero identity failures,
zero negative \(\Gamma\) values, and zero negative \(\Theta_A\)
values.  Only the identities are proved; the mean-gap inequality in
(12s) and the signs remain proof obligations.

The support-collision case \(u=v\) has a cleaner formulation before
splitting into \(\Gamma\) and \(W\).  Let \(S\) be rooted at \(v\),
let \(F_t\) be obtained by attaching \(t\) new sibling leaves at
\(v\), and put \(J=S-v\).  The exact rooted-state polynomial is

\[
I(F_t;x)=(1+x)^tI(J;x)+xI(S-N[v];x).
\tag{12u}
\]

Every current audit supports the sharp sibling convexity bound

\[
\boxed{\quad
\mathcal E_q(F_2,\ell)-\mathcal E_q(F_1,\ell)
\ge\Lambda_{q-1}(J).
\quad}
\tag{12v}
\]

In factorial coordinates this is

\[
\Delta\widehat{\mathcal E}_q
\ge q^2\widehat\Lambda_{q-1}(J).
\]

The previously proposed coefficient two is false.  Its
minimal-order rank-three counterexample is the path \(P_{13}\), rooted
at the neighbor of an endpoint.  There

\[
\Delta\widehat{\mathcal E}_3=215{,}100,\qquad
\widehat\Lambda_2(P_{11})=12{,}096,
\]

so the coefficient-one margin is \(106{,}236>0\), while the
coefficient-two margin is \(-2{,}628\).  An exhaustive rank-three
census of all 5,663 rooted-leaf choices through tree order twelve has
no smaller counterexample.  The replay and certificate are
`verify_sibling_coefficient_two_counterexample.py` and
`sibling_coefficient_two_counterexample_20260729.json`.

The corrected exact scanner
`scan_sibling_sharp_lambda_convexity.py` covers every sibling-root
choice through tree order ten, every such atlas-forest choice through
order seven, and 100 targeted random forests through order 80:
1,233 sibling instances and 8,937 ranks, with zero coefficient-one
failures; it retains \(P_{13}\) as a deterministic negative control
for coefficient two.  The single lower-order \(\Lambda\) payment in
(12v) is sufficient, together with the lower-rank Lambda floor, to
settle the entire support-collision branch of the nested pruning
induction.

The coefficient-one surplus has two additional structures absent from
the discarded coefficient-two version.  First, if

\[
\mathcal C_q(H,v,w)=
\Delta_w\widehat{\mathcal E}_q(H,v)
-q^2\widehat\Lambda_{q-1}(H-\{v,w\}),
\]

then every exact audit supports the self-similar pruning

\[
\mathcal C_q(H,v,w)-\mathcal C_q(H-z,v,w)
\ge q^2\mathcal C_{q-1}(Q,v,w),
\tag{12va}
\]

with the lower term omitted when \(z\) is another sibling at \(v\).
The certificate
`sibling_uniform_surplus_leaf_monotonicity_certificate_20260729.json`
covers 4,432 deletions and 27,810 exact ranks through tree order ten,
all adaptive atlas forests through order seven, \(P_{13}\), and 25
random forests through order 80, with zero failures.  If (12va) is
proved, repeated pruning reduces (12v) to \(K_2\), where the surplus
is zero.

Second, the corrected surplus has an exact three-phase moment
identity.  The phases consist of rank-\(q\) sets choosing neither
sibling, rank-\((q-1)\) cores choosing exactly one, and
rank-\((q-2)\) cores choosing both.  A single lower \(\Lambda\)
cancels the new one-sibling cross phase; this is the structural reason
the natural coefficient is one rather than two.  The complete
32-term constrained moment polynomial is proved symbolically and
replayed in
`verify_sibling_uniform_three_phase_identity.py` and
`sibling_uniform_three_phase_identity_certificate_20260729.json`.
This converts the sibling case into a three-population variance
inequality; its nonnegativity, or equivalently (12va), remains to be
proved.

There is also a sharper phase-kernel expansion.  For
\(K\in I_q(S)\), \(U\in I_{q-1}(J)\), and
\(W\in I_{q-2}(J)\), let \(x_K\) indicate that \(v\notin K\), and
let \(y_K\) indicate that \(v\notin K\) but \(K\) meets \(N_S(v)\).
With residual statistics measured in \(S\) or \(J\), put

\[
\begin{aligned}
\phi(K,U)&=y_K+1
 -(h_K+2x_K-h_U-1)^2+(h_K+x_K-h_U)^2,\\
\psi(K,W)&=2(q-3)+c_K+2y_K+c_W
 -(h_K+2x_K-h_W)^2,\\
\chi(U,W)&=2(q-3)+c_U+c_W+1
 -(h_U+1-h_W)^2.
\end{aligned}
\]

If \(N=|I_q(S)|\), \(X=\sum_Kx_K\), and
\(M=|I_{q-1}(J)|\), exact phase cancellation gives

\[
\boxed{
2\mathcal C_q=
-4X(N-X)+4\sum\phi+2\sum\psi+2\sum\chi
+2\Lambda_{q-1}(J)+6M^2.
}
\tag{12vb}
\]

The symbolic phase derivation and 684-rank replay are in
`verify_sibling_uniform_phase_kernel_identity.py` and
`sibling_uniform_phase_kernel_identity_certificate_20260729.json`.
This proves that the only unconditional loss is
\(-4X(N-X)\).  The \(\phi\)- and \(\psi\)-sums can individually be
negative; the \(\chi\)-sum survived every current audit.

The latter fact has a precise conditional proof.  Put \(r=q-1\), let
\(\mu_s\) be the mean residual order for a uniform member of
\(I_s(J)\), and normalize the sharp floors by

\[
\tau_s=s-3+\mathbb E c_s-\operatorname{Var}(h_s).
\]

Direct expansion of the \(\chi\)-average gives

\[
\frac{\sum\chi}{|I_r(J)|\,|I_{r-1}(J)|}
=\tau_r+\tau_{r-1}
+4-(1+\mu_r-\mu_{r-1})^2.
\tag{12vc}
\]

For a residual forest, \(m\le h\).  The exact extension-mean identity

\[
\mu_r=\mu_{r-1}-1+
\frac{\operatorname{Var}(h_{r-1})-2\mathbb E m_{r-1}}
{\mu_{r-1}}
\]

therefore gives \(\mu_r\ge\mu_{r-1}-3\).  Whenever the lower graph
also has the one-unit drift bound
\(\mu_r\le\mu_{r-1}+1\), the square in (12vc) is at most four.
Consequently the two lower-rank sharp floors
\(\tau_r,\tau_{r-1}\ge0\) imply \(\sum\chi\ge0\).
Thus the unresolved sibling charge is concentrated in the coupled
\(-4X(N-X)+4\sum\phi+2\sum\psi\) block, plus the subcase in which the
lower graph is already beyond one-unit drift.

A more effective regrouping retains the complete lower sharp-floor
surplus.  Define the sibling theta core

\[
\boxed{
\mathcal D_q(H,v,w)=
\Delta_w\widehat{\mathcal E}_q(H,v)
-2q^2\widehat\Lambda_{q-1}(J)
+q^2f_{q-1}(J)^2.
}
\tag{12vd}
\]

Since
\(\widehat\Theta_{q-1}(J)=
\widehat\Lambda_{q-1}(J)-f_{q-1}(J)^2\), one has exactly

\[
\mathcal C_q
=\mathcal D_q+q^2\widehat\Theta_{q-1}(J).
\tag{12ve}
\]

Thus \(\mathcal D_q\ge0\), together with the lower-order sharp floor,
proves the corrected sibling reserve.  In phase-kernel form,

\[
2\mathcal D_q/(q!)^2=
-4X(N-X)+4\sum\phi+2\sum\psi+2\sum\chi+8M^2.
\tag{12vf}
\]

This is exactly the budget lost by the false coefficient-two
strengthening: that strengthening discarded the entire lower
\(\Theta\), while (12ve) retains it.

The theta core has the same self-similar pruning pattern:

\[
\boxed{
\mathcal D_q(H,v,w)-\mathcal D_q(H-z,v,w)
\ge q^2\mathcal D_{q-1}(Q,v,w),
}
\tag{12vg}
\]

with the usual support-collision omission.  The exact scanner
`scan_sibling_theta_core_pruning.py` and certificate
`sibling_theta_core_pruning_certificate_20260729.json` cover 4,432
deletions and 27,861 ranks: every ordered leaf pair through tree order
ten, all adaptive atlas forests through order seven, \(P_{13}\), and
25 random forests through order 80, with zero failures.  Separate
stress checks include 100 random forests through order 120 and
Galvin's 239-vertex \(T_{14,8}\).  Proving (12vg), with its terminal
path/edge base, is now the most compact sibling proof target.

The recursive gap in (12vg) now has an exact cross-phase reduction.
Write \(S=B+z\), where \(z\) is supported by \(s\ne v\), and put
\(L=B-s\).  If \(d_q(B,v)\) denotes the unscaled theta core obtained
by adjoining the distinguished sibling to \(B\), then for \(q\ge4\)

\[
R_q(B;v,s)=d_q(S,v)-d_q(B,v)-d_{q-1}(L,v)
\tag{12vh}
\]

is exactly the pruning margin divided by \(q!^2\).  Splitting the
independent sets into an absent-\(z\) and a selected-\(z\) phase
cancels every pure selected-phase term.  The remaining 104-term
moment polynomial is proved symbolically in
`derive_sibling_theta_core_recursive_gap.py`; its exact replay has no
failure on 958 rooted-support-rank instances through tree order six.
The rank-three case omits the formal rank-two core and remains a
separate boundary inequality.

More importantly, twice (12vh) separates algebraically into only two
candidate inequalities:

\[
\begin{aligned}
\mathcal A_q&=
\Delta(\text{root-indicator})
+\Delta(4\sum\phi)+\Delta(8M^2),\\
\mathcal B_q&=
\Delta(2\sum\psi)+\Delta(2\sum\chi),\\
2R_q&=\mathcal A_q+\mathcal B_q.
\end{aligned}
\tag{12vi}
\]

Every exact audit has \(\mathcal A_q\ge0\) and
\(\mathcal B_q\ge0\) separately.  This is substantially sharper than
the unsplit observation: the root, \(\phi\), and \(\psi\) pieces can
all be negative individually.

The first block is a pure shadow expression.  For one rooted core,
put \(J=B-v\), \(R=B-N_B[v]\), and

\[
M=i_{q-1}(J),\quad X=i_q(J),\quad
r=i_{q-1}(R),\quad t=i_q(R).
\]

Using \(\sum_{I_k(G)}h=(k+1)i_{k+1}(G)\) and
\(\phi=2(h_K-h_U)(1-x_K)+x_K+y_K\), its complete doubled value is

\[
\boxed{
4\{2M^2+2X(M-r)+(2q-1)(Mt-Xr)\}.
}
\tag{12vj}
\]

Thus \(\mathcal A_q\) is the cross-polarization of (12vj) under the
leaf recurrence.  The second block retains precisely the component
and squared-residual terms absent from (12vj).

The enumeration-based phase audit
`analyze_sibling_theta_core_recursive_phase_blocks.py` covers 15,824
root-support-rank choices over every atlas forest through order seven
with no failure of either block.  The moment-DP stress verifier
`stress_sibling_theta_core_recursive_phase_split.py` adds 2,124 exact
checks on 200 random forests through order 120, ranks through 14, and
three Galvin families, again with no failure.  The certificates are
`sibling_theta_core_recursive_gap_identity_certificate_20260729.json`,
`sibling_theta_core_recursive_phase_blocks_20260729.json`, and
`sibling_theta_core_recursive_phase_split_stress_20260729.json`.
Consequently (12vg) has been reduced to a shadow inequality
\(\mathcal A_q\ge0\), a component-square inequality
\(\mathcal B_q\ge0\), and the rank-three boundary.

The shadow block also survives the known ratio-dominance obstruction.
`stress_sibling_shadow_star_fork.py` checks 63 exact central ranks in
three star-fork families of orders up to \(48{,}004\).  The ordinary
PIRD determinant is negative at all 63 ranks, while both (12vj) and
its recursive cross-polarization are strictly positive.  The exact
FLINT certificate is
`sibling_shadow_star_fork_stress_20260729.json`.  Thus a proof may use
the full compensated shadow expression, but not the sign of its PIRD
minor alone.

The component-square block survives the same obstruction.  After an
exact 150-case replay of the closed polynomial formulas against
vertex-by-vertex graph enumeration,
`stress_sibling_phase_split_star_fork.py` checks 51 central ranks in
the same three families.  Both \(\mathcal A_q\) and
\(\mathcal B_q\) are strictly positive at every rank, including the
order-\(48{,}004\) family.  The replay and stress certificates are
`sibling_phase_split_star_fork_formula_replay_20260729.json` and
`sibling_phase_split_star_fork_stress_20260729.json`.  This is exact
adversarial evidence, not a proof of either block.

There is also an exact forest-specific reduction of the second block.
Let \(L=B-s\), \(J=B-v\), \(K=B-\{v,s\}\), and let \(e_r(G)\)
denote the total number of residual edges over \(I_r(G)\).  Substituting
\(c=h-e\) and
\(\sum h^2=\sum h+(r+1)(r+2)i_{r+2}+2e_r\) gives

\[
\begin{aligned}
\mathcal B_q={}&\mathcal R_q^{\rm count}-6\{&
p\,e_q(B)+P\,e_{q-1}(L)+p\,e_{q-1}(J)\\
&&+(m+n)e_{q-2}(J)+P\,e_{q-2}(K)\\
&&+(N+M)e_{q-3}(K)\},
\end{aligned}
\]

where \(N=i_q(B)\), \(n=i_{q-1}(L)\),
\(M=i_{q-1}(J)\), \(P=i_{q-2}(J)\),
\(m=i_{q-2}(K)\), and \(p=i_{q-3}(K)\).
The 79-term edge-free reserve \(\mathcal R_q^{\rm count}\) is recorded
verbatim and the identity proved symbolically in
`derive_sibling_component_square_edge_burden.py`, with certificate
`sibling_component_square_edge_burden_identity_certificate_20260729.json`.
Thus the unresolved part of \(\mathcal B_q\ge0\) is now exactly a
six-term surviving-edge payment, not an unspecified variance bound.

The actual rank-three boundary has the same shape.  After all
rank-zero, rank-one, and forest-moment identities are substituted,
\[
\begin{aligned}
d_3(B+z,v)-d_3(B,v)=\mathcal R_3^{\rm count}-3\{&
e_3(B)+(P+1)e_2(L)+e_2(J)\\
&+(m+n)e_1(J)+(P+1)e_1(K)\\
&+(M+N+m+n)e_0(K)\}.
\end{aligned}
\]
Here the graph notation is the same as above, specialized to \(q=3\).
The edge-free reserve now has 43 terms.  This exact reduction is
proved in `derive_rank3_sibling_theta_leaf_increment.py`, with
certificate
`rank3_sibling_theta_plain_leaf_increment_identity_20260729.json`.
The unincremented core itself reduces to only 15 coefficient/edge
terms in `derive_rank3_sibling_theta_core.py`.  These reductions do
not yet prove the rank-three sign, but show that it is the boundary
instance of the same residual-edge payment problem as
\(\mathcal B_q\), rather than a separate variance phenomenon.

The rank-three bare-path terminal is now proved.  If the base is the
path of \(L\) edges between the protected vertices, the actual
rank-three increment (with no formal rank-two core subtracted) is,
for \(L\ge3\),
\[
3!^2\Delta d_3
=24(2L^3-18L^2+85L-87)
=24\{2(L-3)^3+31(L-3)+60\}>0.
\]
The two shorter paths have exact values \(0\) and \(288\).  The
symbolic proof and replay are
`derive_rank3_bare_path_terminal_gap.py` and
`rank3_bare_path_terminal_gap_theorem_20260729.json`.

Unlike the \(q\ge4\) combined phase gap, the actual rank-three
quantity is not leaf-monotone.  The first ordinary-leaf combined
failure is \(-8\) on the five-vertex tree `DqO`; even choosing the
best removable leaf can fail.  In
`probe_rank3_protected_leaf_monotonicity.py`, support-leaf and isolate
increments have no combined failure, but ordinary and root-leaf
increments do.  Thus the rank-three proof cannot simply reuse the
protected-leaf induction above; it must exploit the 43-term
edge-payment formula or add a compensating potential.

One complete rank-three phase has now been proved.  If \(J\) is a
forest with marked vertex \(s\), let \(J+z\) add a leaf at \(s\).
Then
\[
\boxed{\chi_3(J+z)-\chi_3(J)\ge0.}
\tag{12vn}
\]
Half the increment has the exact elementary form
\[
\begin{aligned}
&3n^3-7n^2+6n-2+m(-3n^2+n-4)+12d(n-1)\\
&\quad+12\{W-\tbinom d2\}
+3(n-3)\{W_s+\tbinom d2\}+12M_s+3T_4,
\end{aligned}
\]
where \(n,m\) are the vertex and edge counts, \(d=\deg(s)\),
\(W\) is the wedge count, \(W_s\) counts wedges having \(s\) as an
endpoint, \(M_s\) counts two-edge matchings avoiding \(s\), and
\(T_4\) counts four-vertex subtrees.  With at least two components
the first line is already positive.  For a tree,
\[
M_s=\binom{n-1-d}{2}-W+\binom d2+W_s,
\]
and substitution reduces twice the expression to
\[
\begin{aligned}
6T_4+6(n+1)W_s
3d^2(n+1)-3dn+21d+6n^2-34n+28.
\end{aligned}
\]
For \(d=1,2,3\), the remaining quadratics in \(n\) have
discriminants \(-92,-1184,-2576\); for \(d\ge4\), every remaining
coefficient is positive.  The rooted-pattern derivation and exact
certificate are `prove_rank3_chi_leaf_monotonicity.py` and
`rank3_chi_leaf_monotonicity_theorem_20260729.json`.

The complementary block
\(\mathcal E=\text{root}+\phi+\psi+\text{mass}\) is not always
nonnegative: its first connected failure occurs at order ten.
However every current audit supports
\[
\boxed{4\mathcal E+\chi\ge0.}
\tag{12vo}
\]
This would finish rank three because
\(\mathcal E+\chi=(4\mathcal E+\chi)/4+3\chi/4\).
Equation (12vo), rather than the false sign of \(\mathcal E\) alone,
is now the remaining rank-three target.

The connected terminal base is proved.  If the distinguished
component is a star with \(k\) ordinary leaves in addition to \(w\),
put

\[
N=\binom{k}{q},\qquad
M=\binom{k}{q-1},\qquad
P=\binom{k}{q-2}.
\]

Every set in each of the three phases then has deterministic residual
statistics, with
\(\phi=2\) and \(\psi=\chi=2(k-1)\).  Hence

\[
\boxed{
\frac{2\mathcal D_q}{(q!)^2}
=8NM+4(k-1)NP+4(k-1)MP+8M^2\ge0.
}
\tag{12vk}
\]

The symbolic proof and 5,252-rank replay through \(k=100\) are in
`verify_sibling_theta_core_star_base.py` and
`sibling_theta_core_star_base_certificate_20260729.json`.  Thus a
proof of the two signs in (12vi), together with the rank-three
boundary, can prune every non-sibling leaf and terminate at the
proved star formula (12vk); no support-collision induction is needed.

The disconnected terminal base is also proved, so no isolate
increment is needed.  Let the base consist of the same rooted star
and \(t\) external isolates, and put \(n=k+t\),
\(P=\binom n{q-2}\), \(R=\binom t{q-1}\).  Exact phase reduction gives

\[
\frac{2\mathcal D_q}{(q!)^2}
=
\frac{2P}{q(q-1)^2}
\{A P-(q-1)C R\},
\tag{12vl}
\]

where

\[
A=2(n+1)(n-q+2)(nq+n-3q+5)\ge0
\]

on the support, and \(C=C(k,t,q)\) is an explicit quadratic in \(k\).
If \(C\le0\) or \(R=0\), (12vl) is immediate.  Otherwise \(t\ge q-1\)
and

\[
\frac PR
=\frac{q-1}{t-q+2}
\prod_{j=0}^{q-3}\frac{k+t-j}{t-j}
\ge
\frac{q-1}{t-q+2}
\left(1+\frac{(q-2)k}{t}\right).
\]

The remaining sufficient inequality

\[
A\left(1+\frac{(q-2)k}{t}\right)
\ge (t-q+2)C
\]

is symbolic: after multiplication by \(t\), setting \(q=3+r\) and
\(t=q-1+u\) produces a 58-term polynomial in \(k,u,r\), all of whose
coefficients are nonnegative.  The proof and a 9,702-rank replay are
in `verify_sibling_theta_core_star_isolate_base.py` and
`sibling_theta_core_star_isolate_base_certificate_20260729.json`.
Thus the complete terminal state for adaptive disconnected pruning is
settled.

Deepest-leaf pruning exposes an additional regularity.  Remove all
current leaf children of a deepest support \(s\), leaving a core in
which \(s\) is itself a leaf, and then attach \(d\) ordinary children
back to \(s\).  For fixed \(q\), each block in (12vi) is a polynomial
in \(d\).  Its coefficients in the binomial basis
\(\{\binom d j\}\) are its forward differences at \(d=0\).
`analyze_deepest_support_leaf_bundle_differences.py` checks 224,211
such coefficients over every rooted tree and disconnected atlas
forest through order seven, and finds every coefficient of
\(\mathcal A_q\), \(\mathcal B_q\), and their sum nonnegative.

More importantly, both blocks appear to admit a second acyclic leaf
recursion.  If \(z\ne s,v\) is another core leaf supported by
\(t\notin\{s,v\}\), put \(B'=B-z\) and \(B''=B-\{z,t\}\).  Every exact
audit supports
\[
\begin{aligned}
\mathcal A_q(B;s)-\mathcal A_q(B';s)
&\ge\mathcal A_{q-1}(B'';s),\\
\mathcal B_q(B;s)-\mathcal B_q(B';s)
&\ge\mathcal B_{q-1}(B'';s).
\end{aligned}
\]
`probe_second_leaf_recursion_for_phase_blocks.py` checks 122,067
block margins over every tree through order nine, with no failure.
`stress_second_leaf_phase_recursion.py` adds 3,186 exact margins on
118 random forests through order 100 and rank 12, including 77
external-component deletions, again with no failure.  If proved, this
double recursion strips the remaining core to a path from \(v\) to
\(s\) with only root-adjacent leaves; that broom/path terminal family
is the next finite-formula target.

The bare-path part of that terminal family is now proved.  Let
\(\mathcal T_q(L)=\mathcal A_q+\mathcal B_q\) when the base \(B\) is
the path of \(L\) edges from \(v\) to \(s\).  If \(L<2q-4\), every
product in the five phase blocks vanishes.  For \(L\ge2q-4\), exact
path moment substitution gives

\[
q!^2\mathcal T_q(L)=
\frac{2q(q-1)(L-q)!(L-q+1)!}
{(L-2q+4)!(L-2q+6)!}\,Q_q(L),
\tag{12vm}
\]

where \(Q_q\) is an explicit sextic.  Put
\(x=L-(2q-4)\) and \(r=q-4\).  The coefficients of
\(Q_q(2q-4+x)\), from \(x^6\) through \(x^0\), have the following
coefficient lists as polynomials in \(r\):

\[
\begin{gathered}
(8,34,34),\\
(28,170,331,192),\\
(44,404,1436,2280,1326),\\
(40,508,2641,6935,9179,4912),\\
(20,332,2292,8343,16831,17848,7808),\\
(4,90,816,3914,10826,17354,14916,5264),\\
(6,98,670,2486,5404,6872,4720,1344).
\end{gathered}
\]

Every entry is positive.  Hence \(Q_q(L)>0\) throughout the supported
range, and \(\mathcal T_q(L)\ge0\) for every \(q\ge4\) and every bare
path.  The symbolic derivation and sign certificate are
`derive_bare_path_terminal_phase_gap.py` and
`bare_path_terminal_phase_gap_identity_20260729.json`.

There is strong evidence that the remaining terminal decorations can
be removed monotonically.  Adding one root leaf, one support leaf, or
one isolate never decreased \(\mathcal T_q(B;v,s)\) in
`probe_terminal_decoration_monotonicity.py`: the exact audit covers
49,425 increments over every rooted tree through order eight, every
atlas forest through order seven, and 80 random forests through order
90, with no failure.  The certificate is
`terminal_decoration_monotonicity_probe_20260729.json`.  Moreover, a
degree-complete binomial-basis audit of the full broom parameters
finds no negative coefficient in the combined block through ranks
four to six and path lengths through ten.  The shadow block alone has
negative high mixed coefficients, while the component-square block
compensates them exactly; therefore terminal decoration positivity
must retain the combined block.

The endpoint collisions also fit a complete protected-leaf induction.
If a leaf is attached to \(v\), delete it and shift the lower-rank
root one step from \(v\) toward \(s\); if it is attached to \(s\),
delete it and shift the lower-rank support toward \(v\); if it is an
isolate, the lower-rank state is the same protected forest.  Together
with the unrelated-leaf recurrence above, these three recurrences
reduce every protected forest to its \(v\)-to-\(s\) path by a
lexicographic induction on rank and order.  The combined block has no
failure among 39,534 exact shifted-endpoint/isolate case-rank margins
through every tree of order eight and 80 random forests of order at
most 90.  The root-shift shadow block alone is false on larger
forests, but its component-square compensation makes the combined
margin nonnegative in every audit.  The precise four recurrences and
the conditional induction proof are in
`PROTECTED_LEAF_PHASE_INDUCTION_REDUCTION_2026-07-29.md`; the verifier
is `probe_shifted_endpoint_phase_recursion.py`.

Small cyclic cores misleadingly exhibit the same shadow phenomenon:
`analyze_shadow_bundle_arbitrary_graphs.py` finds no negative value
among 305,425 binomial-basis coefficients for every nonroot leaf of
388 connected cyclic atlas graphs through order seven.  The
graph-general strengthening is nevertheless false.  At \(q=6\), take
the inner graph to be an isolated root-neighbor together with four
disjoint copies of \(K_N\).  The shadow cross block for attaching the
first child to the support leaf is exactly
\[
-N^6(N^2-64N-64),
\]
and is first negative at \(N=65\), on 263 vertices.
`verify_shadow_bundle_general_graph_counterexample.py` proves the
factorization and replays the two threshold cases; its certificate is
`shadow_bundle_general_graph_counterexample_20260729.json`.
Even bipartiteness is insufficient.  In the Bhattacharyya--Kahn
family \(G(a,b)\), connect the new root to their \(V_1\) block and to
the support leaf.  Since
\[
i_t(G(a,b))=(2^t-1)\binom at+\binom bt,\qquad
i_t(G(a,b)-V_1)=2^t\binom at,
\]
the shadow block can be evaluated without enumeration.  The unique
negative instance of order at most 55 in this family is
\((a,b,q)=(22,31,23)\), where
\[
\mathcal A_q/4=-1{,}533{,}040{,}468{,}272{,}654.
\]
The construction and complete threshold-family check are in
`verify_shadow_bundle_bipartite_counterexample.py` and
`shadow_bundle_bipartite_counterexample_20260729.json`.
`probe_shadow_bundle_sequence_generality.py` also quickly finds
failures for arbitrary nonnegative coefficient sequences.  Thus the
plausible proof mechanism remains a switching theorem followed by
binomial-positive leaf convolution, but it must use acyclicity
itself; bipartiteness and nested graph-minor algebra are insufficient.

One tempting auxiliary strengthening is false.  Although the
required increment \(\Delta W_q\ge0\) survives, the proposed bound

\[
\Delta W_q\ge4q^2\widehat\Lambda_{q-1}(J)
\]

fails at rank four on a leaf-minimal 26-vertex witness.  There
\(\Delta W=19{,}379{,}563{,}200>0\), but the strengthened margin is
\(-137{,}436{,}480\).  The deterministic reconstruction and exact
certificate are
`shrink_sibling_W6_lambda_strengthening_counterexample.py` and
`sibling_W6_lambda_strengthening_counterexample_20260729.json`.
Thus the sibling case should be attacked through the full convexity
remainder (12v), not by overpaying its \(W\) component separately.

The conditional surplus \(\Theta_A\) has its own simpler pruning
pattern.  With \(Q\) and the adaptive choice of \(w\) as in (12p),
every exact audit supports

\[
\boxed{\quad
\Theta_{A,q}(H,v)-\Theta_{A,q}(H-w,v)
\ge q^2\Theta_{A,q-1}(Q,v),
\quad}
\tag{12w}
\]

again omitting the lower term when the support of \(w\) is \(v\).
The certificate
`rooted_conditional_theta_pruning_certificate_20260729.json` covers
2,173 rooted instances, 8,659 pruning pairs, and 52,941 exact rank
checks: every rooted tree through order ten, every adaptive
disconnected atlas forest through order seven, and 40 random forests
through order 80, with zero failures.  Proving (12u) would establish
\(\Theta_A\ge0\) independently and supply the first variance budget
in (12s).  Its naive pairwise kernel is still false: 2,726 of 60,107
terms in a separate small-tree diagnostic are negative, so (12w)
also requires an averaged switching.

The sibling correction reveals a uniform local reserve shared by all
four deletion geometries.  In the rooted representation, let
\(\widehat{\mathcal E}_q(H,v)\) denote \(q!^2\) times the sharp leaf
remainder obtained by attaching a designated leaf at \(v\).  For a
degree-at-most-one vertex \(w\ne v\), put

\[
Q=\begin{cases}
H-w,&w\text{ isolated},\\
H-\{w,u\},&w\text{ a leaf with support }u\ne v,\\
H-w,&u=v\text{ (reserve graph only)},
\end{cases}
\qquad J=Q-v.
\]

Define

\[
\widehat{\mathcal N}_q=
\widehat{\mathcal E}_q(H,v)
-\widehat{\mathcal E}_q(H-w,v)
-q^2\widehat{\mathcal E}_{q-1}(Q,v),
\]

omitting the last term when \(u=v\).  Every corrected audit supports

\[
\boxed{\quad
\widehat{\mathcal N}_q
\ge q^2\widehat\Lambda_{q-1}(J)
\quad}
\tag{12x}
\]

with coefficient one uniformly for sibling, distance-two, separated,
and isolate geometries.  For disconnected forests, arbitrary external
leaves are false; the valid adaptive rule is to use a root-component
leaf first, then an external isolate, then an external leaf whose
support has maximum degree.

The corrected certificate
`nested_sharp_lambda_local_reserve_certificate_20260729.json` covers
8,640 pruning pairs and 52,338 exact ranks: every rooted/nonroot-leaf
choice through tree order ten, every adaptive disconnected atlas
choice through order seven, \(P_{13}\), and 20 random forests through
order 60, with zero coefficient-one failures.  If (12x) is proved, a
simultaneous induction on order and rank gives (12e), then
\(\mathcal E_q\ge0\), and then the sharp Lambda floor (8).  Thus the
proof bottleneck has narrowed to the uniform coefficient-one reserve,
not the discarded geometry-dependent coefficient-two version.

There are three moment numerators in the pure disjoint-union shift,
denoted \(\Lambda,I,J\).  If \(A_\Lambda,A_I,A_J\) are their leaf
recursion gaps after the lower-rank terms in (12) and its analogues
are removed, the stronger exact pattern is

\[
A_I\ge2i_q(F)A_\Lambda,\qquad
A_J\ge\{i_q(F)+i_q(H)\}A_\Lambda.
\tag{13}
\]

Thus (13), if proved algebraically, reduces all three pure-shift
recursions to the single sharp \(\Lambda\) recursion (10).

## Deletion-fiber form of the sharp floor

There is an exact probabilistic reformulation of (8).  Choose a
uniform independent \(q\)-set \(K\), then choose a uniformly marked
vertex \(v\in K\).  Put

\[
F_v=F-N[v],\qquad
p_v=\frac{i_{q-1}(F_v)}{q\,i_q(F)},
\]

and let

\[
a_v=\mathbb E_{I_{q-1}(F_v)}h,\qquad
\lambda_v=
\frac{\Lambda_{q-1}(F_v)}{i_{q-1}(F_v)^2}.
\]

The residual forest does not change when the marked selected vertex
is deleted first.  The law of total variance gives the exact identity

\[
\frac{\Lambda_q(F)-i_q(F)^2}{i_q(F)^2}
=
\sum_vp_v\lambda_v-\operatorname{Var}_p(a_v).
\tag{14}
\]

Consequently, the sharp floor is equivalent to

\[
\boxed{\quad
\operatorname{Var}_p(a_v)\le\sum_vp_v\lambda_v.
\quad}
\tag{15}
\]

This weighted Poincaré form has passed every tree through order
\(13\), \(12{,}944\) exact rank checks, with zero failures.  The
tempting simplification \(\operatorname{Var}_p(a_v)\le1\) is false:
the first audited failure is a 12-vertex tree at \(q=3\), where the
variance equals

\[
\frac{3268019379}{3174832360}>1.
\]

Thus the lower-rank \(\Lambda\) budget in (15) is essential.

A second tempting martingale split is also false.  Reveal the first
\(q-3\) vertices of a uniform ordered independent \(q\)-tuple and
condition on the remaining rank-three link.  If the conditional mean
of the final residual order is \(m(P)\), then the separated bound

\[
\operatorname{Var}(m(P))\le q-3
\tag{16}
\]

would combine with a rank-three component floor by the law of total
variance.  It passes every tree through order \(13\), but fails
exactly at rank \(q=4\) on the 19-vertex tree

```
RG??C???L???G??p??Iw?GG?_????_
```

where

\[
\operatorname{Var}(m(P))
=
\frac{120619847996752134237557}
{111473414863696308221370}
=1.08205\ldots>1.
\]

The conditional rank-three component surplus still pays the excess,
so this is not a counterexample to (8).  It proves that the prefix
variance and the lower-link \(\Lambda\) budget must remain coupled,
just as in (15).  The exact shrinking replay is
`shrink_rank4_prefix_variance_counterexample.py`, with certificate
`rank4_prefix_variance_counterexample_20260729.json`.

## Exact evidence

The sharp global bridge has passed:

- every rooted unlabeled tree through order \(13\);
- \(27{,}919\) rooted trees and \(174{,}828\) exact rank checks in
  that census;
- zero bridge failures and zero negative \(\Lambda\) values.

The sharp nested leaf form (7) has passed:

- every rooted/non-root-leaf choice through order \(11\);
- \(21{,}269\) rooted leaf deletions and \(111{,}660\) exact rank
  checks;
- zero failures.

The relevant executables and certificates are:

- `scan_mixed_payment_lambda_bridge.py`;
- `mixed_payment_lambda_bridge_certificate_20260729.json`;
- `scan_nested_bridge_monotonicity.py`;
- `nested_bridge_monotonicity_certificate_20260729.json`;
- `verify_factorial_sharp_lambda_bridge_identity.py`;
- `factorial_sharp_lambda_bridge_identity_certificate_20260729.json`;
- `scan_uniform_shift_moment_recursion.py`.

These are finite exact audits and symbolic identities, not a proof of
the nonnegativity claims.

## Remaining proof obligations on this route

The route now has three focused structural obligations:

1. prove the sharp forest \(\Lambda\) leaf recursion (10), or the
   equivalent deletion-fiber Poincaré inequality (15);
2. prove the sharp nested bridge increment (7);
3. prove the complete mixed bracket in the disjoint-union payment
   decomposition.

Obligation 1 also appears to imply the other two pure component-shift
moment inequalities through (13).  Obligations 1 and 2 now share the
same leaf-local statistic, so a simultaneous induction or rooted
three-state moment decomposition is the next proof target.

## Update: complete rank-three deepest-bundle coefficients

The actual rank-three total
\(\mathcal E+\chi\), rather than the unnecessarily stronger
\(4\mathcal E+\chi\), has a positive deepest-bundle expansion.
Let \(C\) be a core tree with protected vertices \(v,s\), let \(t\)
be a leaf off the \(v\)-\(s\) path with parent outside
\(\{v,s\}\), and attach \(d\) new children to \(t\).  If \(T_C(d)\)
is the actual rank-three support-leaf increment, then

\[
T_C(d)=\sum_{j=0}^4c_j\binom dj
\]

and, for every core order at least six,

\[
c_1\ge0,\qquad c_2>0,\qquad
c_3=12|C|+32\,1_{v\sim s}+92,\qquad c_4=32.
\]

The high coefficients are symbolic.  The first coefficient has an
exact local formula in degrees, wedges, connected four-subtrees, and
two residual minors.  Its proof splits at order eighteen:

- all \(81{,}129\) nonisomorphic trees of orders \(6,\ldots,17\);
- all \(125{,}115{,}626\) valid marked quadruples on those trees;
- zero failures, with minimum \(4\) at order six;
- a symbolic certificate for every \(n\ge18\), over all twenty
  possible truncated distance patterns, with minimum relaxed
  margin \(94\).

The crucial corrected minor statistic is
\(D(F)=T_4(F)-W(F)\), not a bare four-subtree count.  After rooted
motif reduction,

\[
c_1=\mathcal L+
12T_4(L)+18W(L)-8M_v-22M_s-6W_b+12W_u,
\]

where \(L=C-t\).  The rooted wedge injections and
\(T_4(L)-W(L)\ge-1\) reduce this to three elementary polynomial
branches.  The complete proof is
`RANK3_DEEPEST_BUNDLE_THEOREM_2026-07-30.md`.

The endpoint double-broom and caterpillar terminals are also proved.
For a path of \(L\) edges with arbitrary leaf bundles at \(v\), at
the neighbor of \(s\), and at \(s\), the exact three-variable
product-binomial expansion reduces the apparent negative
coefficients to two root differences; both have positive forward
differences after \(r=2\).  The certificates are
`prove_rank3_double_broom_terminal.py`,
`prove_rank3_triple_broom_terminal.py`,
`rank3_double_broom_terminal_20260730.json`, and
`rank3_triple_broom_terminal_20260730.json`.

Finally, the two endpoint-depth collisions excluded above are now
proved.  If the parent of the bundle center \(t\) equals \(v\) or
\(s\), the expansion still has degree four and

\[
c_1,c_2,c_3,c_4>0,\qquad c_4=32.
\]

The exact first-coefficient split has the same global tree reserve as
the noncollision theorem.  Its remaining local polynomial has nine
coefficientwise-positive branches in the root case; in the support
case the only negative monomials are absorbed by positive integer
quadratics.  The theorem and independently replayable certificate
are `RANK3_ENDPOINT_COLLISION_BUNDLE_THEOREM_2026-07-30.md`,
`certify_rank3_endpoint_collision_bundles.py`, and
`rank3_endpoint_collision_local_split_20260730.json`.

Thus the complete rank-three pruning boundary, including the
caterpillar terminal and both endpoint collisions, is closed.  The
remaining induction work is now entirely in the four protected-leaf
recurrences for \(q\ge4\), followed by the sharp
\(\Lambda\)/mixed-payment bridge.
