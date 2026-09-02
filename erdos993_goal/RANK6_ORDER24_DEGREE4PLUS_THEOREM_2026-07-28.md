# Rank-6 reserve at order-24 roots of degree at least four

Date: 2026-07-28

Status: **proved theorem**.

## Theorem

Let \(T\) be a tree of order \(24\), rooted at \(p\). If
\(d_T(p)\ge4\), then

\[
S_6(T,p)=
i_4(T)(2i_5(T)+i_4(T))
-24\!\left(i_5(T)i_4(T-p)-i_4(T)i_5(T-p)\right)
>0.
\]

## Degree at least five

The sharp path bound gives

\[
\frac{i_5(T)}{i_4(T)}\ge\frac{272}{105}.
\]

Combining this with the degree-sensitive deletion ratio gives the
normalized lower bound

\[
2x+1-24\frac{L-x}{1+L},\qquad
x=\frac{272}{105},\quad
L=\frac{20-d_T(p)}4.
\]

This expression increases with the root degree. At degree five it is

\[
\frac{643}{1995}>0.
\]

## Degree four and the forest ratio

Put \(F=T-N[p]\), so \(|F|=19\). Write \(e\) for its edges, \(W\) for
its two-edge paths, and \(R\) for its connected three-edge subtrees.
The exact motif formulas are

\[
\begin{aligned}
a=i_3(F)&=\binom{19}{3}-17e+W,\\
b=i_4(F)&=\binom{19}{4}
-e\binom{17}{2}+15W+\binom e2-R.
\end{aligned}
\]

The line graph of \(F\) has \(e\) vertices, \(W\) edges, and \(R\)
triangles. Its degree-square identity implies

\[
R\ge\frac{2W^2/e-W}{3}.
\]

Substitution into \(7177a-1871b\) gives a quadratic whose derivative
in \(W\) is

\[
\frac{7484W-64535e}{3e}<0
\]

throughout \(W\le\binom e2\), for \(3\le e\le18\). At the upper
endpoint the margin is

\[
\frac{
1871e^3-73890e^2+866701e-1784898
}{6}.
\]

Its minimum over these integer edge counts is \(33452>0\). Therefore

\[
\frac{i_4(F)}{i_3(F)}\le\frac{7177}{1871}
\qquad(e(F)\ge3).
\]

This is exactly the zero boundary of the rooted ratio cone:

\[
2\frac{272}{105}+1
-24\frac{
\frac{7177}{1871}-\frac{272}{105}
}{
1+\frac{7177}{1871}
}=0.
\]

## Sparse forest cases

It remains to handle \(e(F)=0,1,2\). Every nontrivial component then
has at most three vertices. The verifier generates every distinct
rooted component type, assigns the components and isolates among the
four root branches, constructs the exact independence polynomials,
and evaluates \(S_6\) using integers.

\[
\begin{array}{c|r|r}
e(F)&\text{rooted states}&\min S_6\\ \hline
0&1540&175\,548\,625\\
1&4560&170\,997\,137\\
2&20808&166\,527\,733
\end{array}
\]

All three minima are positive, completing the theorem.

## Replay

```powershell
python .\verify_rank6_order24_degree4plus.py
```
