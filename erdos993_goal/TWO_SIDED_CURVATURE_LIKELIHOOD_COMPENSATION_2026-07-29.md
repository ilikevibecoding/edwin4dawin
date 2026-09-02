# Two-Sided Curvature--Likelihood Compensation

## Status

The scalar implications in this note are proved.  The first removes
the false cross-ratio sign condition (C) on the rising branch by
charging curvature for likelihood defects in both directions.  The
all-branch version in Section 5 additionally charges the local
log-concavity defect of \(F\); it removes the need for the now-refuted
downward sign-preservation shortcut.

The resulting three-defect graph inequality is not yet proved for
every required-prefix terminal forest pair.  It is the current single
live replacement for the refuted U/C/DP package in the ranks needed
by the order-sensitive conditional solution theorem.

Section 7 sharpens the scope further.  C12 is not needed when both
lower sequences are already nonincreasing, because their shifted sum
is then nonincreasing directly.  Consequently the negative-cross NCL
branch is required only when \(T\) is still strictly rising,
\(v>k\).  This removes every ordinary finite tail instance that made
NCL appear artificially close to equality.

## 1. Terminal scalar notation

Use the notation of
`THREE_COMPARISON_C12_REDUCTION_2026-07-28.md`.  Thus

\[
r=k-1,\qquad
x=\frac ur,\qquad
z=kx-v,
\]

\[
w=rx-q_F+1,\qquad
M=x+q_F-1,
\]

so that

\[
w-v=z-M.
\]

Put

\[
H=2kq_T-rq_F,
\]

and define the two one-sided likelihood defects

\[
\varepsilon=(w-v)_+=(z-M)_+,
\qquad
\zeta=(v-kx)_+=(-z)_+.
\tag{1}
\]

The exact C12 regrouping is

\[
\boxed{
\frac Jk
=s\{(r+4)q_F+2(x-1)\}
+\frac vkH
-2\theta z^2,
}
\tag{2}
\]

where

\[
\theta=\frac{s}{x+s}\in(0,1).
\]

## 2. Two-sided compensation lemma

> **Lemma.**  Let \(r\ge6\), \(0\le q_F\le4\), and suppose
> \(u\ge r\), equivalently \(x\ge1\).  If
> \[
> \boxed{
> vH\ge
> 2k\{r\varepsilon+\zeta^2\},
> }
> \tag{BCL}
> \]
> then \(J\ge0\), and hence C12 holds.

### Proof when \(z\ge0\)

In this branch \(\zeta=0\), so (BCL) becomes

\[
vH\ge2kr\varepsilon.
\]

This is exactly condition (CL) from the proved compensated-linear
scalar lemma.  That lemma gives \(J\ge0\).

### Proof when \(z<0\)

Now \(\zeta=-z\).  Since \(x\ge1\) and \(q_F\ge0\),

\[
M=x+q_F-1\ge0.
\]

Therefore \(z-M<0\), and hence

\[
\varepsilon=0.
\]

Also

\[
(r+4)q_F+2(x-1)\ge0.
\tag{3}
\]

Condition (BCL) becomes

\[
vH\ge2kz^2.
\]

Substitute this and (3) into (2):

\[
\frac Jk
\ge
2z^2-2\theta z^2
=2(1-\theta)z^2
\ge0.
\]

This proves the second branch and the lemma.

## 3. Coefficient form

Write

\[
\begin{array}{lll}
b^-=i_{r-1}(F),&b=i_r(F),&b^+=i_{r+1}(F),\\
&a=i_r(T),&a^+=i_{r+1}(T).
\end{array}
\]

Let

\[
D=(ab^+-ba^+)_+,
\qquad
U=(b^-a^+-ab)_+.
\tag{4}
\]

Then

\[
\varepsilon=\frac{kD}{ab},
\qquad
\zeta=\frac{kU}{ab^-}.
\tag{5}
\]

With

\[
q_T=\frac{G_k(T)}{aa^+},
\qquad
q_F=\frac{G_r(F)}{b^-b},
\]

clearing the positive factor

\[
\frac{a^2(b^-)^2b}{k}
\]

turns (BCL) into

\[
\boxed{
\begin{aligned}
&2k(b^-)^2b\,G_k(T)
-r aa^+b^-G_r(F)\\
&\qquad\ge
2kr\,a(b^-)^2D
+2k^2b\,U^2.
\end{aligned}
}
\tag{6}
\]

The first defect \(D\) is the lower-likelihood reversal already paid
by CL.  The second defect \(U\) is the newly discovered
cross-ratio reversal, and it enters quadratically because the exact
C12 scalar contains \(z^2\).

## 4. Boundary evidence

The exact \(m=53\) star-fork certificate has

\[
U>0,\qquad D=0.
\]

Thus the former cross-ratio assumption fails, but the new square term
is the only additional payment required.  The certified (BCL) margin
is enormous because both \(H\) and the binomial bulk curvature are of
order \(N\).

The verifier
`verify_two_sided_compensation_scalar.py` checks the algebraic
coefficient conversion (4)--(6).  The scalar implication itself is
the two-branch proof above.

## 5. All-branch three-defect compensation

The weaker sign-preservation statement

\[
u<r\Longrightarrow v<k
\tag{DP}
\]

is also false for a finite tree.  In the exact star-fork family with

\[
m=60,\qquad
t=\left\lfloor\frac{37}{20}2^{60}\right\rfloor,
\qquad
r=63\,987\,143\,505\,680\,007\,104,
\]

rational interval arithmetic certifies

\[
r-u=0.08740166229429109\ldots>0,
\]

but

\[
k-v=-0.005668191734878836\ldots<0.
\]

Thus \(F\) has begun decreasing while \(T\) is still increasing.  The
full C12 margin for the corresponding outer tree is nevertheless
positive.

There is a direct replacement.  Define

\[
\delta=(-M)_+=(1-x-q_F)_+.
\tag{7}
\]

Then the following removes every sign assumption on \(x\).

> **All-branch compensation lemma.**  Let \(r\ge6\),
> \(0\le q_F\le4\), \(0<s\le1\), and
> \(\theta=s/(x+s)\).  If
> \[
> \boxed{
> vH\ge
> 2k\{r\varepsilon+\zeta^2+s\delta\},
> }
> \tag{GBCL}
> \]
> then \(J\ge0\), and hence C12 holds.

### Proof when \(M\ge0\)

Here \(\delta=0\).  If \(z\ge0\), (GBCL) contains (CL), and the proved
compensated-linear scalar lemma gives \(J\ge0\).  If \(z<0\), then
\(\varepsilon=0\), \(\zeta^2=z^2\), and

\[
q_F\ge1-x.
\]

Consequently

\[
(r+4)q_F+2(x-1)
\ge(r+2)(1-x)
\ge0
\]

when \(x<1\), while the same expression is plainly nonnegative when
\(x\ge1\).  Equation (2) and (GBCL) now give

\[
\frac Jk\ge2(1-\theta)z^2\ge0.
\]

### Proof when \(M<0\)

In this case \(x<1\), \(\delta=-M=1-x-q_F\), and the exact base
identity is

\[
(r+4)q_F+2(x-1)+2\delta=(r+2)q_F\ge0.
\tag{8}
\]

Using (GBCL) in (2) therefore gives

\[
\frac Jk
\ge
s(r+2)q_F
+2r\varepsilon
+2\zeta^2
-2\theta z^2.
\tag{9}
\]

If \(z<0\), then \(\zeta^2=z^2\), so every term in (9) is
nonnegative.

If \(z\ge0\), then

\[
\varepsilon=z-M=z+\delta\ge z.
\]

Also \(v\ge0\) gives \(z\le kx\).  Since \(s\le1\),

\[
\theta=\frac{s}{x+s}\le\frac1{x+1}.
\]

As \(r\ge1\) and \(x<1\),

\[
\theta z
\le\frac{kx}{x+1}
\le r.
\]

Hence \(r\varepsilon\ge rz\ge\theta z^2\), and (9) is again
nonnegative.  This proves the lemma.

### Coefficient form

In addition to \(D,U\) from (4), put

\[
L=(b^-b^+-b^2)_+.
\tag{10}
\]

Since

\[
\delta=\frac{kL}{b^-b},
\]

the same clearing factor used in Section 3 turns (GBCL) into

\[
\boxed{
\begin{aligned}
&2k(b^-)^2b\,G_k(T)
-r aa^+b^-G_r(F)\\
&\quad\ge
2kr\,a(b^-)^2D
+2k^2b\,U^2
+2k\,a b^-b\,L.
\end{aligned}
}
\tag{11}
\]

Thus the entire conditional solution program now has one
graph-theoretic obligation: prove (11) for every required-prefix
terminal forest pair.  The three right-hand terms charge, respectively, the
lower likelihood reversal, upper cross-ratio reversal, and local
log-concavity reversal.

The prefix restriction is essential.  Exact small-tree and
PatternBoost examples violate (11) deep in the decreasing tail, beyond
the Fisher--Ryan--Zykov cutoff.  These are not counterexamples to the
conditional program because C12 is not required there.

`verify_two_sided_compensation_scalar.py` symbolically verifies the
conversion to (11).  The exact failure of (DP), together with positive
C12 and (GBCL) margins, is certified by
`verify_star_fork_downward_counterexample_interval.py`.

## 6. Sharper branchwise replacement

Condition (GBCL) deliberately overpays in order to have one formula.
The exact scalar requires less and admits the following sharper
two-branch package.

If \(z\ge0\), retain the compensated-linear condition

\[
\boxed{vH\ge2kr\varepsilon.}
\tag{CL+}
\]

This is precisely the proved compensated-linear scalar lemma.

If \(z<0\), put \(\zeta=-z\) and require only

\[
\boxed{
vH+ks(r+2)q_F
\ge2k\{s\delta+\theta\zeta^2\}.
}
\tag{NCL}
\]

To prove sufficiency, observe that for every sign of \(M\),

\[
(r+4)q_F+2(x-1)
\ge(r+2)q_F-2\delta.
\tag{12}
\]

Indeed, the difference between the two sides before the
\(-2\delta\) correction is \(2M\).  It is nonnegative when \(M\ge0\)
and equals \(-2\delta\) when \(M<0\).  Since \(z<0\) gives
\(z^2=\zeta^2\), substituting (12) and (NCL) into (2) proves
\(J\ge0\).

The coefficient form is also exact.  On the \(z\ge0\) branch, (CL+)
is

\[
2k b^-b\,G_k(T)-r aa^+G_r(F)
\ge2kr\,a b^-D.
\tag{13}
\]

On the \(z<0\) branch, equivalently \(U>0\), (NCL) becomes

\[
\boxed{
\begin{aligned}
(a+b^-)\{&
2k(b^-)^2b\,G_k(T)
-r aa^+b^-G_r(F)\\
&+a b^-b(r+2)G_r(F)
-2k a b^-bL\}\\
&\ge2k^2b^-b\,U^2.
\end{aligned}
}
\tag{14}
\]

The symbolic verifier checks (13)--(14).  This branchwise package is
strictly weaker than (11): it does not charge the lower defect on the
negative-cross branch, discounts the square by the exact mixture
weight \(\theta\), and credits the positive \(q_F\) part of the scalar
base.  It is therefore the preferred final proof target, while (11)
remains a simpler sufficient inequality for experimentation.

## 7. Direct-descent bypass and the genuinely live NCL branch

There is a third branch that should be removed before asking for
either compensation inequality.  Recall

\[
g_{k-1}=a+b^-,
\qquad
g_k=a^++b.
\]

If

\[
b\le b^-
\qquad\hbox{and}\qquad
a^+\le a,
\tag{15}
\]

then \(g_k\le g_{k-1}\) directly.  Moreover the inductive C12
argument has already established the GSB reserve for the smaller
forests \(F\) and \(T\).  For example,

\[
q_F=1+u-w\ge0,\qquad u\le r
\]

implies \(w\le r+1\), hence \(b^+\le b\); the same implication
iterates at subsequent prefix ranks, and the known
Fisher--Ryan--Zykov tail takes over afterward.  The identical argument
applies to \(T\).  Thus both summands in

\[
i_j(G)=i_j(T)+i_{j-1}(F)
\]

remain nonincreasing, so \(G\) can never rise later.  No C12
inequality is needed in branch (15).

This has a particularly clean consequence when \(z<0\).  Since

\[
z<0\quad\Longleftrightarrow\quad v>kx,
\]

if \(v\le k\), then \(x<1\), so \(b<b^-\), while \(v\le k\) gives
\(a^+\le a\).  This is exactly the direct-descent branch.  Therefore

\[
\boxed{\quad
z<0\ \hbox{and C12 is still live}
\quad\Longleftrightarrow\quad
v>k.
\quad}
\tag{16}
\]

The negative-cross proof obligation is consequently NCL only under
the additional, strong hypothesis that \(T\) is still rising.

This refinement explains the finite data.  In an all-rank audit of
every terminal pair of every tree through order \(16\), there are
246,209 coefficient checks.  Only 1,279 survive the direct-descent
test, all on the \(z\ge0\) branch, and every one passes CL+.  In an
all-rank audit of 5,000 PatternBoost trees, 179,999 of 360,000 checks
remain live; all pass CL+, while all 2,001 negative-cross checks are
already direct descents.  The same happens in 911 negative-cross
checks from the graph atlas and 50,000 random nonforest graphs.

The live NCL branch is nevertheless nonempty.  The rigorous
\(m=60\) star-fork certificate has

\[
u<r,\qquad v>k,\qquad z<0,
\]

and positive NCL margin.  It is precisely a finite example where
\(F\) has begun falling but \(T\) is still rising.  Thus (16) removes
irrelevant tail near-equalities without reinstating the false
downward sign-preservation claim.
