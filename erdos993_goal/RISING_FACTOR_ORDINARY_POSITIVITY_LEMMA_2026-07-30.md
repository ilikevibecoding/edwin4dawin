# Rising-factor ordinary positivity lemma

Let \(E\ge0\) and let \(f(n)\) be a polynomial of the form
\[
f(n)=(n+1)(n+2)\cdots(n+E)\,R(n),
\qquad
R(n)=\sum_{k\ge0}r_kn^k.
\tag{1}
\]
If every \(r_k\ge0\), then:

1. \(f(n)\ge0\) for every integer \(n\ge0\);
2. the Newton polynomial of \(f\) has a factor \((1+z)^E\); and
3. every coefficient after that Newton factor is removed is
   nonnegative.

Thus (1) with ordinary coefficientwise-positive \(R\) is a
one-line sufficient certificate for the complete general lift.

## Proof

Use the Stirling expansion
\[
n^k=\sum_{j=0}^{k}
\left\{\!\begin{matrix}k\\j\end{matrix}\!\right\}
n^{\underline j},
\]
whose coefficients are nonnegative.  Since
\[
\begin{aligned}
(n+1)\cdots(n+E)\,n^{\underline j}
&=(n-j+1)(n-j+2)\cdots(n+E)\\
&=(E+j)!\binom{n+E}{E+j},
\end{aligned}
\]
equation (1) becomes
\[
f(n)=
\sum_{j\ge0}
(E+j)!
\left(
\sum_{k\ge j}
r_k
\left\{\!\begin{matrix}k\\j\end{matrix}\!\right\}
\right)
\binom{n+E}{E+j}.
\tag{2}
\]
Every coefficient in (2) is nonnegative.

The basis elements \(\binom{n+E}{E+j}\) vanish at
\(n=-1,-2,\ldots,-E\), proving the zero block and hence the Newton
factor \((1+z)^E\).  Moreover,
\[
\Delta^{E+j}
\binom{n+E}{E+j}\bigg|_{n=-E}=1,
\]
while all other basis terms contribute triangularly.  Therefore the
coefficient \(B_j\) after removing the Newton factor is exactly
\[
\boxed{
B_j=(E+j)!
\sum_{k\ge j}
r_k
\left\{\!\begin{matrix}k\\j\end{matrix}\!\right\}\ge0.
}
\tag{3}
\]
Finally, (1) is visibly nonnegative for \(n\ge0\).

## Application target

For the path–isolate P4 residual, set \(n=s+1\) and
\[
E=2c+2m+x-1.
\]
Exact experiments indicate
\[
\frac{D_\epsilon(c,m,n-1,x)}
{\binom{2m+\epsilon}{m}}
=(n+1)\cdots(n+E)\,
R_\epsilon(c,m,x;n),
\]
where every ordinary coefficient of \(R_\epsilon\) in \(n\) is
nonnegative.  Proving this uniformly would settle the general
two-layer lift, its common factor, and all quotient coefficients
simultaneously.

