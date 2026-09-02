# ISO four-minor base for two disjoint rooted stars

Date: 2026-08-29

Status: **proved for the stated terminal family.**  This is not yet the
arbitrary-forest ISO theorem and is not by itself a proof of Erdős Problem
993.

Let

\[
B=K_{1,a}\sqcup K_{1,b},\qquad a,b\ge0,
\]

and mark the two star centres \(u,v\).  In the nonsibling nested-leaf
notation, put \(E=I(B)\), \(U=I(B-u)\), \(V=I(B-v)\), and
\(W=I(B-\{u,v\})\).  Then the exact four-minor remainder is

\[
\begin{aligned}
N_r={}&2rE_rW_{r-2}-(r+1)E_{r+1}W_{r-3}
 +E_{r-1}\{2W_{r-3}-(r+1)W_{r-1}\}\\
&+U_r\{-(r+1)V_{r-2}-W_{r-3}\}
 +U_{r-1}\{2rV_{r-1}+2W_{r-2}\}\\
&+U_{r-2}\{-(r+1)V_r+2V_{r-2}-W_{r-1}\}
 -V_rW_{r-3}+2V_{r-1}W_{r-2}-V_{r-2}W_{r-1}.
\end{aligned}
\]

The theorem proved here is

\[
\boxed{N_r(B;u,v)\ge0\quad(a,b\ge0,\ r\ge2).}
\]

## Boundary ranks

Direct expansion, including the \(x^2\) term obtained by choosing both star
centres, gives

\[
N_2=2(3a+3b+7)>0
\]

and

\[
6N_3=10a^3+30a^2b+9a^2+30ab^2+60ab+41a
      +10b^3+9b^2+41b+24>0.
\]

For \(r\ge4\), that exceptional \(x^2\) term cannot enter any of the three
\(E\)-rows used by \(N_r\), so the generic calculation below is exact.

## Bivariate Newton expansion

Write

\[
N_r(a,b)=\sum_{i,j\ge0}c_{ij}(r)\binom ai\binom bj,
\qquad h=i+j.
\]

The product kernel

\[
L(p,q,h)=\frac{h!}{(p+q-h)!(h-p)!(h-q)!}
\]

is the coefficient of \(\binom{s}{h}\) in
\(\binom{s}{p}\binom{s}{q}\).  Vandermonde then gives the corresponding
mixed kernel for
\(\binom{a+b}{p}\binom aq\).  Applying these kernels literally to the
four groups \(BB,BX,BY,XY\) gives

\[
c_{ij}=f_r(h)+g_r(h,i)+g_r(h,j)+e_r(i,j),
\]

where

\[
f_r(h)=
\frac{2(r-1)(2h-2r+5)h!}
{(2r-3-h)!(h-r+2)!(h-r+3)!},
\]

\[
g_r(h,i)=
-\frac{P_r(h,i)i!}
{(2r-3-h)!(h-r+3)!(i-r+3)!},
\]

and the four sparse corrections are

\[
e_r(r-3,r-3)=2,quad
e_r(r-1,r-3)=e_r(r-3,r-1)=-(r+1),quad
e_r(r-2,r-2)=2r.
\]

The verifier records the fully expanded cubic \(P_r(h,i)\) and proves both
kernel identities symbolically.  Every nonzero coefficient lies in

\[
r-2\le h\le2r-3.
\]

On this band, \(f_r(h)>0\).

## Exactly one active coordinate

Suppose, by symmetry,

\[
i=r-3+x,\qquad 0\le j\le r-4,
\qquad 1\le x+j\le r.
\]

After extracting a positive factorial factor, \(f_r(h)+g_r(h,i)\) has sign
equal to

\[
2(r-1)(2h-2r+5)R-P,
\]

where

\[
R=\frac{h!x!}{i!(h-r+2)!}.
\]

For \(j\ge1\),

\[
R=h\prod_{q=1}^{j-1}\left(1+\frac{r-3}{x+q}\right).
\]

The cases \(j=0\) and \(j=1\) reduce respectively to the positive
polynomials

\[
2x(2r^2-4r+3x-1)
\]

and

\[
2\{5x^2+(4r-9)(r-1)x+2(r-1)(r-2)\}.
\]

For \(j\ge2\), expanding only the linear part of the positive product gives

\[
R\ge h\left(1+\frac{(r-3)(j-1)}{x+j-1}\right).
\]

The resulting numerator is certified on the whole admissible domain.  Put
\(j=J+2\).  If \(0\le x\le4\), put \(r=j+4+L\); the five resulting
polynomials have 18 nonnegative coefficients each.  If \(x\ge5\), put
\(x=X+5\) and \(r=x+j+M\); the resulting polynomial has 48 positive
coefficients.  These substitutions are exactly the two constraints
\(j\le r-4\) and \(x+j\le r\), with no enlarged box.

## Both coordinates active

Write

\[
i=r-3+x,\qquad j=r-3+y.
\]

The upper support bound forces \(x+y\le3\).  Up to symmetry there are only
six cases:

\[
(x,y)=(0,0),(0,1),(0,2),(0,3),(1,1),(1,2).
\]

Their exact expressions are recorded in the verifier.  Each is affine
in the central binomial coefficient \(C=\binom{2r}{r}\), with positive
coefficient.  Vandermonde supplies the all-order lower bound

\[
C=\sum_{k=0}^r\binom rk^2\ge\binom r3^2.
\]

After this substitution, five cases are coefficientwise nonnegative after
\(r=4+R\).  The last case is coefficientwise nonnegative after \(r=5+R\),
and its omitted value at \(r=4\) is exactly 25.  Thus all six cases are
positive.

If neither coordinate is active, only the already-positive \(f_r(h)\)
remains.  This exhausts all Newton coefficients and proves the theorem.

## Exact replay and scope

Run

```powershell
python .\prove_iso_disjoint_rooted_stars_newton_agent.py
```

The producer symbolically derives every displayed kernel and cone.  Its
literal independent Newton transform checks ranks 2 through 18 (9,129
coefficient cells); every nonzero coefficient is positive and the value
stream is hash-pinned in the report.

`audit_iso_disjoint_rooted_stars_newton_agent.py` independently enumerates
independent sets from literal edge lists for \(0\le a,b\le6\), pins both
producer hashes, and matches the four-minor formula on 441 graph/rank cells.

This closes the disconnected two-root terminal family left by a nested-leaf
pruning argument.  It does **not** prove the nested third-leaf recurrence for
an arbitrary forest.  Therefore it does not yet prove the all-forest ISO
inequality or the original unimodality conjecture.
