# A fugacity-three occupancy theorem for forests

Date: 2026-07-26

## Theorem

For every forest \(F\),

\[
\boxed{\qquad
\mu_F(3):=\frac{3I'(F;3)}{I(F;3)}
\ \geq\ \frac{2\alpha(F)}3 .
\qquad}
\tag{T}
\]

The inequality is strict for every nonempty forest.  Equivalently, if
\(X\) is a hard-core independent set of \(F\) at fugacity \(3\), then

\[
\mathbb E|X|\geq\frac{2\alpha(F)}3.
\]

This theorem sharpens the saddle bound used in the pendant-cascade
approach to Erdős Problem 993.  It does **not** by itself prove
unimodality of every forest independence sequence.

## 1. Rooted states

It is enough to prove (T) for a tree, since both \(\mu(3)\) and
\(\alpha\) add over components.

Root a tree \(T\).  At fugacity \(3\), let \(Z_0,Z_1\) be the partition
functions conditional on the root being excluded or included, and put

\[
u=\frac{Z_0}{Z_0+Z_1}.
\]

Let \(\mu,\mu_0\) be the unconditional mean size and the mean
conditional on root exclusion.  Let \(\alpha_0,\alpha_1\) be the largest
sizes conditional on root exclusion and inclusion, and put

\[
\alpha=\max(\alpha_0,\alpha_1),\qquad
s=\alpha-\alpha_0,
\]

\[
d=3\mu-2\alpha,\qquad
e=3\mu_0-2\alpha_0.
\]

For the rooted child trees, use subscripts \(i\), and set

\[
D=\sum_i d_i,\qquad E=\sum_i e_i,\qquad
t=\sum_i s_i,\qquad U=\prod_i u_i.
\]

The root recurrences give

\[
u=\frac1{1+3U},\qquad e=D,
\tag{1}
\]

and

\[
\alpha_1-\alpha_0=1-t.
\tag{2}
\]

Consequently \(s\in\{0,1\}\); \(s=1\) exactly when \(t=0\).  Directly
mixing the two root states gives

\[
d=uD+(1-u)E+1-3u
\qquad (t=0),
\tag{3}
\]

\[
d=uD+(1-u)(E+3-2t)
\qquad (t\geq1).
\tag{4}
\]

Also \(1/4\leq u<1\), because \(u=1/(1+3U)\) and \(0<U\leq1\).

## 2. The simultaneous induction

We prove the following three statements for every rooted tree:

\[
\begin{array}{ll}
\mathrm{(I)}&
s=1\ \Longrightarrow\ d\geq\frac14,\\[2mm]
\mathrm{(II)}&
s=0\ \Longrightarrow\ d\geq-\log u,\\[2mm]
\mathrm{(III)}&
s=0\ \Longrightarrow\
d+3ue\geq\frac94(1-u)+\frac1{28}.
\end{array}
\tag{5}
\]

The extra \(1/28\) in (III) is essential for the tensorization in the
proof of (I).  Equality in (III) is attained by a single edge rooted at
an endpoint.

We use strong induction on the order of the rooted tree, proving all
applicable statements together.  The one-vertex tree has

\[
u=\frac14,\quad s=1,\quad d=\frac14,\quad e=0,
\]

so the induction starts.

Two consequences of the induction hypotheses will be used repeatedly.
Every child deficit \(d_i\) is nonnegative, by (I) or (II), and hence

\[
e=\sum_i d_i\geq0.
\tag{6}
\]

If a child state has \(s=1\), all of its own children have \(s=0\).
Applying (II) to those grandchildren and using (1) gives

\[
e\geq
-\log\prod_j u_j
=\log\frac{3u}{1-u}
=:L(u).
\tag{7}
\]

The function \(z\mapsto L(e^z)\) is convex, because

\[
\frac{d^2}{dz^2}L(e^z)
=\frac{e^z}{(1-e^z)^2}>0.
\tag{8}
\]

## 3. Proof of (II)

Suppose \(s=0\), so \(t\geq1\).  Separate the \(t\) children with
\(s_i=1\) from the children with \(s_i=0\).  Write

\[
x^t=\prod_{s_i=1}u_i,\qquad
y=-\log\prod_{s_i=0}u_i.
\]

Thus \(x\in[1/4,1)\), \(y\geq0\), and

\[
u=\frac1{1+3x^te^{-y}}.
\tag{9}
\]

By (I), (II), (7), and the convexity (8),

\[
D\geq\frac t4+y,\qquad E\geq tL(x).
\tag{10}
\]

It is therefore enough, by (4), to prove

\[
\Phi(y):=
u\left(\frac t4+y\right)
+(1-u)\bigl(tL(x)+3-2t\bigr)
+\log u
\geq0.
\tag{11}
\]

Put \(A=t/4+y\) and \(C=tL(x)+3-2t\).  Since
\(u'=u(1-u)\),

\[
\Phi'(y)=1+u(1-u)(A-C).
\tag{12}
\]

At any interior stationary point,

\[
A-C=-\frac1{u(1-u)},
\]

and substitution in (11) gives

\[
\Phi(y)=A+\frac1u+\log u>0.
\tag{13}
\]

Moreover \(\Phi(y)\to+\infty\) as \(y\to+\infty\).  Hence it remains
only to check \(y=0\).  Multiplying \(\Phi(0)\) by
\(1+3x^t\), this is

\[
N_t(x):=
\frac t4
+3x^t\bigl(tL(x)+3-2t\bigr)
-(1+3x^t)\log(1+3x^t)
\geq0.
\tag{14}
\]

### The case \(t=1\)

Differentiation gives

\[
N_1'(x)=3\left[
\log\frac{3x}{(1-x)(1+3x)}
+\frac1{1-x}
\right].
\tag{15}
\]

The bracket is increasing on \([1/4,1)\), and at \(x=1/4\) it is
\(4/3-\log(7/4)>0\).  Thus \(N_1\) is increasing.  Finally,

\[
N_1(1/4)=1-\frac74\log\frac74>0.
\tag{16}
\]

For a rational verification of the last strict inequality, put
\(z=(7/4-1)/(7/4+1)=3/11\).  The atanh series gives

\[
\log\frac74
=2\sum_{j\geq0}\frac{z^{2j+1}}{2j+1}
\leq2\left(z+\frac{z^3}{3(1-z^2)}\right)
=\frac{345}{616}
<\frac47.
\tag{17}
\]

### The cases \(t\geq2\)

For \(x\geq1/4\) and \(z\geq0\),

\[
L(x)\geq\frac{2(4x-1)}{2x+1},
\qquad
(1+z)\log(1+z)\leq\frac{z(z+2)}2.
\tag{18}
\]

The first follows from
\(\log r\geq2(r-1)/(r+1)\) for \(r\geq1\); the second follows by
differentiating the difference of the two sides.  Substitution into
(14) yields

\[
N_t(x)\geq
P_t(x):=
\frac t4+6x^t
-\frac{12t x^t(1-x)}{2x+1}
-\frac92x^{2t}.
\tag{19}
\]

For \(2\leq t\leq6\), nonnegativity is a finite exact polynomial check.
After multiplication by \(4(2x+1)>0\), the minimum Bernstein
coefficients on the indicated intervals are

\[
\begin{array}{c|c|c}
t&\text{interval}&\text{minimum Bernstein coefficient}\\ \hline
2&[1/4,1/3]&8/27\\
2&[1/3,1]&8/45\\
3&[1/4,1]&4563/4480\\
4&[1/4,1]&9155/2688\\
5&[1/4,1]&8577/1408\\
6&[1/4,1]&324351/36608.
\end{array}
\tag{20}
\]

Every entry is positive.  The exact coefficients are generated and
checked by `verify_fugacity3_induction_lemmas.py`.

For \(t\geq7\), \(2x+1\geq3x\), and

\[
\frac{12x^t(1-x)}{2x+1}
\leq4x^{t-1}(1-x)
\leq\frac4t\left(1-\frac1t\right)^{t-1}
\leq\frac14.
\tag{21}
\]

For the last inequality, the first three binomial terms give

\[
\left(1+\frac1{t-1}\right)^{t-1}
\geq\frac{5t-6}{2(t-1)},
\]

and \(32(t-1)\leq t(5t-6)\) for \(t\geq7\).  Equations (19) and
(21) now give

\[
P_t(x)\geq6x^t-\frac92x^{2t}>0.
\tag{22}
\]

This proves (II).

## 4. Proof of the strengthened reserve (III)

Again suppose \(s=0\), and let the \(t\geq1\) children with \(s_i=1\)
have product \(U\); let the remaining children have product \(V\).
Using (4), \(e=D\), and \(1-u=3UVu\), define the reserve slack

\[
\begin{aligned}
S
&:=d+3ue-\frac94(1-u)\\
&=u\left[
4D+3UV\left(E+\frac34-2t\right)
\right].
\end{aligned}
\tag{23}
\]

By (I), (II), (6), and (7),

\[
D\geq\frac t4-\log V,\qquad
E\geq\sum_{s_i=1}L(u_i).
\tag{24}
\]

Put

\[
K=\sum_{s_i=1}L(u_i)+\frac34-2t.
\]

Then

\[
S\geq
\frac{t-4\log V+3UVK}{1+3UV}.
\tag{25}
\]

If \(K\geq0\), the last expression is at least \(t/4\), hence exceeds
\(1/28\).  If \(K<0\), its derivative with respect to \(V\), after
multiplication by the positive denominator squared, is

\[
-\frac4V+3U(K-4-t+4\log V)<0.
\tag{26}
\]

Thus the right side of (25) is minimized at \(V=1\).

Let \(x=U^{1/t}\).  Convexity (8) now reduces the claim
\(S\geq1/28\) to

\[
\frac{
t+3x^t\left(tL(x)+\frac34-2t\right)
}{1+3x^t}
\geq\frac1{28}.
\tag{27}
\]

Use the first inequality in (18).  For \(t=1\), after multiplication
by \(28(2x+1)\), (27) reduces to

\[
3(152x^2-74x+9)\geq0.
\tag{28}
\]

The roots of the quadratic are \(9/38\) and \(1/4\), so (28) holds for
\(x\geq1/4\).

For \(t\geq2\),

\[
\frac{12x^t(1-x)}{2x+1}
\leq\frac{12x^2(1-x)}{2x+1}
\leq\frac45.
\tag{29}
\]

The final inequality is equivalent to

\[
15x^3-15x^2+2x+1\geq0
\]

on \([1/4,1]\); an exact Bernstein certificate is included in the
verifier.  The numerator in (27), minus
\((1+3x^t)/28\), is consequently at least

\[
\frac t5-\frac1{28}+\frac{15}{7}x^t>0.
\tag{30}
\]

This proves (III).

## 5. Tensorization and proof of (I)

Set

\[
c=\frac94,\qquad \delta=\frac1{28}.
\]

We need one elementary binary lemma.  Suppose \(x,y\in[1/4,1]\), and
two states satisfy

\[
d_1\geq-\log x,\quad
d_1+3xe_1\geq c(1-x)+\delta,
\tag{31}
\]

\[
d_2\geq-\log y,\quad
d_2+3ye_2\geq c(1-y)+\delta.
\tag{32}
\]

Then their product state satisfies

\[
d_1+d_2+3xy(e_1+e_2)
\geq c(1-xy)+\delta.
\tag{33}
\]

Indeed, the left side of (33) can be written

\[
y(d_1+3xe_1)+(1-y)d_1
+x(d_2+3ye_2)+(1-x)d_2.
\]

After applying (31)--(32), subtracting the right side of (33), and
putting \(p=1-x\), \(q=1-y\), the remaining lower bound is

\[
q[-\log(1-p)]+p[-\log(1-q)]
-cpq+\delta(1-p-q).
\tag{34}
\]

Since \(-\log(1-r)\geq r+r^2/2\), (34) is at least

\[
pq\left(\frac{p+q}{2}-\frac14\right)
+\frac{1-p-q}{28}.
\tag{35}
\]

Write \(h=p+q\).  If \(h\leq1/2\), (35) is at least

\[
-\frac{h^2}{16}+\frac{1-h}{28}\geq0.
\]

If \(1/2\leq h\leq1\), both terms in (35) are nonnegative.  Finally,
if \(1\leq h\leq3/2\), the restrictions \(p,q\leq3/4\) imply
\(pq\geq(3/4)(h-3/4)\geq3/16\).  Hence (35) is at least

\[
\frac3{64}-\frac1{56}>0.
\]

This proves the binary lemma.  It iterates because the new product
state also satisfies

\[
d_1+d_2\geq-\log(xy).
\]

Now suppose the root state has \(s=1\).  Every child has \(s_i=0\).
Apply (II), (III), and the binary lemma to all children.  With
\(U=\prod_i u_i\), we obtain

\[
D+3UE\geq\frac94(1-U).
\tag{36}
\]

For a leaf, (36) is immediate with the empty product \(U=1\).  From
(3),

\[
d-\frac14
=\frac{D+3UE-\frac94(1-U)}{1+3U}
\geq0.
\tag{37}
\]

This proves (I), and closes the simultaneous induction.

## 6. Conclusion and reproducibility

For every rooted tree, either \(s=1\) and (I) gives \(d\geq1/4\), or
\(s=0\) and (II) gives \(d\geq-\log u>0\).  Therefore

\[
3\mu_T(3)-2\alpha(T)=d>0
\]

for every nonempty tree.  Additivity over components proves (T) for
every forest.

The finite algebraic portions of the proof are independently
reproducible with

```powershell
python .\verify_fugacity3_induction_lemmas.py `
  --output fugacity3_induction_lemma_certificates_20260726.json
```

The verifier uses only exact integer and rational arithmetic.  The
separate exhaustive tree check
`verify_fugacity3_tree_bound.py` confirms the theorem for all 81,137
unlabeled trees through order 17, but that enumeration is not used in
the proof.

SHA-256 digests are recorded outside this file in
`FUGACITY3_PROOF_MANIFEST_2026-07-26.md`, avoiding a self-referential
proof digest.

## 7. Literature check

A targeted check through 2026-07-26 found no prior statement of (T).
In particular, Zhang--Xu, *On expectations and variances in the
hard-core model*, arXiv:2604.01717v2, proves tight general occupancy
bounds for fixed order and independence number, but its lower extremal
theorem applies only for
\(\lambda<2/(n-2)\); it does not imply the forest lower bound at
\(\lambda=3\).  The current Erdős Problem 993 discussion and the 2026
tree-unimodality papers still list the full unimodality conjecture as
open.

This is a preliminary priority check, not a claim that a database search
can certify novelty.  Before external circulation, the statement and
proof should be checked by a graph-polynomial or hard-core-model expert.
