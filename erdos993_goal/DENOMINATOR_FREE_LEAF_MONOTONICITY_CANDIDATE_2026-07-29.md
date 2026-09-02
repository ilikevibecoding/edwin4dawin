# Strong denominator-free leaf monotonicity candidate

Date: 2026-07-29

## Status

The coefficient recurrences below are proved.  The monotonicity
inequality is now asserted only for deleting a leaf from a tree.  It
survives the exact audits listed below, including families that
refute the rank-free floor and several finer compatibility claims.

The unrestricted forest version is false:
\(2K_2\sqcup K_1\to3K_2\) has leaf increment
\(\Delta U_2=-32\).  Consequently this route has two separate steps:

1. prove the strong margin for connected trees by leaf deletion;
2. prove a disjoint-union closure that transfers enough of that
   margin to arbitrary forests.

## Strong residual

Let \(P_q(F)\) be the denominator-free component payment and \(S_q\)
its mass.  For \(q\ge2\), define

\[
\boxed{U_q(F)=P_q(F)-2S_q(F)^2.}
\]

The tree candidate is:

> If \(\ell\) is a leaf of a tree \(T\), then
> \[
> \boxed{U_q(T)\ge U_q(T-\ell)}
> \]
> for every \(q\ge2\), with absent masses interpreted as zero.

The exact tree audits support the stronger recursive form.  If
\(\ell\) has support \(v\), put \(G=T-\{\ell,v\}\).  Then

\[
\boxed{
U_q(T)-U_q(T-\ell)
\ge P_{q-1}(G)-S_{q-1}(G)^2.
}
\tag{LR}
\]

The right side is the complete one-unit lower-rank reserve, not merely
zero.  This recursive strengthening is also false for disconnected
forests: the same \(2K_2\sqcup K_1\to3K_2\) example has mixed
remainder \(-32\).

Every nontrivial tree has a leaf, so the plain tree inequality alone
would prove

\[
P_q(T)\ge2S_q(T)^2\qquad(q\ge2),
\]

which is stronger than the needed connected-tree payment.  At
\(q=1\), the already proved sharp rank-three theorem gives
\(P_1\ge S_1^2\) for every forest.  What remains after the tree
proof is a component-convolution argument; leaf deletion cannot
supply that argument because its disconnected version is false.

## Edge-survival form

Write

\[
\begin{aligned}
S&=(q+1)i_{q+1},\\
B&=(q+1)(q+2)i_{q+2},\\
C&=(q+1)(q+2)(q+3)i_{q+3},\\
E_q&=\sum_{K\in\mathcal I_q(F)}e(F-N[K]).
\end{aligned}
\]

For \(q\ge2\),

\[
\boxed{
U_q=(q-2)S^2+B^2-CS+2SE_q
-3(q+1)SE_{q+1}-4E_q^2.
}
\tag{1}
\]

This is the proposed form for the leaf proof.

## Exact pendant recurrences

Let \(\ell\) be a leaf with support \(v\), and put

\[
H=F-\ell,\qquad G=F-\{\ell,v\},\qquad
R=H-N_H[v].
\]

Splitting independent sets according to whether they contain
\(\ell\) gives

\[
\boxed{i_k(F)=i_k(H)+i_{k-1}(G).}
\tag{2}
\]

For residual edges, a set not containing \(\ell\) gains the pendant
edge exactly when it avoids \(N_H[v]\), while a set containing
\(\ell\) leaves a residual set in \(G\).  Hence

\[
\boxed{
E_k(F)=E_k(H)+i_k(R)+E_{k-1}(G).
}
\tag{3}
\]

Equations (1)--(3) turn the leaf increment into an explicit quadratic
form in adjacent independence coefficients of \(H,G,R\) and the
edge-survival coefficients of \(H,G\).

If

\[
\begin{aligned}
s&=(q+1)i_q(G),\\
b&=(q+1)(q+2)i_{q+1}(G),\\
c&=(q+1)(q+2)(q+3)i_{q+2}(G),\\
e&=i_q(R)+E_{q-1}(G),\\
f&=i_{q+1}(R)+E_q(G),
\end{aligned}
\]

then \(S,B,C,E_q,E_{q+1}\) increase by \(s,b,c,e,f\),
respectively.  Therefore, for \(q\ge2\),

\[
\begin{aligned}
\Delta U_q={}&
(q-2)(2Ss+s^2)+2Bb+b^2-Cs-cS-cs\\
&+2Se+2sE_q+2se\\
&-3(q+1)(Sf+sE_{q+1}+sf)\\
&-8E_qe-4e^2.
\end{aligned}
\tag{4}
\]

The remaining proof obligation is to show that (4) is nonnegative
using the nested forest relation \(R\subseteq G\subseteq H\).

There is a sharper interpretation of the subtraction in (LR).
In the ordered-pair expansion of \(U_q(F)\), the pairs for which both
independent sets contain \(\ell\) contribute exactly

\[
P_{q-1}(G)-S_{q-1}(G)^2.
\]

After removing this entire lower-rank contribution, (LR) says that
the old--old residual shift and the two mixed old--new classes have
nonnegative total payment.  This mixed payment is the current
algebraic target.

For an isolated vertex, the corresponding recurrences are

\[
i_k(F)=i_k(H)+i_{k-1}(H),\qquad
E_k(F)=E_k(H)+E_{k-1}(H).
\]

## Factorial normalization and the exact mixed remainder

Put \(n=q+1\), and for every forest \(X\) define

\[
f_k(X)=k!\,i_k(X),\qquad
g_k(X)=(k-2)!\,b_k(X),
\]

where \(b_k(X)\) is the number of \(k\)-vertex subsets inducing
exactly one edge.  Equivalently,

\[
g_k(X)=\sum_{xy\in E(X)}
f_{k-2}(X-N[x]-N[y]).
\]

After multiplication by \((n-1)!^2=q!^2\), (1) becomes

\[
\widetilde U_n(X)=
(n-3)f_n^2+f_{n+1}^2-f_nf_{n+2}
+2f_ng_{n+1}-3f_ng_{n+2}-4g_{n+1}^2.
\tag{5}
\]

The pendant recurrences take the particularly clean form

\[
\begin{aligned}
f_k(F)&=f_k(H)+k f_{k-1}(G),\\
g_k(F)&=g_k(H)+(k-2)g_{k-1}(G)+f_{k-2}(R).
\end{aligned}
\tag{6}
\]

Write

\[
\begin{gathered}
F_0=f_n(H),\quad F_1=f_{n+1}(H),\quad
F_2=f_{n+2}(H),\\
G_1=g_{n+1}(H),\quad G_2=g_{n+2}(H),\\
a=f_{n-1}(G),\quad b=f_n(G),\quad c=f_{n+1}(G),\\
d=g_n(G),\quad e=g_{n+1}(G),\quad
r=f_{n-1}(R),\quad s=f_n(R).
\end{gathered}
\]

Let \(R_j=P_j-S_j^2\).  Direct expansion of (5)--(6) gives

\[
q!^2\bigl(U_q(F)-U_q(H)-R_{q-1}(G)\bigr)=M_n,
\tag{7}
\]

where

\[
\begin{aligned}
M_n={}&F_0(2an^2-6an-cn-2c+2dn-2d-3en+2r-3s)\\
&+2(n+1)bF_1-anF_2
+(2an-8dn+8d-8r)G_1-3anG_2\\
&+2a^2n^2-7a^2n+3a^2-4acn+ac\\
&+2adn-2ad-6aen+3ae+2anr-3ans\\
&+4nb^2-8dnr+8dr-4r^2.
\end{aligned}
\tag{8}
\]

Thus the connected-tree part of the arbitrary-rank DFP step is
reduced to \(M_n\ge0\) when \(H\) is connected.  The symbolic replay is
`verify_factorial_recursive_leaf_identity.py`, with certificate
`factorial_recursive_leaf_identity_certificate_20260729.json`.

## Nested leaf reduction

There is a second, stronger empirical reduction of (8).  For a
tree \(H\) rooted at \(v\), let \(H+v^*\) mean that a new leaf is
attached at \(v\), and define

\[
\mathcal M_q(H,v)=
U_q(H+v^*)-U_q(H)-R_{q-1}(H-v).
\]

The nested candidate is

\[
\boxed{
\mathcal M_q(H,v)\ge \mathcal M_q(H-w,v)
}
\tag{NLR}
\]

for \(q\ge2\) and every leaf \(w\ne v\).  Repeatedly pruning the
connected rooted tree \(H\) reduces it to the isolated root, where
\(\mathcal M_q=0\).  Thus (NLR) would prove the tree instance of
(LR).

Connectedness is necessary.  Cross-component pruning fails already for
\(H=2K_2\sqcup K_1\), rooted at the isolate: deleting an endpoint of
one \(K_2\) gives nested gap \(-52\) at \(q=2\); the mixed remainder
itself is \(-32\).  These are failures of over-strong disconnected
extensions, not failures of the connected-tree candidate.

This is not merely another restatement of (LR): after the complete
lower-rank reserve is subtracted, the pair class in which both newly
attached leaves occur cancels.  What remains is a two-leaf mixed
difference.  That cancellation is the reason no still-lower reserve
appears in (NLR), and it makes the nested inequality a more local
algebraic target.

The exact audit is
`scan_nested_leaf_mixed_monotonicity.py`.  It has so far found no
component-local failure through all rooted tree checks of order
\(12\), sampled same-component deletions in disconnected forests,
or the tested Galvin phase-separated trees.  Its report also replays
the cross-component negative control above.

## Evidence

`scan_denominator_free_leaf_monotonicity.py` checks the candidate with
exact integer arithmetic, independently verifies (2)--(3), audits all
leaves of every unlabeled tree through a requested order, samples
random trees, and checks Galvin trees up to order \(1641\).  It also
replays the disconnected negative control.  The replay is
`denominator_free_leaf_monotonicity_certificate_20260729.json`.

The candidate survives examples where:

- the rank-free floor \(P_q\ge qS_q^2\) fails;
- the bare conditional-mean variance bound fails;
- fixed residual-order and fixed-intersection subpayments can be
  negative.

That makes the connected-tree leaf increment (4), its nested form
(NLR), and the separate disjoint-union closure the current proof
targets.
