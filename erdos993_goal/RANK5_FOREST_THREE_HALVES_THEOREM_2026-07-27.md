# Rank-5 three-halves theorem for forests

## Theorem

Let

\[
I(F;x)=\sum_{j\ge0}i_j(F)x^j
\]

be the independence polynomial of a forest \(F\).  If
\(|V(F)|\ge10\), then

\[
Q_5(I(F))
:=
10i_5(F)^2-i_4(F)i_5(F)-12i_4(F)i_6(F)
\ge0.
\tag{1}
\]

This extends the rank-5 tree theorem to all forests.  It is a
fixed-rank theorem, not yet a proof of full unimodality.

## Ratio form

Put

\[
q_j=2^j j!i_j,\qquad
\rho_j=\frac{q_{j+1}}{q_j},\qquad
\delta_j=\rho_j-\rho_{j+1}.
\]

Whenever \(i_4i_5>0\),

\[
\frac{Q_5}{i_4i_5}
=\rho_4-\rho_5-1
=\delta_4-1.
\tag{2}
\]

Thus (1) is equivalent to \(\delta_4\ge1\).

The proof uses the following previously certified forest inequalities:

\[
\delta_0\ge2,\qquad
\delta_1\ge0,\qquad
\delta_1+\delta_2\ge2,\qquad
\delta_2\ge1.
\tag{3}
\]

For a forest with independence number at least six, the certified
rank-4 forest theorem and its finite classification also give

\[
\delta_3\ge1.
\tag{4}
\]

The inputs behind (3) and (4) are, respectively:

* the elementary first drop;
* `verify_rank2_factorial_curvature_forests.py`;
* `verify_two_step_factorial_drop_forest_certificate.py`;
* `verify_rank3_three_halves_forest_certificate.py`;
* `verify_rank4_three_halves_forest_certificate.py`.

## The two full-factor cones

Homogenize the constant one in the desired drops by a variable \(h\),
which is set to one after the calculation.  A full factor means a
forest polynomial with independence number at least six and
\(\delta_4\ge1\).

If \(\delta_1\ge1\), write its five relevant drops as

\[
(2h+d_0,\ h+d_1,\ h+d_2,\ h+d_3,\ h+d_4),
\tag{5}
\]

where all \(d_j\ge0\).  This is the high cone.

If \(0\le\delta_1=r\le h\), (3) instead gives

\[
(2h+d_0,\ r,\ 2h-r+d_2,\ h+d_3,\ h+d_4),
\tag{6}
\]

again with nonnegative slacks.  This is the low cone.

Starting from the terminal ratio \(t=\rho_5\ge0\), equations (5) or
(6) reconstruct all ratios and hence \(q_0,\ldots,q_6\), up to a
positive common factor.

For two independence polynomials, the scaled coefficients of their
product satisfy the binomial convolution identity

\[
q_k(A B)
=\sum_{j=0}^k\binom{k}{j}q_j(A)q_{k-j}(B).
\tag{7}
\]

Therefore closure under disjoint union reduces to three cone cases:
high/high, low/high, and low/low.  In the last case symmetry lets us
order the two low drops.

## Exact cone certificate

`verify_rank5_three_halves_convolution_cones.py` expands the rank-5
margin after (7) using exact FLINT integer polynomials.

The raw expansions are:

| case | terms | negative coefficients |
|---|---:|---:|
| high/high | 512,157 | 0 |
| low/high | 528,280 | 57 |
| low/low | 544,352 | 57 |

All negative coefficients in each mixed case lie on one seven-variable
face.  The low/high and low/low hard faces are exactly identical.  The
common 6,164-term polynomial factors as

\[
(6a+a_3+a_4+6b+t_A)\,R,
\tag{8}
\]

where the linear factor is nonnegative.

Writing \(R=\sum_{j=0}^9a^jR_j\):

* every coefficient of \(R_j\) is positive for \(j\ge2\);
* \(R_1\) has four negative coefficients, absorbed by four exact
  AM-GM blocks;
* \(R_0\) has 35 negative coefficients, absorbed by 38 exact integer
  AM-GM blocks.

Each block has the form

\[
A x^u+B x^v-Cx^m\ge0,
\qquad u+v=2m,\qquad 4AB\ge C^2.
\tag{9}
\]

The verifier checks every exponent identity, every quadratic
inequality in (9), complete coverage of all negative coefficients, and
that the allocated positive coefficients never exceed those present.
The \(R_0\) calculation is scaled by \(10^6\) solely to keep every
allocation integral.  Its smallest remaining positive resource is 51,
and its smallest value of \(4AB-C^2\) is 6,456.

Consequently the class of full factors is closed under multiplication.

## Small components

A tree with independence number at most five has order at most ten.
There are exactly 72 distinct independence polynomials of such trees:

\[
(2,2,5,15,48)
\]

with independence numbers \(1,2,3,4,5\), respectively.

`verify_rank5_three_halves_forest_certificate.py` checks each of these
72 fixed factors against both full cones.  The resulting symbolic
margins are coefficientwise positive:

| full cone | checked terms | minimum coefficient |
|---|---:|---:|
| high | 328,896 | 1 |
| low | 424,656 | 1 |

Thus multiplying a full factor by any small tree component preserves
\(Q_5\ge0\).

If a forest consists only of small components, multiply them until the
total independence number first reaches six.  The crossing value is at
most ten.  Exact dynamic programming over distinct product
polynomials gives

\[
(1,2,5,13,38,117,222,500,1131,2591,5677)
\]

states at total independence numbers \(0,\ldots,10\).  The minimum
rank-5 margins at crossing values \(6,\ldots,10\) are

\[
54,\quad582,\quad2908,\quad12960,\quad41060.
\tag{10}
\]

So the first crossing product is a full factor, after which the
fixed/full certificate adds every remaining component.

The only remaining possibility for a forest of order at least ten is
total independence number at most five.  Since a forest is bipartite,
\(\alpha(F)\ge |V(F)|/2\); hence necessarily
\(|V(F)|=10\) and \(\alpha(F)=5\).  There are 25 small-product
polynomials in this class, and their minimum \(Q_5\) is 150.

## Full-factor bases

Every tree of order at least ten satisfies (1) by
`RANK5_TREE_THREE_HALVES_THEOREM_2026-07-27.md`.

For orders below ten, a tree can be a full factor only in the following
finite cases:

| order | distinct full-factor polynomials | minimum \(Q_5\) |
|---:|---:|---:|
| 7 | 1 | 90 |
| 8 | 6 | 54 |
| 9 | 27 | 53 |

These are checked exactly by the forest structural verifier.

Combining these bases, cone closure, fixed/full closure, and the finite
small-product crossing proves the theorem.

## Replay

From this directory:

```powershell
python .\verify_rank5_three_halves_convolution_cones.py
python .\verify_rank5_three_halves_forest_certificate.py
```

The tree theorem and lower-rank dependencies can be replayed with the
commands listed in
`RANK5_TREE_THREE_HALVES_THEOREM_2026-07-27.md` and the verifier files
listed after (4).
