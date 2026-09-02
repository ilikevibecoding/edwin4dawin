# Mixed Star-Root Binomial-Basis Certificates

## Status

This note gives exact, independently reproducible certificates for the
star-root family with one nontrivial branch,

\[
(1^s,a),
\qquad s\ge1,\quad a\ge2.
\]

For every fixed coefficient index \(1\le k\le75\), the certificate
proves the PIRD minor for **all** integer parameters \(s\ge1,a\ge2\).
The all-one case \(a=1\) was proved separately at every rank.

The certificates exhibit a rigid positive-coefficient pattern that is
conjectured below for all \(k\).  A general-\(k\) derivation of that
pattern is not yet supplied.

## 1. Linear baseline and one exceptional centre

Put

\[
P(x)=(1+2x)^s,\qquad Q(x)=(1+x)^a,
\]

\[
U(x)=P(x)Q(x),
\qquad
K(x)=P(x)(Q(x)+x)=U(x)+xP(x),
\]

\[
L(x)=(1+x)^{s+a}.
\tag{1}
\]

For any polynomial \(W\), define

\[
\begin{aligned}
\Delta_k(W,L)
&=
W_k^2-W_{k-1}W_{k+1}
\\
&\quad+
W_k(L_k+L_{k-1})
-W_{k+1}(L_{k-1}+L_{k-2}).
\end{aligned}
\tag{2}
\]

Thus \(\Delta_k(K,L)\) is the desired star-root PIRD minor.

The baseline \(U\) is a product of positive linear factors.  By
Newton's inequalities and the ULC baseline theorem,

\[
\Delta_k(U,L)>0
\tag{3}
\]

throughout the nontrivial support.

## 2. The comparison polynomial

For fixed \(k\), define

\[
\boxed{
E_k(s,a)
=
a\,\Delta_k(K,L)
-(a-1)\Delta_k(U,L).
}
\tag{4}
\]

The desired quantitative comparison

\[
\Delta_k(K,L)
\ge
\left(1-\frac1a\right)\Delta_k(U,L)
\tag{5}
\]

is equivalent to \(E_k(s,a)\ge0\).

Each coefficient in (2) is a finite sum of products of binomial
polynomials:

\[
U_j
=
\sum_{t=0}^j
2^{j-t}\binom{s}{j-t}\binom at,
\qquad
(xP)_j=2^{j-1}\binom{s}{j-1},
\]

\[
L_j=\binom{s+a}{j}.
\tag{6}
\]

It follows that \(E_k(s,a)\) is a polynomial of coordinate degree at
most \(2k\).

## 3. Binomial-basis certificate

Shift to the natural nonnegative integer variables

\[
S=s-1,\qquad A=a-2.
\]

There is a unique expansion

\[
\boxed{
E_k(S+1,A+2)
=
\sum_{i=0}^{2k}\sum_{j=0}^{2k}
c_{i,j}^{(k)}
\binom Si\binom Aj.
}
\tag{7}
\]

The coefficients are mixed forward differences:

\[
c_{i,j}^{(k)}
=
\Delta_S^i\Delta_A^j
E_k(S+1,A+2)\big|_{S=A=0}.
\tag{8}
\]

Consequently, checking all
\((2k+1)^2\) coefficients in (7) is a finite exact certificate for
all integer \(s\ge1,a\ge2\).

`certify_mixed_star_binomial_basis.py` evaluates (8) using only Python
integers.  For every \(1\le k\le75\), it found

\[
c_{i,j}^{(k)}\ge0
\qquad(0\le i,j\le2k).
\tag{9}
\]

There are no floating-point comparisons and no bounded search over
\(s\) or \(a\).

Reports:

- `mixed_star_binomial_basis_k1_50_20260729.json`;
- `mixed_star_binomial_basis_k51_60_20260729.json`;
- `mixed_star_binomial_basis_k61_75_20260729.json`.

Each report records an SHA-256 digest of every coefficient matrix so
that reruns can be compared exactly.

Combining (3), (5), and (9) proves:

> **Fixed-rank mixed-family theorem.** For every
> \(1\le k\le75\), every \(s\ge1\), and every \(a\ge2\),
> \[
> \Delta_k\!\left(
> (1+2x)^s\bigl((1+x)^a+x\bigr),
> (1+x)^{s+a}
> \right)>0.
> \]

Together with the all-one theorem, this settles every branch list
containing at most one branch larger than one through index \(75\),
with no bound on the numbers of leaves or singleton branches.

## 4. Rigid support pattern

For every \(4\le k\le75\), the exact coefficient support is

\[
\boxed{
c_{i,j}^{(k)}>0
\quad\Longleftrightarrow\quad
k-3\le i+j\le2k.
}
\tag{10}
\]

There were no holes inside this region and no nonzero coefficients
outside it.

On its lowest diagonal, a closed formula emerges:

\[
\boxed{
c_{i,k-3-i}^{(k)}
=
2^{i+1}\left(k+2^{i+1}+1\right)
\qquad(0\le i\le k-3).
}
\tag{11}
\]

The verifier checks (10)--(11) independently at every certified rank;
there were zero failures through \(k=75\).

The number of positive coefficients is therefore

\[
\sum_{t=k-3}^{2k}(t+1)
=
\frac{3k^2+11k-4}{2}.
\tag{12}
\]

## 5. General-\(k\) conjectural certificate

The exact evidence supports:

> **Mixed-family binomial-positivity lemma.** For every \(k\ge1\),
> all coefficients \(c_{i,j}^{(k)}\) in (7) are nonnegative.

This lemma would prove (5), and hence PIRD, for the entire mixed family
\((1^s,a)\) at every rank.

The next proof task is to expand the products in (6) directly in the
shifted binomial basis.  The standard identity

\[
\binom xr\binom xt
=
\sum_h
\frac{(r+t-h)!}{h!(r-h)!(t-h)!}
\binom{x}{r+t-h}
\tag{13}
\]

turns every quadratic term in (4) into a finite combinatorial sum.
After applying Pascal's identities for the shifts \(s=S+1\) and
\(a=A+2\), the goal is to pair the negative summands and recover the
positive support (10), with (11) as the boundary case.
