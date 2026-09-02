# Rank-6 strong rooted inequality for spiders

Date: 2026-07-27

Status: **proved for every spider of order at least 18**.  This is a
sharp-family theorem, not yet a proof of Erdős Problem 993 for all
trees.

## Theorem

Let \(T\) be a spider with at least three arms and order \(n\ge 18\),
and let \(p\) be any leaf.  Put

\[
d=i_4(T),\qquad e=i_5(T),\qquad
h=i_4(T-p),\qquad k=i_5(T-p).
\]

Then

\[
\boxed{
S_6(T,p):=d(2e+d)-24(eh-dk)>0.
}
\]

At order 18 the exact minimum is

\[
\min S_6(T,p)=31\,256,
\]

attained at the spider with arm lengths

\[
(1,1,1,2,12)
\]

when \(p\) lies on a unit arm.

## 1. Four cumulative coordinates

For arm lengths \(\ell_1,\ldots,\ell_M\), define

\[
\begin{aligned}
M&=\#\{\text{arms}\},\\
T&=\#\{i:\ell_i\ge2\},\\
U&=\#\{i:\ell_i\ge3\},\\
R&=\sum_i(\ell_i-3)_+.
\end{aligned}
\]

Then

\[
M\ge T\ge U\ge0,\qquad n-1=M+T+U+R.
\]

The numbers of arms of lengths \(1\), \(2\), and at least \(3\) are

\[
a_0=M-T,\qquad a_1=T-U,\qquad a_2=U.
\]

Deleting a rooted leaf subtracts exactly one from:

- \(M\), if its arm has length 1;
- \(T\), if its arm has length 2;
- \(U\), if its arm has length 3;
- \(R\), if its arm has length at least 4.

This is the key simplification.

## 2. Exact coefficient formulas

Put \(q=T+U+R\) and \(W=n-1\).  The needed motif totals are

\[
\begin{aligned}
A&=\binom M2+q,\\
B&=\binom M3+(M-1)T+U+R,\\
C&=(n+1)A-M\binom M2-2q
   -\bigl(M(M-1)+2MT+4U+4R\bigr),\\
D&=\binom M4+\binom{M-1}{2}T+\binom T2+(M-1)U+R.
\end{aligned}
\]

Here \(A\) counts wedges, \(B\) connected three-edge subtrees, \(C\)
copies of \(P_3\sqcup K_2\) among edge subsets, and \(D\) connected
four-edge subtrees.  Inclusion-exclusion gives

\[
\begin{aligned}
i_4={}&\binom n4-W\binom{n-2}{2}
       +A(n-4)+\binom W2-B,\\
i_5={}&\binom n5-W\binom{n-2}{3}
       +A\binom{n-3}{2}
       +\left(\binom W2-A\right)(n-4)\\
     &\quad-B(n-4)-C+D.
\end{aligned}
\]

Consequently \(i_4\), \(i_5\), and all four rooted values of \(S_6\)
are explicit polynomials in \((M,T,U,R)\).

`verify_rank6_spider_bernstein_cells.py` first checks these formulas
against 5,607 direct independence-polynomial computations, covering
every integer arm partition through order 24.

## 3. The virtual unit-arm lower bound

Let \(P_M,P_T,P_U,P_R\) denote the four polynomials obtained when the
deleted state is formed by subtracting one from the indicated
coordinate.  \(P_M\) is algebraically defined even when \(M=T\), in
which case no unit arm actually exists.

Exact Bernstein certificates prove

\[
\begin{aligned}
P_T-P_M&\ge0 &&\text{when }a_1\ge1,\\
P_U-P_M&\ge0 &&\text{when }a_2\ge1,\\
P_R-P_M&\ge0 &&\text{when }a_2\ge1,\ R\ge1.
\end{aligned}
\]

Thus \(P_M\) is a common lower bound for every feasible root type.

The virtual expression \(P_M\) is not positive on the entire
order-18 continuous relaxation.  This is why order 18 is checked
exactly.  The certificate proves directly that

\[
P_M>0\qquad\text{for }M\ge3,\quad W=n-1\ge18.
\]

Therefore all actual rooted spiders of order \(n\ge19\) have
\(S_6>0\).

## 4. Exact Bernstein cells

Normalize by

\[
X_0=\frac{a_0}{W},\qquad
X_1=\frac{2a_1}{W},\qquad
X_2=\frac{3a_2}{W},\qquad
X_3=\frac R W,
\]

so \(X_0+X_1+X_2+X_3=1\), and put \(s=1/W\).

Because \(M=a_0+a_1+a_2\ge3\), every state contains some reserved
triple

\[
(c_0,c_1,c_2),\qquad c_0+c_1+c_2=3,\qquad c_i\le a_i.
\]

There are ten such compositions.  On the corresponding cell set

\[
\rho=(c_0,2c_1,3c_2,0)
\]

and write

\[
X_i=\rho_i s+(1-|\rho|s)b_i,
\qquad b_i\ge0,\quad \sum_i b_i=1.
\]

For \(P_M\), homogenize \(s^9P_M\) and use \(v=18s\in[0,1]\).
Across all ten cells, every exact rational coefficient in the
degree-\((9,9)\) simplex-times-interval Bernstein basis is positive.
The smallest coefficient is

\[
\frac{1\,239\,065}{3\,570\,467\,226\,624}>0.
\]

For the three root comparisons, use \(v=17s\), reserve the required
arm type (and one unit of \(R\) for \(P_R-P_M\)), and homogenize to
degree 7.  Each comparison has six cells and every Bernstein
coefficient is nonnegative.

Since Bernstein basis functions are nonnegative and sum to one on
the cell, these coefficient lists are exact positivity certificates
on the full continuous domains, not numerical sampling evidence.

The verifier also reconstructs one normalized polynomial from its
Bernstein coefficients at an independent rational point and demands
exact equality.  This guards the normalization and
monomial-to-Bernstein conversion.

## 5. Order 18

There are 152 feasible cumulative states with \(W=17\).  Accounting
for feasible root types gives 449 exact rooted cases.  Direct integer
evaluation gives

\[
\min P_{\text{actual root}}
=31\,256
\]

at

\[
(M,T,U,R)=(5,2,1,9),
\]

which is precisely the arm multiset \((1,1,1,2,12)\).

This completes the proof for every order \(n\ge18\).

## 6. Rank-6 cross corollary

The previously proved rank-5 forest theorem gives

\[
10e^2-de-12df\ge0,
\qquad f=i_6(T).
\]

Hence

\[
e^2-df\ge \frac{e(2e+d)}{12}.
\]

It follows that

\[
\begin{aligned}
C_6(T,p)
&:=d(e^2-df)-2e(eh-dk)\\
&\ge \frac e{12}
   \left[d(2e+d)-24(eh-dk)\right]\\
&=\frac e{12}S_6(T,p)\ge0.
\end{aligned}
\]

Thus every rooted spider of order at least 18 satisfies the rank-6
cross inequality needed by the leaf-payment induction.

## Reproduction

Run

```powershell
python verify_rank6_spider_bernstein_cells.py
```

The final line must be

```text
rank-6 strong rooted inequality for every spider of order >=18: CERTIFIED
```

All certificate arithmetic is exact integer or rational arithmetic.

## Remaining obstacle

This theorem rigorously settles the empirically sharp one-branch
family.  To obtain the rank-6 theorem for all trees, it remains to
prove that introducing a second branch vertex cannot reduce the
strong rooted expression below the spider boundary, or to certify
the equivalent connected-four-subtree coupling directly.

