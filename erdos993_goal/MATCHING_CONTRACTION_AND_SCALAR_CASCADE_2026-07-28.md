# Maximum-matching contraction and the scalar pendant cascade

Date: 2026-07-28

Status: the representation theorem and scalar cascade identity below
are proved.  The final scalar inequality remains conjectural.  This is
an all-rank reduction, not yet a solution of Erdős Problem 993.

## 1. A forest is a tree CSP on \(\alpha\) units

Let \(G\) be a forest of order \(n\), independence number \(\alpha\),
and \(c\) connected components.  Since \(G\) is bipartite, König's
theorem gives

\[
\nu(G)=n-\alpha,
\]

where \(\nu(G)\) is its matching number.  Fix a maximum matching \(M\).
The spanning graph consisting only of the edges in \(M\) has

- \(n-\alpha\) two-vertex components;
- \(2\alpha-n\) isolated vertices.

It therefore has exactly

\[
(n-\alpha)+(2\alpha-n)=\alpha
\]

components.  Call these components *units*.

Contract every matched edge.  The nonmatching edges of \(G\) become a
forest \(K\) on the \(\alpha\) units, with

\[
|E(K)|=|E(G)|-|M|=(n-c)-(n-\alpha)=\alpha-c.
\]

In particular, if \(G\) is a tree, then \(K\) is a tree on
\(\alpha\) vertices.

An independent set of \(G\) occupies at most one vertex in each unit.
An isolated unit has one occupied color; a matched unit has two
occupied colors.  Each edge of \(K\) forbids exactly one ordered pair
of occupied colors at its endpoints.  Conversely, every compatible
partial colored occupation of the units is an independent set of
\(G\).

Finally, a maximum independent set of \(G\) has size \(\alpha\), so
this unit constraint system has at least one compatible assignment
occupying every unit.

Thus the original conjecture is equivalently a statement about the
weight enumerators of acyclic constraint systems with:

- \(\alpha\) variables;
- one or two occupied colors per variable;
- at most one forbidden occupied-color pair per constraint edge;
- a compatible fully occupied assignment.

This normalization is useful because the known decreasing-tail cutoff
depends on the same parameter \(\alpha\), not on the original order
\(n\).

## 2. Building from the matching baseline

Before the nonmatching edges are restored, the independence polynomial
is

\[
P_0(x)=(1+2x)^{n-\alpha}(1+x)^{2\alpha-n}.
\tag{1}
\]

It is real-rooted.  More concretely, every independent set occupying
\(j\) units has at least one extension in every unoccupied unit.
Together with the standard ultra-log-concavity of the product in (1),
this gives a factorial extension-mean drop of at least one:

\[
r_k(P_0)-r_{k+1}(P_0)\ge1,
\qquad
r_k(P)=k\frac{[x^k]P}{[x^{k-1}]P}.
\tag{2}
\]

Hence the three-halves reserve

\[
Q_k(P)
=2k p_k^2-p_{k-1}p_k-2(k+1)p_{k-1}p_{k+1}
\]

is nonnegative at every internal rank of \(P_0\), with reserve to
spare.

The remaining \(\alpha-c\) edges can be added in any order.  Every one
connects two current components because \(K\) is a forest.  Moreover,
the fixed maximum independent set of the final forest remains
independent at every intermediate stage, so the independence number
stays exactly \(\alpha\).

If a bridge \(uv\) is added between components, then

\[
I(G+uv;x)
=I(G;x)-x^2 I(G-N[u]-N[v];x).
\tag{3}
\]

This gives an alternative all-rank target:

> **Bridge preservation.** Adding an \(\alpha\)-preserving bridge to a
> forest preserves \(Q_k\ge0\) for every
> \(3\le k<\lfloor(2\alpha+1)/3\rfloor\).

Bridge preservation would prove the prefix three-halves statement for
every forest by starting from (1), and hence would prove unimodality
using the known decreasing tail.

The stronger assertion that \(Q_k\) is nondecreasing under a bridge is
false.  Exhaustive testing first finds a negative increment at order
eight.  The sign-preservation statement itself survives every tested
case, but remains conjectural.

## 3. Exact scalar form of the pendant cascade

The pendant-pair induction gives a more local target.  Let \(\ell p\)
be a pendant edge of a forest \(G\), and put

\[
T=G-\ell,\qquad F=G-\{\ell,p\}.
\]

Fix \(k\ge5\), put \(r=k-1\), and abbreviate

\[
\begin{aligned}
a&=i_r(T),&a^+&=i_{r+1}(T),&a^{++}&=i_{r+2}(T),\\
b^-&=i_{r-1}(F),&b&=i_r(F),&b^+&=i_{r+1}(F).
\end{aligned}
\]

Define the extension means

\[
u=(k-1)\frac b{b^-},\qquad
w=k\frac{b^+}{b},
\]

\[
v=k\frac{a^+}{a},\qquad
y=(k+1)\frac{a^{++}}{a^+},
\]

and put

\[
s=\frac ba,\qquad
d=v+s-u,\qquad
\theta=\frac{b^-}{a+b^-}.
\tag{4}
\]

Here \(d\) is exactly the difference between the two conditional
residual-extension means in the leaf-absent/leaf-present mixture.
Also define the two three-halves curvature slacks

\[
\delta_T=v-y-\frac12,\qquad
\delta_F=u-w-\frac12.
\tag{5}
\]

The mixing weight has the useful equivalent form

\[
\theta
=\frac{(k-1)s}{u+(k-1)s}.
\tag{6}
\]

Direct expansion of the cleared Q-Cascade margin gives the exact
identity

\[
\boxed{
\begin{aligned}
&k b^-Q_k(I(G))
-(k-1)(a+b^-)Q_{k-1}(I(F))\\
&\quad=
2ab^-(a+b^-)
\left[
v\delta_T
+s\left(2d-s+\frac12+2\delta_F\right)
-\theta d^2
\right].
\end{aligned}}
\tag{7}
\]

Consequently Q-Cascade is equivalent to the single scalar inequality

\[
\boxed{
v\delta_T
+s\left(2d-s+\frac12+2\delta_F\right)
\ge\theta d^2.
}
\tag{SC}
\]

This is the compact form of the rooted Poincaré problem.

### Cross-ratio form

Completing the square in \(d\), and using

\[
\frac{s}{\theta}
=s+\frac{u}{k-1},
\qquad
d-\frac{s}{\theta}
=v-\frac{k}{k-1}u,
\]

turns (SC) into the equivalent inequality

\[
\boxed{
v\delta_T+2s\delta_F+\frac{su}{k-1}+\frac{s}{2}
\ge
\theta\left(v-\frac{k}{k-1}u\right)^2.
}
\tag{CR}
\]

The square is a single adjacent cross-ratio determinant:

\[
v-\frac{k}{k-1}u
=
k\left(
\frac{i_k(T)}{i_{k-1}(T)}
-
\frac{i_{k-1}(F)}{i_{k-2}(F)}
\right).
\tag{8}
\]

Thus the live problem can also be stated as a quantitative
cross-synchronization theorem: the two forward curvature slacks and
the explicit incidence payment on the left of (CR) must control the
square of the deletion-ratio displacement on the right.  This form
removes \(d\) entirely and is the natural one for an incidence-graph
Cauchy--Schwarz argument.

### Rank-uniform interpolation and the ordinary cascade

For a real parameter \(c\), define

\[
\mathcal P_{c,k}(P)
=
kp_k^2-(k+1)p_{k-1}p_{k+1}
-c\,p_{k-1}p_k.
\tag{9}
\]

Then

\[
\mathcal P_{c,k}(P)\ge0
\quad\Longleftrightarrow\quad
k\frac{p_k}{p_{k-1}}
-(k+1)\frac{p_{k+1}}{p_k}
\ge c.
\]

The three-halves reserve is \(Q_k=2\mathcal P_{1/2,k}\).
The ordinary GSB reserve is

\[
G_k=\mathcal P_{-1,k}
=kp_k^2+p_{k-1}p_k-(k+1)p_{k-1}p_{k+1}.
\]

The same symbolic calculation works for every \(c\).  If

\[
\delta_T^{(c)}=v-y-c,\qquad
\delta_F^{(c)}=u-w-c,
\]

then

\[
\begin{aligned}
&k b^-\mathcal P_{c,k}(I(G))
-(k-1)(a+b^-)\mathcal P_{c,k-1}(I(F))\\
&\quad=
ab^-(a+b^-)
\left[
v\delta_T^{(c)}
+2s\delta_F^{(c)}
+\frac{su}{k-1}
+cs
-\theta\left(v-\frac{k}{k-1}u\right)^2
\right].
\end{aligned}
\tag{10}
\]

In particular, the unresolved ordinary pendant GSB cascade is
equivalent to the especially simple inequality

\[
\boxed{
v(v-y+1)
+2s(u-w+1)
+\frac{su}{k-1}
-s
\ge
\theta\left(v-\frac{k}{k-1}u\right)^2.
}
\tag{PGC-CR}
\]

Unlike the \(c=1/2\) route, proving (PGC-CR) directly needs no
same-rank cutoff reserve: the already-verified rank-shifting pendant
cascade induction then descends all the way to rank one and proves
unimodality.  Thus (PGC-CR) is now the primary all-rank target, while
(CR) remains the stronger quantitative target that contains the
proved ranks \(3\) through \(6\).

## 4. Probabilistic meaning

Choose a uniform independent \(r\)-set of \(T\).  Let \(e_T\) be its
number of residual extension vertices, and let

\[
J=\mathbf 1_{\{p\notin S\}},\qquad
I=\mathbf 1_{\{p\notin N_T[S]\}}.
\]

Then

\[
s=\mathbb EJ,\qquad v=\mathbb Ee_T.
\]

Conditional on the leaf being absent in \(G\), the residual extension
mean is \(v+s\).  Conditional on the leaf being present, it is \(u\).
Thus their difference is \(d\).

The exact three-halves variance slack in \(T\) is

\[
2\mathbb E q_T+\frac12\mathbb E e_T-\operatorname{Var}(e_T)
=v\delta_T.
\]

The corresponding lower-rank slack in \(F\) is \(u\delta_F\); after the
pendant mixture is normalized, its contribution in (SC) is
\(2s\delta_F\).  The remaining linear term is the marked-root payment,
and \(\theta d^2\) is exactly the between-class variance.

Thus (SC) says:

> the two same-rank curvature slacks plus the marked-root payment
> dominate the variance created by mixing the leaf-present and
> leaf-absent classes.

## 5. What remains

Induction supplies

\[
\delta_T\ge0,\qquad\delta_F\ge0
\]

at already-established prefix ranks.  They cannot simply be discarded:
actual prefix examples have \(d<0\) and
\(2d-s+1/2<0\), while (SC) remains positive because the two curvature
slacks compensate.

The next proof target is therefore a rooted inequality controlling the
single mean displacement \(d\) by \(\delta_T,\delta_F\) and the
conductance-like factor

\[
\theta=\frac{(k-1)s}{u+(k-1)s}.
\]

This is strictly smaller than the earlier five-coefficient
one-third-payment expression and is the form to use for either a
block-Poincaré proof or a bridge-preservation proof.

The symbolic identities and the matching-contraction construction are
replayed by
`verify_matching_contraction_scalar_cascade.py`.
