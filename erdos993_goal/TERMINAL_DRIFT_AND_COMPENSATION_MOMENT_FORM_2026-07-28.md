# Terminal drift and compensation in residual-forest moments

Date: 2026-07-28

Status: all identities in this note are proved.  The two boxed moment
inequalities remain conjectural.  This is not yet a solution of Erdős
Problem 993.

## 1. The terminal extension mixture

Use the terminal pair

\[
T=G-\ell,\qquad F=G-\{\ell,p\},
\]

and put \(r=k-1\).  In \(F\), the neighbours that the reinserted support
vertex \(p\) will have form an independent set \(N_p\): one possible
inward neighbour and the other terminal leaves, which are isolated in
\(F\).  Put

\[
C=F-N_p.
\]

Then

\[
I(T;x)=I(F;x)+xI(C;x).
\]

Choose \(S\) uniformly from the independent \((r-1)\)-sets of \(F\).
Let

\[
e=e_F(S),\qquad q=|E(F[V(F)\setminus N[S]])|.
\]

Thus \(e\) is the number of one-vertex extensions and \(q\) is the
number of forbidden pairs among them.  Also define

\[
X=\mathbf 1_{\{S\cap N_p=\varnothing\}},
\]

and, when \(X=1\), let

\[
L=|N_p\cap(V(F)\setminus N[S])|
\]

be the number of currently addable neighbours of \(p\).  The number of
extensions of \(S\) inside \(C\) is then \(e-L\).

Write

\[
u=\mathbb E e,\qquad
\pi=\mathbb E X,\qquad
Z=\mathbb E\{X(e-L)\},
\]

and

\[
W_2=\mathbb E\{e(e-1)-2q\}.
\]

The standard extension double counts give

\[
u=r\frac{b}{b^-},\qquad
\pi=\frac{c_{r-1}}{b^-},
\]

\[
Z=r\frac{c_r}{b^-},\qquad
W_2=r(r+1)\frac{b^+}{b^-}.
\]

Since

\[
a=b+c_{r-1},\qquad a^+=b^++c_r,
\]

the terminal extension mean is exactly

\[
\boxed{\qquad
v=\frac{W_2+(r+1)Z}{u+r\pi}.
\qquad}
\tag{1}
\]

## 2. Exact moment form of the one-step drift

Condition

\[
v\le u+1
\]

is, by (1), exactly

\[
\boxed{
(u+1)(u+r\pi)
\ge
\mathbb E\{e(e-1)-2q\}
+(r+1)\mathbb E\{X(e-L)\}.
}
\tag{TD}
\]

Equivalently, using
\(\mathbb E e^2=u^2+\operatorname{Var}(e)\),

\[
\boxed{
2u+2\mathbb E q-\operatorname{Var}(e)
+r\pi(u+1)
-(r+1)\mathbb E\{X(e-L)\}
\ge0.
}
\tag{2}
\]

For a residual forest let \(c\) be its number of nonempty components.
Then \(q=e-c\), and (2) becomes

\[
\boxed{
4u-2\mathbb E c-\operatorname{Var}(e)
+r\pi(u+1)
-(r+1)\mathbb E\{X(e-L)\}
\ge0.
}
\tag{3}
\]

This is the precise forest Poincaré inequality behind the drift
condition.  The last term is the extension reserve of the root-deleted
class; the preceding \(r\pi(u+1)\) term is its mixture payment.

The statement is not true for arbitrary graphs.  The exact
\(K_{2,10}\) failure in Section 8 of
`THREE_COMPARISON_C12_REDUCTION_2026-07-28.md` shows that a proof of
(TD) must use the fact that every residual graph is a forest.

## 3. Exact moment form of compensated linear curvature

For a polynomial \(P\), at rank \(j\), choose a uniform independent
\((j-1)\)-set and let \(\mu,\bar q,V\) be its mean extension count,
mean residual-edge count, and extension-count variance.  Then

\[
\sigma_j(P)
=2+\frac{2\bar q-V}{\mu}.
\tag{4}
\]

Apply this to \(T\) at rank \(k\) and to \(F\) at rank \(r\).  Denote
the corresponding residual moments by

\[
(v,\bar q_T,V_T),\qquad
(u,\bar q_F,V_F).
\]

With

\[
H=2k\sigma_k(T)-r\sigma_r(F),
\]

direct substitution into (4) gives

\[
\boxed{
vH
=(2r+4)v
+4k\bar q_T-2kV_T
-2r\frac vu\bar q_F
+r\frac vuV_F.
}
\tag{5}
\]

Writing \(\bar q_T=v-\bar c_T\) and
\(\bar q_F=u-\bar c_F\) for residual-component means gives the cleaner
forest form

\[
\boxed{
vH
=4(r+2)v
-4k\bar c_T-2kV_T
+r\frac vu(2\bar c_F+V_F).
}
\tag{6}
\]

Consequently the remaining compensated inequality

\[
vH\ge2kr(w-v)_+
\]

is exactly

\[
\boxed{
4(r+2)v
-4k\bar c_T-2kV_T
+r\frac vu(2\bar c_F+V_F)
\ge2kr(w-v)_+.
}
\tag{CL-moment}
\]

Equations (3) and (CL-moment) are now the two residual-forest proof
obligations.  They use the same two statistics—extension variance and
the number of residual components—so a single coupled switching or
Poincaré lemma may prove both.

## 4. Verification

`verify_terminal_drift_compensation_moment_form.py` replays (1)--(6)
symbolically and checks their coefficient forms.
