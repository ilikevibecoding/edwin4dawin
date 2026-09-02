# Two-terminal path theorem for the nested Lambda remainder

Date: 2026-07-29

## Theorem

Let \(P_n\) have endpoint leaves \(\ell,w\), and let
\(\mathcal E_q(P_n,\ell)\) be the sharp Lambda leaf-recursion
remainder from (12c) of
`SHARP_MIXED_LAMBDA_BRIDGE_CANDIDATE_2026-07-29.md`.
For \(q\ge4\), put

\[
\mathcal N_q(n)=
\mathcal E_q(P_n,\ell)
-\mathcal E_q(P_{n-1},\ell)
-\mathcal E_{q-1}(P_{n-2},\ell).
\]

Then \(\mathcal N_q(n)\ge0\) at every supported rank.  At \(q=3\),
where the lower-rank remainder is not used, one has

\[
\mathcal E_3(P_n,\ell)-\mathcal E_3(P_{n-1},\ell)\ge0.
\]

Thus the strong two-leaf pruning inequality is proved for every path,
not merely checked to finite order.

## Exact path sequences

For the path \(P_m\),

\[
f_k(P_m)=k!\,i_k(P_m)=(m-k+1)_{\underline{k}}.
\]

A \(k\)-set inducing exactly one edge is a binary string with one
block \(11\) and \(k-2\) isolated ones.  Choosing the position of the
double block and distributing the zero gaps gives

\[
b_k(P_m)=(k-1)\binom{m-k+1}{k-1},
\qquad
g_k(P_m)=(m-k+1)_{\underline{k-1}}.
\]

For an endpoint leaf of \(P_n\), the three graphs in the factorial
remainder are \(P_{n-1},P_{n-2},P_{n-3}\).  Substitution in the exact
formula (12b) therefore contains no unknown graph quantities.

## General factorization

For \(q\ge4\), symbolic falling-factorial simplification gives

\[
\begin{aligned}
q!^2\mathcal N_q(n)
={}&2q(q-1)(n-q-2)(n-2q+1)\\
&\times
(n-q-3)_{\underline{q-4}}^2\,Q_q(n),
\end{aligned}
\]

where

\[
\begin{aligned}
Q_q(n)={}&
2(2q-1)n^4+(-26q^2-4q+11)n^3\\
&+(66q^3+47q^2-37q-16)n^2\\
&+(-78q^4-83q^3+22q^2+61q+7)n\\
&+2q(18q^4+22q^3+3q^2-21q-11).
\end{aligned}
\]

On the support, \(n\ge2q-1\), so every factor outside \(Q_q\) is
nonnegative.  Put \(x=n-(2q-1)\).  Then the coefficients of \(Q_q\)
in descending powers of \(x\) are

\[
\begin{aligned}
&4q-2,\\
&6q^2-36q+19,\\
&6q^3-43q^2+113q-61,\\
&(q-1)(2q^3-17q^2+57q-80),\\
&3(q-3)(q-2)^2.
\end{aligned}
\]

They are all positive for \(q\ge6\).  The only negative coefficient
in the remaining cases is the cubic coefficient:

\[
\begin{aligned}
Q_4&=14x^4-29x^3+87x^2+12x+12,\\
Q_5&=18x^4-11x^3+179x^2+120x+54.
\end{aligned}
\]

The quadratic discriminants of
\(14x^2-29x+87\) and \(18x^2-11x+179\) are negative, so both
quartics are positive for \(x\ge0\).

At \(q=3\), direct simplification gives

\[
3!^2\{
\mathcal E_3(P_n,\ell)-\mathcal E_3(P_{n-1},\ell)
\}
=6(n-6)(n-5)(20n^2-238n+707).
\]

This is zero at \(n=5,6\), and positive for \(n\ge7\): the quadratic
is positive at seven and increasing thereafter.

## Verification

`verify_two_terminal_path_nested_lambda.py` proves the general
falling-factorial identity symbolically, checks every positivity
step, and replays all supported ranks through path order 500.  Its
machine-readable record is
`two_terminal_path_nested_lambda_certificate_20260729.json`.

This theorem supplies the exact two-terminal base for a prospective
proof of the forest-pruning lemma.  The remaining step is to prove
that its strong nested remainder does not decrease when an unrelated
third leaf or isolate is restored.
