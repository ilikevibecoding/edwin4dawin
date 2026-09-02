# Full Toeplitz-minor program for Erdős Problem 993

Date: 2026-07-25

Status: the primary invariant remains a candidate; the original companion
invariant is false.  Nothing in this note is a proof of Erdős 993.

## 2026-07-26 correction

The order-14 census below exhausts **minimally leaf-padded** internal cores,
not all leaf paddings of those cores.  The companion inequality (ED) is
false for a 31-vertex homeomorphically irreducible tree with nonminimal
padding:

\[
M_E(18,18)-M_J(18,18)=957-971=-14.
\]

The explicit tree and independent exact replay are in
`verify_hit_companion_failure.py`.  Its whole independence polynomial is
log-concave and unimodal, and the primary invariant (MD) passes all 8,939
minor checks over every planted orientation of that tree.

An additional arbitrary-padding randomized test checked 10,000 HITs,
40,000 planted states, and 60,337,532 exact instances of (MD), with no
failure.  Its certificate is
`hit_primary_minor_random_10k_exact_20260726.json`.  This is stronger
evidence for (MD), but still not a proof.

## Rooted recurrence

For a planted rooted tree state \(v\), write

\[
E_v=\prod_c T_c,\qquad
J_v=\prod_c E_c,\qquad
T_v=E_v+xJ_v,
\]

where the product is over the children of \(v\).  Here \(E_v\) counts
independent sets excluding \(v\), \(xJ_v\) counts those including \(v\), and
\(T_v\) is the full independence polynomial of the planted subtree.

For \(P(x)=\sum_k p_kx^k\), define the adjacent Toeplitz minor

\[
M_P(m,n)=p_mp_n-p_{m+1}p_{n-1}\qquad(m\ge n),
\]

with out-of-range coefficients interpreted as zero.

## Original candidate invariant pair

For every planted state in a homeomorphically irreducible tree (a tree with
no degree-two vertex):

\[
\tag{MD}
M_{T_v}(m,n)\ge M_{J_v}(m-1,n-1)
\quad(m\ge n).
\]

The now-discarded proposed companion at every internal planted state was:

\[
\tag{ED}
M_{E_v}(m,n)\ge M_{J_v}(m,n)
\quad(m\ge n).
\]

The diagonal \(m=n=k\) of the still-live (MD) candidate is

\[
t_k^2-t_{k-1}t_{k+1}
\ge
j_{k-1}^2-j_{k-2}j_k.
\]

Consequently, (MD), together with log-concavity of \(J_v\), implies
log-concavity of \(T_v\).  The off-diagonal inequalities retain the
Toeplitz-minor information that a convolution induction could need.

## Exact exhaustive evidence

The checker
`hit_full_minor_reserve_stress.py` exhausts every unlabeled internal core
through the requested order, minimally pads it with leaves to eliminate
degree-two vertices, and checks every directed planted state and every
internal rooting using Python integers.

The run through internal-core order 14 checked:

- 5,447 minimally padded HIT trees;
- 72,145 internal rootings;
- 391,189 planted states;
- 45,651,749 instances of (MD), including 4,864,073 diagonal instances;
- 44,480,411 instances of (ED), including 4,624,390 diagonal instances.

There were no negative reserves in this minimally padded census.  Boundary
equalities occur, so the minimum reserve for each tested inequality was
zero.  This statement must not be extended to arbitrary padding for (ED).

The mandatory degree-two broom control failed (MD) at \(m=n=14\) with
reserve \(-1810\).  Thus the program is capable of detecting the already
known failure of this strengthened invariant outside the no-degree-two
class.

Certificate:
`hit_full_minor_pair_h14_exact_20260725.json`

Certificate SHA-256:
`6502C557BE63C5E90B3A51FB97B2B663395D7E39C51E6B09B6B77B3441B786FA`

Checker SHA-256:
`5E178AC16C57E31A1EAA6ADDF8A5AD4E7BC3C78918BD1FD4A8F5D9B99DCB2EBD`

Reproduction command:

```powershell
python .\hit_full_minor_reserve_stress.py `
  --max-core 14 `
  --random 0 `
  --output .\hit_full_minor_pair_h14_exact_20260725.json
```

## Why the original invariant pair was not a proof

The two inequalities are not closed for arbitrary positive polynomial
states satisfying \(T=E+xJ\).  Consider two synthetic children:

\[
\begin{aligned}
(E_1,J_1,T_1)&=(1+26x,\ 1,\ 1+27x),\\
(E_2,J_2,T_2)&=(1+49x+18x^2+6x^3,\ 1+37x,\
                 1+50x+55x^2+6x^3).
\end{aligned}
\]

Each child satisfies every instance of both (MD) and (ED).  At the binary
parent,

\[
\begin{aligned}
E&=T_1T_2
  =1+77x+1405x^2+1491x^3+162x^4,\\
J&=E_1E_2
  =1+75x+1292x^2+474x^3+156x^4,\\
T&=E+xJ
  =1+78x+1480x^2+2783x^3+636x^4+156x^5.
\end{aligned}
\]

The parent violates (MD) at \(m=n=4\):

\[
M_T(4,4)-M_J(3,3)=-52776.
\]

This is not a tree counterexample.  The second synthetic child cannot be a
rooted forest state.  If \(N=e_1\) is the number of vertices below the root
and \(d=e_1-j_1\) is its number of child components, then every genuine
state obeys

\[
e_2=\binom{N}{2}-(N-d)=\binom{e_1}{2}-j_1.
\]

The synthetic state has \(e_1=49\), \(j_1=37\), and \(e_2=18\), whereas the
forest identity requires \(e_2=1139\).  Therefore mere nonnegative
coefficient algebra is insufficient.  More decisively, the explicit
31-vertex HIT in the correction above shows that (ED) itself cannot be
retained as a universal structural constraint.

## Immediate proof obligation

Find a recursively preserved tree/forest condition that proves the
branching implication for (MD) without using the false companion (ED):

\[
\{(E_c,J_c,T_c)\}_c
\Longrightarrow
\left(
M_{\prod T_c+x\prod E_c}(m,n)
\ge
M_{\prod E_c}(m-1,n-1)
\right).
\]

The low-order forest identities and the alternating formal-series recursion

\[
\frac{J_v(-y)}{E_v(-y)}
=
\prod_c\frac{1}{1-y\,J_c(-y)/E_c(-y)}
\]

are the next structural inputs to test.
