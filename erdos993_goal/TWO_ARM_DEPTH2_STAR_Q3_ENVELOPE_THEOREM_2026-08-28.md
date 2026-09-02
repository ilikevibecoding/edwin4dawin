# All-rank `q3` envelope for two-arm depth-two stars

Date: 2026-08-28

Status: **exact all-order producer passed; independent audit pending**.

## Theorem

Take a centre joined to two arm vertices, and attach respectively `a`
and `b` leaves to those arms, where `a,b >= 0`.  If

\[
q_r=\frac{s_r}{r i_r},
\]

then `q_r` is nonincreasing over every supported rank `r >= 3`.
Consequently

\[
\boxed{q_r\le q_3\quad(r\ge3).}
\]

This includes the once-subdivided stars that asymptotically approach
equality in the general-tree envelope search.

## Closed forms

For `r >= 3`, direct expansion of the independence and one-edge
polynomials gives

\[
i_r=\binom{a+b+1}{r}+\binom a{r-1}+\binom b{r-1},
\]

\[
s_r=(b+1)\binom a{r-1}+(a+1)\binom b{r-1}.
\]

Put `k=r-1`,

\[
U=\binom ak,\qquad V=\binom bk,
\qquad Z=\binom{a+b+1}{k+1}.
\]

Then

\[
q_{k+1}=\frac{(b+1)U+(a+1)V}{(k+1)(Z+U+V)}.
\]

Using the consecutive-binomial identities and clearing the positive
factor `k+1`, the cross product for
`q_(k+1) >= q_(k+2)` is

\[
\begin{aligned}
&(k+1)Z\{b(b+1)U+a(a+1)V\}\\
&\quad +(b+1)U^2(a-k)+(a+1)V^2(b-k)\\
&\quad +UVP(a,b,k),
\end{aligned}
\]

where

\[
\begin{aligned}
P={}&a^2k+2a^2-2abk-2ab-ak+a\\
   &+b^2k+2b^2-bk+b-2k.
\end{aligned}
\]

If `U,V > 0`, put `A=a-k` and `B=b-k`.  Both are nonnegative and

\[
P=k(A-B)^2+2(A^2-AB+B^2)+(k+1)(A+B)\ge0.
\]

If either `U` or `V` vanishes, the mixed term and its corresponding
inactive square vanish.  Every remaining term is nonnegative.  This
proves every adjacent comparison from rank three onward.

## Sharp subfamily

When `b=0`, the tree is a once-subdivided star on `a+3` vertices and

\[
q_r=\frac1{a+r+1},\qquad
\frac{q_r}{q_3}=\frac{a+4}{a+r+1}.
\]

For every fixed `r`, this ratio tends to one as `a` grows.  Thus an
all-tree theorem cannot have a uniform positive gap below `q3`.

## Replayable evidence

- producer `verify_two_arm_depth2_star_q3_envelope_root.py`
- producer SHA-256
  `FEE55652C3C24DC2C51F3F3EDEF66DEB86BD2537930673EF9C02C3A0EC1A80E9`
- report `two_arm_depth2_star_q3_envelope_exact_root_20260828.json`
- report SHA-256
  `034FD8EB6F175B42E2A635CB69EB851A3087486C932ACCF6E52D7BB8D9D59C0D`
- status
  `PASS_EXACT_ALL_RANK_TWO_ARM_DEPTH2_STAR_Q3_ENVELOPE_THEOREM`

The verifier also performs 166,532 literal subset checks and
4,019,601 exact closed-form rank comparisons.

## Scope boundary

This proves the all-rank envelope for exactly the two-arm depth-two
family.  Trees with many arms can fail adjacent monotonicity, as the
uniform 18-arm subdivided star does.  The arbitrary-tree envelope and
Erdos Problem 993 remain open.
