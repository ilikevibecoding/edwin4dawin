# Newton zero-block factor lemma

Let \(f\) be a polynomial and expand it in the Newton basis based at
\(-1\):
\[
f(s)=\sum_{r=0}^{n}A_r\binom{s+1}{r},
\qquad
F(z)=\sum_{r=0}^{n}A_rz^r.
\]
For every integer \(E\ge0\), the following are equivalent:
\[
(1+z)^E\mid F(z)
\tag{1}
\]
and
\[
f(-2)=f(-3)=\cdots=f(-E-1)=0.
\tag{2}
\]

## Proof

Using
\[
\binom{-k}{r}=(-1)^r\binom{k+r-1}{r},
\]
form the generating series of the negative evaluations:
\[
\begin{aligned}
\sum_{k\ge1}f(-k-1)t^{k-1}
&=\sum_{r\ge0}A_r(-1)^r
  \sum_{k\ge1}\binom{k+r-1}{r}t^{k-1}\\
&=\frac1{1-t}
  F\!\left(\frac{-1}{1-t}\right).
\end{aligned}
\tag{3}
\]
Under the substitution \(z=-1/(1-t)\),
\[
1+z=\frac{-t}{1-t}.
\]
Therefore the order of vanishing of the right side of (3) at \(t=0\)
is exactly the multiplicity of the root \(z=-1\) of \(F\).
The left side vanishes to order at least \(E\) exactly when its first
\(E\) coefficients, namely the values in (2), vanish.  This proves
the equivalence.

## Application to the P4 lift

For the path–isolate two-layer residual,
\[
E=2c+2m+x-1.
\]
Thus the repeatedly observed factor
\[
(1+z)^{2c+2m+x-1}
\]
is equivalent to one precise algebraic statement: the polynomial
extension in \(s\) of the residual vanishes at
\[
s=-2,-3,\ldots,-2c-2m-x.
\]
This converts the factorization problem into a finite consecutive
zero-block problem.  The zero block holds in every exact sample and
has the predicted sharp endpoint; proving it uniformly would settle
the common-factor part of the general lift program.

