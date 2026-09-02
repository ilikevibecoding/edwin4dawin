# Entropy-to-Debt Scalar Closure for the Star Root

## Status

This note reduces the corrected adaptive Jensen debt condition to one
entropy inequality for the switchable-block marginals.

For

\[
K(x)=\prod_i\bigl((1+x)^{a_i}+x\bigr),\qquad
M=\sum_i a_i,
\]

put

\[
q_j=\frac{K_j}{\binom Mj},\qquad
R=\frac{q_{k+1}}{q_k},
\]

and

\[
p_i=\frac{2[x^{k-1}]K/S_{a_i}}{K_k},\qquad
\sigma_k=\sum_i p_i^2.
\tag{1}
\]

The entropy statement needed here is

\[
\boxed{\displaystyle
\log_2 q_k\ge\frac56\,\sigma_k.
}
\tag{E5/6}
\]

It is now proved, with the stronger constant \(8/9\), in
`STAR_ROOT_ENTROPY_JENSEN_THEOREM_2026-07-29.md`.

The stronger coefficient \(1\),

\[
\log_2q_k\ge\sigma_k,
\tag{E1}
\]

also passes all current exact and adversarial tests, with equality in
the all-unit boundary cases.  Only (E5/6) is needed below.

## 1. Normalized form of the debt

Let

\[
A=\frac{k}{M-k+1},
\qquad
\theta=\frac{k(M-k)}{(k+1)(M-k+2)}.
\tag{2}
\]

For the adverse debt

\[
D_k=
K_{k+1}(L_{k-1}+L_{k-2})
-K_k(L_k+L_{k-1}),
\qquad L_j=\binom Mj,
\]

direct substitution gives

\[
\boxed{\displaystyle
D_k
=
q_kL_k^2(1+A)(R\theta-1).
}
\tag{3}
\]

Thus \(D_k>0\) is equivalent to \(R\theta>1\).

Let

\[
e_k=\lceil\sigma_k\rceil.
\]

After division by \(q_kL_k^2\), the adaptive Jensen debt condition

\[
K_k^2\,3^{e_k}
\ge4^{e_k}(k+1)D_k
\]

is equivalent to

\[
\boxed{\displaystyle
q_k\left(\frac34\right)^{e_k}
\ge
(k+1)(1+A)(R\theta-1).
}
\tag{4}
\]

## 2. The universal bound \(R\le2\)

Use the weighted leaf representation of \(K_k\).  For a leaf
\(k\)-subset \(S\), let \(Z(S)\) be the number of empty star blocks
and let \(E_i(S)\) indicate that block \(i\) is the canonical
singleton.

The total relative weight of all one-leaf extensions of \(S\) is

\[
(M-k)+Z(S)
-\frac12\sum_i(a_i-1)E_i(S).
\tag{5}
\]

Every empty block contains at least one unselected leaf, so

\[
Z(S)\le M-k.
\]

Therefore (5) is at most \(2(M-k)\).  Double-counting weighted
extensions gives

\[
R
=
\frac{\mathbb E_\mu[\text{quantity in (5)}]}{M-k}
\le2.
\tag{6}
\]

## 3. Entropy and Fisher--Ryan leave one scalar inequality

Since \(e_k<\sigma_k+1\),

\[
q_k\left(\frac34\right)^{e_k}
\ge
\frac34q_k\left(\frac34\right)^{\sigma_k}.
\tag{7}
\]

Assume (E5/6).  Then

\[
\sigma_k\le\frac65\log_2q_k.
\]

The elementary integer inequality

\[
2^{19}=524288<531441=3^{12}
\]

is equivalent to

\[
\frac65\log_2\frac43<\frac12.
\]

Consequently,

\[
q_k\left(\frac34\right)^{\sigma_k}
\ge\sqrt{q_k}.
\tag{8}
\]

Fisher--Ryan root-Maclaurin monotonicity gives

\[
q_k\ge R^k.
\tag{9}
\]

Combining (7)--(9), it is enough to prove

\[
\boxed{\displaystyle
\frac34R^{k/2}
\ge
(k+1)(1+A)(R\theta-1)
}
\tag{S}
\]

whenever \(1<R\le2\) and \(R\theta>1\).

## 4. Proof of the scalar inequality

Put

\[
n=M-k\ge1
\]

and define

\[
g_{k,n}(R)
=
\frac{
(k+1)(1+A)(R\theta-1)
}{
R^{k/2}
}.
\]

Using (2),

\[
g_{k,n}(R)
=
\frac{n+k+1}{n+1}
\left(
\frac{Rkn}{n+2}-(k+1)
\right)R^{-k/2}.
\tag{10}
\]

We prove

\[
g_{k,n}(R)\le\frac34.
\tag{11}
\]

The case \(k=1\) cannot be adverse: (6) and
\(\theta<1/2\) give \(R\theta<1\).  Hence \(k\ge2\).

Define

\[
R_0=\frac{k+1}{k-2}
\]

when \(k>2\).  Direct subtraction gives

\[
kR-(k+1)
-
\frac{n+k+1}{n+1}
\left(
\frac{Rkn}{n+2}-(k+1)
\right)

=
\frac{
-k\{n[R(k-2)-(k+1)]-2(R+k+1)\}
}{
(n+1)(n+2)
}.
\tag{12}
\]

Thus, whenever \(R\le R_0\), the expression in parentheses in
(10), including its prefactor, is at most \(kR-(k+1)\).  Therefore

\[
g_{k,n}(R)
\le
\frac{kR-(k+1)}{R^{k/2}}.
\tag{13}
\]

For \(2\le k\le5\), one has \(R_0\ge2\), so (13) applies throughout
the interval \(R\le2\).  Its right side is maximized at \(R=2\),
giving

\[
\frac{k-1}{2^{k/2}}
=
\frac12,\ \frac1{\sqrt2},\ \frac34,\ \frac1{\sqrt2}
\]

for \(k=2,3,4,5\), respectively.  This proves (11) in these cases.

Now let \(k\ge6\).  On \(R\le R_0\), the right side of (13) is
maximized at \(R=R_0\).  On \(R\ge R_0\), direct differentiation of
(10) shows that its only positive stationary maximum occurs at

\[
R_*=
\frac{(k+1)(n+2)}{(k-2)n}
=R_0\left(1+\frac2n\right).
\tag{14}
\]

Even if \(R_*>2\), evaluating at \(R_*\) gives an upper bound for the
allowed interval.  The ratio of \(g_{k,n}(R_*)\) to the limiting
\(n\to\infty\) value at \(R_0\) is

\[
\frac{n+k+1}{n+1}
\left(\frac{n}{n+2}\right)^{k/2}.
\tag{15}
\]

Bernoulli's inequality gives

\[
\left(1+\frac2n\right)^{k/2}
\ge1+\frac kn
\ge1+\frac{k}{n+1},
\]

which is exactly the assertion that (15) is at most \(1\).
Consequently,

\[
g_{k,n}(R)
\le
2\left(\frac{k-2}{k+1}\right)^{k/2-1}.
\tag{16}
\]

At \(k=6\), the right side of (16) is

\[
\frac{32}{49}<\frac34.
\]

For real \(x\ge6\), the logarithmic derivative of

\[
\left(\frac{x-2}{x+1}\right)^{x/2-1}
\]

is

\[
\frac12\left[
\log\left(1-\frac3{x+1}\right)
+\frac3{x+1}
\right]<0.
\]

Hence the bound in (16) decreases for \(k\ge6\).  This proves
(11), and therefore (S), for every parameter.

## 5. Star-root theorem

Sections 1--4 prove:

> **Entropy closure theorem.** If (E5/6) holds for star forests, then
> the adaptive Jensen debt condition holds at every adverse rank.
> Together with the intersection grouping and diagonal-reserve
> theorem, this proves PIRD for every depth-two star root.

The companion note
`STAR_ROOT_ENTROPY_JENSEN_THEOREM_2026-07-29.md` proves the stronger
bound (E8/9), and hence verifies the hypothesis.  Therefore PIRD now
holds for every depth-two star root.

For reference, (E5/6) has the equivalent form

\[
\boxed{\displaystyle
\frac{K_k}{\binom Mk}
\ge
2^{(5/6)\sum_i
\left(
2[x^{k-1}]K/S_{a_i}\,/\,K_k
\right)^2}.
}
\tag{17}
\]

The stronger exponent \(1\) in (E1) remains an optional sharpening,
not a remaining obligation for the star-root theorem.

## 6. A stronger rational product target

Exact computation reveals a stronger inequality with no logarithms:

\[
\boxed{\displaystyle
q_k\ge\prod_i(1+p_i^2).
}
\tag{EP}
\]

This immediately implies (E1).  Indeed \(0\le p_i\le1\), and
concavity of \(x\mapsto\log_2(1+x)\) on \([0,1]\) gives

\[
\log_2(1+x)\ge x.
\]

Therefore (EP) yields

\[
\log_2q_k
\ge\sum_i\log_2(1+p_i^2)
\ge\sum_i p_i^2.
\]

The fully rational weakening

\[
\boxed{\displaystyle
q_k^6\ge\prod_i(1+p_i^2)^5
}
\tag{EP5/6}
\]

already implies (E5/6).  Thus either (EP) or the weaker (EP5/6)
closes the star-root case.

`verify_star_root_entropy_product.py` checks (EP) with exact rational
arithmetic.  The wider mixed-family stress scan over

\[
1\le s\le300,\qquad 2\le a\le500
\]

tested \(60{,}104{,}550\) rank instances without a failure.  Equality
occurs in the expected all-unit boundary cases.  A separate random
scan of \(9{,}000\) larger arbitrary branch/rank instances also found
no failure.

In the weighted leaf model, if \(E_i\) is the canonical-singleton
event and

\[
\mu(S)=\frac{2^{m(S)}}{L_kq_k},
\]

then \(p_i=\mu(E_i)\).  Consequently (EP) has the compact
probabilistic form

\[
\mathbb E_{\nu_k}2^{m(S)}
\ge
\prod_i\left(1+\mu(E_i)^2\right),
\tag{18}
\]

where \(\nu_k\) is the uniform measure on leaf \(k\)-subsets.  This is
the current strongest clean proof target.
