# Rank-four three-halves reserve for every prefix-relevant forest

Date: 2026-07-27

Status: **proved theorem**.

## Theorem

For every forest \(F\) with independence number \(\alpha(F)\ge7\),

\[
\boxed{
Q_4(I(F))
=8i_4(F)^2-i_3(F)i_4(F)-10i_3(F)i_5(F)\ge0.
}
\tag{1}
\]

Since

\[
4<
\left\lfloor\frac{2\alpha(F)+1}{3}\right\rfloor
\quad\Longleftrightarrow\quad
\alpha(F)\ge7,
\]

(1) proves the three-halves reserve at rank four for every forest
where that rank belongs to the required prefix.

The statement cannot be extended to every forest without the prefix
condition.  Exactly two small forest independence polynomials have
negative \(Q_4\):

\[
B_1=(1,7,15,10,1),\qquad Q_4(B_1)=-2,
\]

\[
B_2=(1,7,15,11,1),\qquad Q_4(B_2)=-3.
\tag{2}
\]

Both are independence polynomials of seven-vertex trees with
independence number four.

## Scaled factorial coordinates

For \(P(x)=\sum_jp_jx^j\), define

\[
q_j=2^j j!p_j,\qquad
\rho_j=\frac{q_{j+1}}{q_j},\qquad
\delta_j=\rho_j-\rho_{j+1}.
\tag{3}
\]

The reserve identity is

\[
\frac{Q_k(P)}{p_{k-1}p_k}
=2\left(
k\frac{p_k}{p_{k-1}}
-(k+1)\frac{p_{k+1}}{p_k}
\right)-1.
\]

Consequently,

\[
Q_k(P)\ge0
\quad\Longleftrightarrow\quad
\delta_{k-1}\ge1.
\tag{4}
\]

Every forest satisfies the following four low-rank inequalities:

\[
\boxed{
\delta_0\ge2,\qquad
\delta_1\ge0,\qquad
\delta_2\ge1,\qquad
\delta_1+\delta_2\ge2.
}
\tag{5}
\]

Here:

- \(\delta_0=2+4|E|/|V|\ge2\);
- in fact \(\delta_1\ge4/|V|>0\), by the companion rank-two
  bound in
  `TWO_STEP_FACTORIAL_DROP_FOREST_CERTIFICATE_2026-07-27.md`;
- \(\delta_2\ge1\) is the proved global rank-three reserve in
  `RANK3_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md`;
- \(\delta_1+\delta_2\ge2\) is the proved two-step
  factorial-ratio theorem.

A forest polynomial satisfying \(Q_4\ge0\) additionally has

\[
\delta_3\ge1.
\tag{6}
\]

## Binomial convolution

If \(P\) and \(R\) have scaled factorial coefficients \(a_j\) and
\(b_j\), then the scaled coefficients of \(PR\) are

\[
c_k=\sum_{j=0}^k\binom kj a_jb_{k-j}.
\tag{7}
\]

At rank four, put

\[
\mathcal P
=c_4^2-c_3c_5-c_3c_4.
\tag{8}
\]

Direct scaling gives

\[
\mathcal P=18432\,Q_4(PR),
\tag{9}
\]

so it is enough to prove \(\mathcal P\ge0\).

For homogeneous certificates, replace the constant \(1\) in every
drop inequality by a variable \(h\ge0\), and use

\[
\mathcal P_h
=c_4^2-c_3c_5-hc_3c_4.
\tag{10}
\]

The actual forest statement is the slice \(h=1\).

## The full-factor cone

Suppose a forest factor has support at least four and satisfies
\(Q_4\ge0\).  Split it according to its second drop.

### High sector

If \(\delta_1\ge h\), write

\[
\begin{aligned}
\delta_0&=2h+d_0,&
\delta_1&=h+d_1,\\
\delta_2&=h+d_2,&
\delta_3&=h+d_3,
\end{aligned}
\tag{11}
\]

where every \(d_j\ge0\).

### Low sector

If \(0\le\delta_1\le h\), put \(r=\delta_1\) and write

\[
\begin{aligned}
\delta_0&=2h+d_0,&
\delta_1&=r,\\
\delta_2&=2h-r+d_2,&
\delta_3&=h+d_3,
\end{aligned}
\tag{12}
\]

with \(0\le r\le h\) and all slacks nonnegative.  The coupled
inequality in (5) is exactly what makes \(d_2\ge0\).

In either sector take \(t=\rho_4\ge0\), reconstruct
\(\rho_3,\ldots,\rho_0\) backwards from the four drops, set \(q_0=1\),
and reconstruct \(q_1,\ldots,q_5\) by
\(q_{j+1}=\rho_jq_j\).  Thus (11)--(12) parameterize every
prefix-relevant full forest factor.

## Exact convolution closure

The verifier expands (10) over the nonnegative parameters with exact
FLINT integer arithmetic.

### High times high

For two high factors, \(\mathcal P_h\) has 35,929 terms.  Every
coefficient is nonnegative; the smallest is \(1\), and the largest is
\(798580\).

### Low times high

Put \(r=a\) and \(h=a+b\), with \(a,b\ge0\).  The raw
\(\mathcal P_h\) has 36,758 terms, including 15 negative
coefficients, so raw coefficientwise positivity is too strong.

Let \(S\) be the sum of all 11 nonnegative parameters.  The exact
expanded identity

\[
\boxed{\mathcal P_h S^8\ \text{has every coefficient nonnegative}}
\tag{13}
\]

has 5,298,701 terms.  Its smallest coefficient is \(1\).
On the actual slice \(h=1\), \(S>0\), so (13) proves
\(\mathcal P_h\ge0\).

### Low times low

By symmetry assume \(r_A\le r_B\), and parameterize

\[
r_A=a,\qquad r_B=a+b,\qquad h=a+b+c
\]

with \(a,b,c\ge0\).  The other triangle follows by swapping the
factors.  The raw margin has 37,593 terms.  The exact certificate

\[
\boxed{\mathcal P_h S^8\ \text{has every coefficient nonnegative}}
\tag{14}
\]

has 5,303,272 terms, again with smallest coefficient \(1\).

Equations (13)--(14), together with the high--high expansion, prove:

> The product of two support-at-least-four forest polynomials
> satisfying \(Q_4\ge0\) also satisfies \(Q_4\ge0\).

The forest hypothesis is retained because it supplies the universal
low-rank constraints (5).

## Small factors

A forest with independence number at most three has at most six
vertices, since a forest is bipartite and therefore
\(\alpha\ge |V|/2\).  Exact enumeration gives 20 distinct
independence polynomials:

\[
\begin{array}{llll}
(1,1),&(1,2),\\
(1,2,1),&(1,3,1),&(1,3,2),&(1,4,3),&(1,4,4),\\
(1,3,3,1),&(1,4,3,1),&(1,4,4,1),&(1,4,5,2),\\
(1,5,6,1),&(1,5,6,2),&(1,5,7,2),&(1,5,7,3),\\
(1,5,8,4),&(1,6,10,4),&(1,6,10,5),\\
(1,6,11,6),&(1,6,12,8).
\end{array}
\tag{15}
\]

For each fixed polynomial \(p\) in (15), scale its coefficients as

\[
q_j=2^j j!p_jh^j.
\]

Multiplication by an arbitrary high or low full factor gives a
coefficientwise-nonnegative \(\mathcal P_h\):

- 20 high-sector cases, containing 16,300 terms in total;
- 20 low-sector cases, containing 19,920 terms in total;
- smallest coefficient \(1\) in both collections.

Thus a \(Q_4\)-good full forest factor remains good after multiplication
by any small forest factor.

## The two finite exceptions

Every forest with independence number at most six has at most 12
vertices.  The verifier generates every distinct forest independence
polynomial through order 12.  The counts by order are

\[
1,2,3,6,10,20,36,73,142,294,618,1348.
\]

Among the 572 polynomials with \(\alpha\le6\), the only negative
rank-four reserves are exactly \(B_1,B_2\) from (2).

Each exception is repaired by every full good factor.  The exact
coefficientwise certificates contain:

- 1,630 terms over the two high-sector cases;
- 1,992 terms over the two low-sector cases;
- smallest coefficient \(1\) in both collections.

Direct integer checks also give:

- \(Q_4(B_iP)>0\) for each of the 40 exception--small products;
- \(Q_4(B_iB_j)>0\) for all four exception pairs.

Finally, products formed only from the 20 small polynomials are checked
at the first possible support crossing.  There are respectively
23, 43, and 80 distinct products of total independence number
4, 5, and 6.  Their minimum \(Q_4\) values are

\[
1,\qquad35,\qquad300.
\tag{16}
\]

## Completion of the proof

Factor \(I(F)\) over the tree components of \(F\).  The proved tree
theorem
`RANK4_THREE_HALVES_LEAF_CERTIFICATE_2026-07-27.md`
shows that every tree component with independence number at least
seven is \(Q_4\)-good.  The finite classification handles tree
components of independence number four through six.  Hence every
component is one of:

1. a full \(Q_4\)-good factor;
2. one of the two bad factors \(B_1,B_2\);
3. a small factor from (15).

If a good factor occurs, convolution closure and the repair
certificates absorb every remaining component while preserving
\(Q_4\ge0\).

If no good factor occurs, then:

- two bad factors first combine to a good factor;
- one bad factor plus any small factor first combines to a good factor;
- if every factor is small, a minimal subproduct whose independence
  number reaches four has total independence number at most six, and
  (16) makes it good.

Because the total independence number is at least seven, one of these
three starts is always available.  The resulting good factor then
absorbs all remaining components.  This proves (1).

## Verification

Run the exact cases separately:

```powershell
python .\verify_rank4_three_halves_forest_certificate.py --case structural
python .\verify_rank4_three_halves_forest_certificate.py --case high-high
python .\verify_rank4_three_halves_forest_certificate.py --case low-high
python .\verify_rank4_three_halves_forest_certificate.py --case low-low
```

Or run all cases with `--case all`.  The two \(S^8\) expansions each
contain over five million exact terms and can take roughly a minute.

The modular dependencies are replayed by:

```powershell
python .\verify_two_step_factorial_drop_forest_certificate.py
python .\verify_rank3_three_halves_forest_certificate.py
python .\verify_rank4_three_halves_leaf_certificate.py
```

## Role in Erdős Problem 993

The three-halves reserve is now proved for every forest at both base
ranks \(3\) and \(4\).  Therefore the pendant cascade program no longer
needs its separate rank-four four-fifths payment.  To complete the
all-rank argument it is enough to prove:

1. the one-third mixed payment for \(k\ge5\);
2. the cutoff reserve \(Q_{L(T)}(I(T))\ge0\).

Those two statements remain conjectural.  Thus this theorem is a
substantial new piece of the route to Erdős Problem 993, but it is not
yet a solution of the full problem.
