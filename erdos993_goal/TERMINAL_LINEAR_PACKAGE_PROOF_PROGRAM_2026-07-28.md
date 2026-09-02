# Terminal linear package: structural proof program

Date: 2026-07-28

Status: the reductions and equivalences in this note are proved.
The proposed drift hypothesis (U-m), and equivalently the relevant
cross-ratio shortcut, is false for a finite star-fork tree while both
lower sequences are rising.  See
`PIRD_AND_TERMINAL_BURDEN_COUNTEREXAMPLE_2026-07-29.md`.
The compensated-linear inequality and full C12 remain positive there,
so the complete curvature compensation—not this two-obligation
package—is the surviving target.  This is not yet a solution of
Erdős Problem 993.

The weaker implication \(u<r\Rightarrow v<k\) is also false for a
finite tree; see
`TERMINAL_DOWNWARD_SIGN_COUNTEREXAMPLE_2026-07-29.md`.  The current
replacement is the all-branch, then sharper branchwise, compensation
package in
`TWO_SIDED_CURVATURE_LIKELIHOOD_COMPENSATION_2026-07-29.md`.

## 1. Terminal normal form

Let \(p\) be a terminal support of a forest \(G\), let \(\ell\) be one
of its leaf neighbours, and put

\[
T=G-\ell,\qquad F=G-\{\ell,p\}.
\]

If \(p\) has \(d+1\) leaf neighbours and one possible nonleaf neighbour
\(q\), write \(R\) for the component left after deleting \(p\) and all
its leaf neighbours.  Then

\[
I(F;x)=(1+x)^d I(R;x)
\]

and

\[
I(T;x)=I(F;x)+xI(R-q;x).
\tag{1}
\]

Thus, with

\[
B=I(F;x)=\sum_jb_jx^j,\qquad
C=I(R-q;x)=\sum_jc_jx^j,
\]

we have

\[
A:=I(T;x)=B+xC,\qquad a_j=b_j+c_{j-1}.
\tag{2}
\]

When \(d=0\), root \(R\) at \(q\) and write its ordinary rooted
decomposition as

\[
E=I(R-q;x),\qquad J=I(R-N[q];x).
\]

Then

\[
B=E+xJ,\qquad A=(1+x)E+xJ.
\tag{3}
\]

Consequently the degree-two terminal case is a statement about an
arbitrary rooted forest state \((E,J)\); no hidden restriction on the
rooted forest is available.

## 2. The order-sensitive cutoff becomes a product condition

Put

\[
N=|F|,\qquad \beta=\alpha(F),\qquad r=k-1.
\]

Pendant-pair deletion gives

\[
|G|=N+2,\qquad \alpha(G)=\beta+1.
\]

Because \(k\) is an integer,

\[
k<L_*(G)
\quad\Longleftrightarrow\quad
k<
\frac{(\beta+1)(N+1)}{\beta+N+3}.
\]

Direct subtraction gives the exact equivalence

\[
\boxed{\qquad
k<L_*(G)
\quad\Longleftrightarrow\quad
(\beta-r)(N-r)>(r+1)(r+2).
\qquad}
\tag{4}
\]

This is the natural cutoff coordinate for the remaining proof.  The
two factors are respectively the unused independence capacity and the
number of vertices outside a rank-\(r\) set.

For a forest \(N\le2\beta\).  When \(r\ge6\), (4) in particular forces
\(\beta-r\ge3\).  The converse is false and must not be substituted
for (4).  An all-rank scan of the two-level family finds failures of
(D) with \(\beta-r\) as large as \(13\) already for
\(t\le8,m\le50\); every such failure lies beyond (4).  Thus both room
factors, not merely the independence gap, are essential.

## 3. Multiplier form of the two likelihood inequalities

Define the leaf-addition multipliers

\[
m_j=\frac{a_j}{b_j}
=1+\frac{c_{j-1}}{b_j}.
\tag{5}
\]

The upper cross-ratio inequality (C),

\[
b_{r-1}a_{r+1}\le a_rb_r,
\]

is exactly

\[
\boxed{\qquad
\frac{m_{r+1}}{m_r}
\le
\frac{b_r^2}{b_{r-1}b_{r+1}}.
\qquad}
\tag{C-m}
\]

The weighted likelihood-deficit inequality (D),

\[
r a_rb_{r+1}\le(r+1)b_ra_{r+1},
\]

has the especially simple cancellation

\[
\boxed{\qquad
\frac{m_{r+1}}{m_r}\ge\frac r{r+1}.
\qquad}
\tag{D-m}
\]

Equivalently,

\[
r\left(1+\frac{c_{r-1}}{b_r}\right)
\le
(r+1)\left(1+\frac{c_r}{b_{r+1}}\right).
\tag{6}
\]

Thus (D) says only that the multiplicative contribution of the new
terminal vertex cannot fall by more than the elementary factorial
factor \(r/(r+1)\) between two consecutive levels.  This is the cleanest
candidate for a marked-set injection.

## 4. Extension-mean form of the curvature floor

Put

\[
\lambda_j(B)=(j+1)\frac{b_{j+1}}{b_j}.
\]

From (5),

\[
\lambda_j(A)
=\lambda_j(B)\frac{m_{j+1}}{m_j}.
\tag{7}
\]

Writing

\[
u=\lambda_{r-1}(B),\quad
w=\lambda_r(B),\quad
h=\lambda_{r+1}(B),
\]

the two normalized curvatures are

\[
q_F=1+u-w,
\]

\[
q_T
=1+
w\frac{m_{r+1}}{m_r}
-h\frac{m_{r+2}}{m_{r+1}}.
\]

Hence the final curvature hypothesis (E) is exactly

\[
\boxed{
2(r+1)
\left(
1+
w\frac{m_{r+1}}{m_r}
-h\frac{m_{r+2}}{m_{r+1}}
\right)
-r(1+u-w)
\ge7.
}
\tag{E-m}
\]

The separate conditions (D-m) and (E-m) are useful diagnostics, but the
sharper compensated-linear scalar lemma in
`THREE_COMPARISON_C12_REDUCTION_2026-07-28.md` only needs (C-m) and

\[
\boxed{\qquad
v\{2(r+1)q_T-rq_F\}
\ge2r(r+1)(w-v)_+.
\qquad}
\tag{CL-m}
\]

Condition (C-m) can be replaced in the sign induction by the one-step
drift inequality

\[
\boxed{\qquad v\le u+1.\qquad}
\tag{U-m}
\]

If \(u\ge r\), (U-m) implies (C-m).  If \(u<r\), both lower polynomials
have already started decreasing, and their shifted sum decreases
directly.  Subject to the room condition (4), (U-m) and (CL-m) are
therefore the remaining graph-theoretic proof obligations.  They imply
the original unimodality conjecture.

## 5. Exact evidence

The following completed audits use integer or exact rational arithmetic.

1. All terminal supports of all unlabeled trees through order \(15\):
   163,373 applicable checks, with no failure of (C), (D), or the
   resulting scalar compensation.

2. All applicable rank-seven terminal supports at order \(16\):
   no failure, and minimum curvature value \(H=16\).

3. The complete 60-vertex PatternBoost corpus:
   43,595 trees, 130,784 sampled terminal supports, and 1,820,135
   applicable ranks.  There is no failure of (C), (D), (E), or (CL).  The
   minimum of \(H-7\) is

   \[
   19.9363765625\ldots.
   \]

   The minimum exact compensated-linear margin \(vH-2kr\varepsilon\)
   is

   \[
   663.7886492173\ldots.
   \]

4. The rigorous 384-bit terminal Galvin calculation at
   \((t,m,r)=(28,50000,961045)\) passes all three inequalities even
   though both of the formerly proposed comparisons (A) and (B) fail.

These computations are falsification evidence, not a proof.

## 6. Immediate proof targets

The next proof attempts should proceed in this order.

1. Prove the forest-specific one-step drift inequality (U-m) by an
   ordered-face or symmetric-difference switching argument.  It is false
   for \(K_{2,10}\), so the proof must use acyclicity.

2. Expand (CL-m) as a coupled two-level extension variance.  The
   negative part occurs only when adding the terminal vertex lowers the
   adjacent extension mean; retain the curvature reserve to pay exactly
   that deficit.

3. Use the room product (4), rather than the false independence-gap-only
   shortcut, to bound the remaining size-bias term.

The degree-two case \(d=0\) is the structural core.  Additional terminal
leaves replace \(B\) by \((1+x)^dI(R)\), so total positivity of binomial
convolution is the natural mechanism for lifting a degree-two proof.
