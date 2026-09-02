# Rank-6 terminal-bundle reduction

Date: 2026-07-28

Status: **completed and absorbed into the rank-6 tree theorem**.
All twelve Newton coefficients, the infinite boundary, and the finite
core cases have now been certified exactly.  The complete theorem and
current replay instructions are in
`RANK6_TREE_THREE_HALVES_THEOREM_2026-07-28.md`.  This is not a
resolution of Erdős Problem 993.

## 1. Remove the whole terminal broom

Let \(A\) be a tree rooted at \(q\), put \(H=A-q\), and construct
\(G_t\) by adjoining a new support vertex at \(q\) together with
\(t\ge1\) leaves adjacent to that support vertex. Then

\[
I(G_t;x)=(1+x)^tI(A;x)+xI(H;x).
\tag{1}
\]

Write \(c_j=i_j(A)\), \(h_j=i_j(H)\), and

\[
p_j(t)=\sum_{\ell=0}^j\binom t\ell c_{j-\ell}+h_{j-1}.
\]

Thus

\[
Q_6(G_t)=12p_6(t)^2-p_5(t)p_6(t)-14p_5(t)p_7(t).
\]

## 2. Exact three-term decomposition

Put

\[
Q_6(A)=12c_6^2-c_5c_6-14c_5c_7
\]

and

\[
Q_5(H)=10h_5^2-h_4h_5-12h_4h_6.
\]

Define \(p_7^\circ(t)=p_7(t)-c_7-h_6\), and let

\[
\begin{aligned}
R_t={}&6c_5h_4
\left(12p_6(t)^2-p_5(t)p_6(t)
-14p_5(t)p_7^\circ(t)\right)\\
&-6h_4p_5(t)(12c_6^2-c_5c_6)\\
&-7c_5p_5(t)(10h_5^2-h_4h_5).
\end{aligned}
\tag{2}
\]

Direct expansion gives the exact identity

\[
\boxed{
6c_5h_4Q_6(G_t)
=R_t+6h_4p_5(t)Q_6(A)+7c_5p_5(t)Q_5(H).
}
\tag{3}
\]

Consequently, induction supplies the \(Q_6(A)\) term, the proved
rank-5 forest theorem supplies the \(Q_5(H)\) term, and the only new
obligation is \(R_t\ge0\).

This is strictly smaller than adding the sibling leaves one at a time:
\(R_t\) has degree exactly \(11\), whereas the sequential leaf payment
has degree \(19\).

Newton interpolation at \(t=1\) gives

\[
R_t=\sum_{j=0}^{11}\binom{t-1}{j}\Delta^jR_1.
\tag{4}
\]

## 3. Newton coefficients

For a tree of order \(n\), \(c_0=1\),
\(c_1=n\), and \(c_2=\binom{n-1}{2}\). If
\(a=i_3(A-N[q])\), then \(0\le a\le c_4\).

Exact factorization, trivial coefficient bounds, and extension
counting prove

\[
\boxed{\Delta^jR_1\ge0\qquad(7\le j\le11).}
\tag{5}
\]

The remaining middle coefficients have since been completed:

\[
\boxed{\Delta^jR_1\ge0\qquad(2\le j\le6).}
\]

The exact Bernstein certificates use 186,372 coefficients for the
ordinary \(\Delta^2,\ldots,\Delta^5\) endpoint cells, 26,472 for the
one refined \(\Delta^2\) rooted cell, 102,060 for the required
\(D_4\)-concavity checks, and 1,296 for \(\Delta^6\).

For example,

\[
\Delta^{11}R_1=2772c_0^2c_5h_4,
\]

and

\[
\Delta^{10}R_1=252c_5h_4(15n+37).
\]

The only nontrivial high bracket is the one for \(\Delta^7\).
Using

\[
5c_5\le(n-4)c_4,\qquad
4c_4\le(n-3)c_3,\qquad
c_3\le\binom n3,
\]

its lower bound is

\[
\frac43(4n^4-8n^3+233n^2+857n-21)>0.
\]

## 4. Exact finite certificates

The WROM free-tree generator and rerooted polynomial messages use
signed 128-bit integer arithmetic throughout.

### Direct small cores

Every tree and every root through core order \(17\) was checked.
There are

\[
81,137\text{ free trees},\qquad
1,324,073\text{ rooted checks}.
\]

For core orders \(11\) through \(17\), \(Q_6(G_t)\) at \(t=1\) and
all twelve Newton coefficients are nonnegative. The only smaller
exceptions are harmless for an order-\(13\) induction:

- core order \(7\): the minimum at \(t=2\) is \(-2\), but every
  \(t\ge3\) is certified;
- core orders \(8,9,10\): the minima at \(t=1\) are respectively
  \(-2,-25,-40\), but every \(t\ge2\) is certified.

### Boundary orders 18 through 21

For the two remaining boundary quantities, all trees and every root
were checked:

\[
\begin{array}{c|r|r|r|r}
n&\text{trees}&\text{roots}&\min R_1&\min\Delta R_1\\ \hline
18&123867&2229606&317854516739760&851756586404724\\
19&317955&6041145&1423863060219600&3581222809778250\\
20&823065&16461300&5702465876889600&13601321404539960\\
21&2144505&45034605&20744320295462400&47291415287730600.
\end{array}
\]

This is the same exact universe of \(3,409,392\) free trees and
\(69,766,656\) rooted checks used by the strong rooted theorem.

## 5. Completed infinite boundary

Normalize

\[
X=\frac{c_4}{c_5},\quad
D=1-\frac{c_4c_6}{c_5^2},\quad
r=\frac{h_4}{c_4},\quad
q=\frac{h_5}{c_5}.
\]

Both \(R_1/c_5^4\) and \(\Delta R_1/c_5^4\) are concave in \(D\) and
\(q\). The already-proved inequalities give

\[
\frac{2+X}{12}\le D\le\frac16+\frac X2,
\]

where the upper endpoint is the forest two-extension inequality at
rank four.

If \(F=A-N[q]\), \(m=|F|\), \(u=i_3(F)/c_4\), and
\(Y=i_4(F)/i_3(F)\), then

\[
r=1-u,\qquad q=1-XuY,
\]

\[
u\le\min\left\{\frac12,
\frac{\binom m3}{\binom{n-3}4}\right\},
\]

and the proved forest inequalities give

\[
Y\ge
\max\left\{
0,\,
\frac{m^2-10m+15}{4(m-1)},\,
\frac34\left(
\frac{u\binom{n-3}4}{\binom m2}-1
\right)
\right\}.
\tag{6}
\]

After coupling the adjacent whole-tree ratios through the rank-4
defect, exact low-dimensional Bernstein certificates prove both
boundary inequalities for every \(n\ge24\), using 59,342 exact
coefficients.  Orders \(22\) and \(23\) were added to the exhaustive
finite boundary check.  Together with orders \(18\) through \(21\),
this completes \(R_1,\Delta R_1\ge0\) for every core order at least
18.

## Replay

```powershell
python .\verify_rank6_terminal_bundle_reduction.py
python .\verify_rank6_terminal_bundle_high_differences.py
python .\verify_rank6_terminal_bundle_delta6.py
python .\verify_rank6_terminal_bundle_d4_concavity.py
python .\verify_rank6_terminal_bundle_delta2to5.py
python .\verify_rank6_terminal_bundle_delta2_refined_upper.py
python .\verify_rank6_terminal_bundle_boundary_reduction.py
python .\verify_rank6_terminal_bundle_boundary_infinite.py
python .\verify_rank6_small_core_isolate_payments.py direct17
python .\verify_rank6_small_core_isolate_payments.py boundary21
python .\verify_rank6_small_core_isolate_payments.py boundary23
```
