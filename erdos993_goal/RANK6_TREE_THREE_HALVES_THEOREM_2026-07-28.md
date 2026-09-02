# Rank-6 three-halves theorem for trees

Date: 2026-07-28

Status: **proved theorem, internally and exactly verified**.  This is
a fixed-rank advance toward Erdős Problem 993, not a resolution of the
full all-rank unimodality conjecture.  Independent expert review is
still required before making a public novelty claim.

## Theorem

For every tree \(T\) of order at least \(13\), writing
\(i_j=i_j(T)\),

\[
\boxed{
Q_6(I(T))
=12i_6^2-i_5i_6-14i_5i_7
\ge0.
}
\tag{1}
\]

In particular,

\[
6i_6^2\ge7i_5i_7,
\tag{2}
\]

so the factorially normalized independence sequence is log-concave
at rank \(6\).

## 1. Remove a whole terminal broom

Let \(A\) be a tree rooted at \(q\), put \(H=A-q\), and obtain
\(G_t\) by adjoining a new support vertex at \(q\) together with
\(t\ge1\) new leaves adjacent to that support.  Then

\[
I(G_t;x)=(1+x)^tI(A;x)+xI(H;x).
\tag{3}
\]

Write \(c_j=i_j(A)\), \(h_j=i_j(H)\), and

\[
p_j(t)=\sum_{\ell=0}^j\binom t\ell c_{j-\ell}+h_{j-1}.
\]

Define \(p_7^\circ(t)=p_7(t)-c_7-h_6\) and

\[
\begin{aligned}
R_t={}&6c_5h_4
\left(12p_6(t)^2-p_5(t)p_6(t)
-14p_5(t)p_7^\circ(t)\right)\\
&-6h_4p_5(t)(12c_6^2-c_5c_6)\\
&-7c_5p_5(t)(10h_5^2-h_4h_5).
\end{aligned}
\tag{4}
\]

Exact expansion gives

\[
\boxed{
6c_5h_4Q_6(G_t)
=R_t+6h_4p_5(t)Q_6(A)+7c_5p_5(t)Q_5(H).
}
\tag{5}
\]

Here \(R_t\) has degree exactly \(11\), and

\[
R_t=\sum_{j=0}^{11}\binom{t-1}{j}\Delta^jR_1.
\tag{6}
\]

Thus the terminal step reduces to twelve fixed Newton coefficients.

## 2. Newton coefficients \(\Delta^2R_1,\ldots,\Delta^{11}R_1\)

For a core \(A\) of order \(n\ge18\), put

\[
w=\frac{c_2}{c_3},\qquad
x=\frac{c_3}{c_4},\qquad
D_4=1-\frac{c_3c_5}{c_4^2},\qquad
D_5=1-\frac{c_4c_6}{c_5^2}.
\]

The already-proved rank-4 and rank-5 forest inequalities bound
\(D_4,D_5\) between their rank-reserve and two-extension endpoints.
Deletion and the rooted cross inequality bound

\[
r=\frac{h_4}{c_4},\qquad q=\frac{h_5}{c_5}
\]

between the cross endpoint and a rooted upper endpoint.

Exact tensor-Bernstein certificates give

\[
\Delta^jR_1\ge0\qquad(3\le j\le5),
\tag{7}
\]

after a separate exact concavity certificate in \(D_4\).  The three
endpoint matrices use 50,028 Bernstein coefficients each; the
\(D_4\)-concavity matrices use 102,060.

The sixth difference has the exact factorization used by
`verify_rank6_terminal_bundle_delta6.py`; its two endpoint matrices
use 1,296 coefficients and prove

\[
\Delta^6R_1\ge0.
\tag{8}
\]

For the five highest differences, exact factorization and extension
counting prove

\[
\Delta^jR_1\ge0\qquad(7\le j\le11).
\tag{9}
\]

For example,

\[
\Delta^{11}R_1=2772c_5h_4,
\qquad
\Delta^{10}R_1=252c_5h_4(15n+37).
\]

### The sole loose \(\Delta^2\) endpoint

Seven of the eight ordinary endpoint cells certify directly, using
36,288 Bernstein coefficients.  The omitted coarse cell
\((q,D_5,D_4)=(1,(2+c_4/c_5)/12,(2+c_3/c_4)/10)\)
contains non-graph points and is genuinely negative on that relaxed
face.

Let \(J=A-N[q]\), \(m=|J|\), and put

\[
u=\frac{i_3(J)}{c_4},\qquad
Y=\frac{i_4(J)}{i_3(J)}.
\]

The actual rooted ratios satisfy

\[
r=1-u,\qquad
q=1-\frac{c_4}{c_5}uY.
\tag{10}
\]

If \(m\le8\), coefficientwise path minimality gives

\[
u\le
\frac{\binom83}{\binom{n-3}4}.
\tag{11}
\]

If \(m\ge9\), the forest ratio theorem gives

\[
Y\ge
\frac{m^2-10m+15}{4(m-1)}
\ge\frac3{16},
\qquad
u\le
\frac{\binom{n-2}3}{\binom{n-3}4}.
\tag{12}
\]

Substitution of (10)--(12) produces two compact four-dimensional
boxes.  Their exact certificates use respectively 8,424 and 18,048
Bernstein coefficients, with no subdivision.  Consequently

\[
\boxed{\Delta^2R_1\ge0.}
\tag{13}
\]

## 3. The two boundary coefficients

It remains to prove \(R_1\ge0\) and \(\Delta R_1\ge0\).
Normalize

\[
X=\frac{c_4}{c_5},\quad
D=1-\frac{c_4c_6}{c_5^2},\quad
r=\frac{h_4}{c_4},\quad
q=\frac{h_5}{c_5},\quad
Z=\frac{c_3}{c_4}.
\]

Both normalized boundary expressions are concave in \(D\) and \(q\).
On the cross face \(q=r-D/2\), the resulting expressions remain
concave in \(D\).  Hence it is enough to check the two \(D\) endpoints
and the cross and rooted-upper \(q\) endpoints.

The key correlation missing from the first relaxation is

\[
E=1-\frac ZX,\qquad Z=X(1-E),
\]

where the rank-4 defect bounds become

\[
\frac{2+X}{10+X}
\le E\le
\frac{1+3X}{3(2+X)}.
\tag{14}
\]

For the rooted-upper endpoint, (10) applies.  Forest inequalities give

\[
u\le\min\left\{\frac12,
\frac{\binom m3}{\binom{n-3}4}\right\},
\]

\[
Y\ge
\max\left\{
0,\,
\frac{m^2-10m+15}{4(m-1)},\,
\frac34\left(
\frac{u\binom{n-3}4}{\binom m2}-1
\right)
\right\}.
\tag{15}
\]

For \(n\ge24\), exact rational maps send this domain to unit boxes.
All endpoint cells pass, using 59,342 exact Bernstein coefficients.
Therefore

\[
R_1\ge0,\qquad \Delta R_1\ge0
\qquad(n\ge24).
\tag{16}
\]

Orders \(18\) through \(23\) were checked by exhaustive exact
enumeration of every tree and every root:

\[
\begin{array}{c|r|r|r|r}
n&\text{trees}&\text{roots}&\min R_1&\min\Delta R_1\\ \hline
18&123867&2229606&317854516739760&851756586404724\\
19&317955&6041145&1423863060219600&3581222809778250\\
20&823065&16461300&5702465876889600&13601321404539960\\
21&2144505&45034605&20744320295462400&47291415287730600\\
22&5623756&123722632&69191077777726464&152190767303081280\\
23&14828074&341045702&213298868270896256&456707985617333448.
\end{array}
\tag{17}
\]

Combining (7)--(9), (13), and (16)--(17) proves

\[
\boxed{R_t\ge0\quad(n\ge18,\ t\ge1).}
\tag{18}
\]

## 4. Small cores and induction

Every tree and every root through core order \(17\) was checked
directly.  The verifier covers 81,137 free trees and 1,324,073 rooted
cores, and checks \(Q_6(G_t)\) through all of its Newton differences.

The only negative values occur below total order \(13\):

- core order \(7\), \(t=2\);
- core orders \(8,9,10\), \(t=1\).

Thus every terminal-broom image of total order at least \(13\) with
core order at most \(17\) has \(Q_6\ge0\).

Now let \(G\) be a tree of order at least \(13\).  Choose an endpoint
of a diameter.  Its support vertex, its sibling leaves, and the next
vertex on the diameter express \(G\) as \(G_t\) in (3), including the
star case.

If the remaining core \(A\) has order at most \(17\), the direct
certificate applies.  Otherwise \(|A|\ge18\).  Strong induction gives
\(Q_6(A)\ge0\), the proved rank-5 forest theorem gives
\(Q_5(H)\ge0\), and (18) gives \(R_t\ge0\).  Every multiplier on the
right side of (5) is nonnegative, so \(Q_6(G)\ge0\).

This proves (1).

## Exact replay

The symbolic and compact-domain certificates are:

```powershell
python .\verify_rank6_terminal_bundle_reduction.py
python .\verify_rank6_terminal_bundle_high_differences.py
python .\verify_rank6_terminal_bundle_delta6.py
python .\verify_rank6_terminal_bundle_d4_concavity.py
python .\verify_rank6_terminal_bundle_delta2to5.py
python .\verify_rank6_terminal_bundle_delta2_refined_upper.py
python .\verify_rank6_terminal_bundle_boundary_reduction.py
python .\verify_rank6_terminal_bundle_boundary_infinite.py
```

The finite core and boundary certificates are:

```powershell
python .\verify_rank6_small_core_isolate_payments.py direct17
python .\verify_rank6_small_core_isolate_payments.py boundary21
python .\verify_rank6_small_core_isolate_payments.py boundary23
```

The order-23 run can instead be split into the eight deterministic
shards supported by the Rust verifier and checked with
`verify_rank6_boundary_n23_shards.py`.

The current literature check and novelty caveat are recorded in
`LITERATURE_CHECK_2026-07-28.md`.
