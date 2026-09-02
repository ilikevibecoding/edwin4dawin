# The all-tree `q3 <= q2` theorem

Date: 2026-08-28

Status: **proved for every finite tree, with an independent exact audit**.

## Statement

For a finite tree `T`, let `i_r(T)` be the number of independent
`r`-vertex sets and let `s_r(T)` be the number of `(r+1)`-vertex sets
inducing exactly one edge.  Let `m2(T)` be the number of two-edge
matchings.  Then

\[
\boxed{3m_2(T)i_3(T)-i_2(T)s_3(T)\ge 0.}
\]

Since `s_2=2m2`, whenever `i_3(T)>0` this is exactly

\[
\boxed{
q_3(T)=\frac{s_3(T)}{3i_3(T)}
\le
q_2(T)=\frac{s_2(T)}{2i_2(T)}
=\frac{m_2(T)}{i_2(T)}.}
\]

## Exact counting reduction

Put

\[
A=\sum_v\binom{d(v)}2,
\qquad
e=\sum_v\binom{d(v)-1}2=A-(n-2),
\]

and let `T4` count connected induced four-vertex subtrees.  Write

\[
\tau=T_4-(n-3).
\]

The identities used below are

\[
i_2=\binom{n-1}2,
\qquad
m_2=\binom{n-2}2-e,
\]

\[
i_3=\binom{n-2}3+e,
\qquad
s_3=3\binom{n-3}3-2(n-4)e+3\tau.
\tag{1}
\]

Here is a direct derivation.  Edge inclusion-exclusion on triples gives

\[
i_3=\binom n3-(n-1)(n-2)+A.
\]

For four-sets, let `N_j` count sets inducing `j` edges.  Because an
induced subgraph of a tree is a forest, `j` ranges from zero through
three, and

\[
N_1=\sum_j jN_j-2\sum_j\binom j2N_j
       +3\sum_j\binom j3N_j.
\]

The three sums are respectively

\[
(n-1)\binom{n-2}2,
\qquad
A(n-3)+m_2,
\qquad
T_4.
\]

Substitution gives (1).  Finally,

\[
T_4=\sum_{uv\in E(T)}(d(u)-1)(d(v)-1)
      +\sum_v\binom{d(v)}3=n-3+\tau,
\]

so this `tau` is exactly the coordinate in the independently audited
rank-four path-surplus theorem.

## All-order inequality

For every tree of order `n >= 15`, the pinned rank-four theorem gives

\[
\tau\le\frac{n-1}{3}e.
\tag{2}
\]

Let

\[
M=3m_2i_3-i_2s_3.
\]

After substituting (1), write `U(n,e)` for the value of `M` at equality
in (2).  Exact simplification gives

\[
M=U(n,e)+\binom{n-1}{2}\bigl((n-1)e-3\tau\bigr),
\tag{3}
\]

where

\[
4U=-12e^2+4en^2-36en+56e
     +n^4-8n^3+17n^2+2n-24.
\tag{4}
\]

The second term of (3) is nonnegative by (2).

If `T` is not a star, the nonnegative integers `x_v=d(v)-1` sum to
`n-2` and satisfy `max x_v <= n-3`.  Convex concentration therefore
gives

\[
0\le e=\sum_v\binom{x_v}2\le E:=\binom{n-3}2.
\]

The quadratic (4) is concave in `e`, and its endpoint values are

\[
U(n,0)=\frac{(n-4)(n-3)(n-2)(n+1)}4,
\]

\[
U(n,E)=\frac{(n-5)(n-4)(n-3)}2.
\]

Both are positive for `n >= 15`.  The following cleared identity makes
the endpoint argument completely algebraic:

\[
E U(n,e)
=(E-e)U(n,0)+eU(n,E)+3Ee(E-e)\ge0.
\]

Thus `M >= 0` for every nonstar of order at least 15.  If `T` is the
star, then `m2=s3=0`, so `M=0` directly.

Orders 4 through 14 are covered by complete literal enumeration of all
5,444 unlabeled trees.  The producer recomputed `i2`, `i3`, `m2`, and
`s3` directly from subsets and edge pairs, checking 6,619,116 subsets
and 379,012 edge pairs.  No negative margin occurred.

## Replayable evidence

Primary verifier:

- `verify_all_tree_q3_q2_theorem_root.py`
- SHA-256
  `9DCD97C0BEB373CB5B2EBDA7A9A2E7F30D730FA45EEF219FAB4EF3FE03C8E1F7`
- report `all_tree_q3_q2_theorem_exact_root_20260828.json`
- report SHA-256
  `6013B83860C4A5B9FC58CEA07762CA51A5CE908AC2F6849FB7EE7383F26F4A74`
- status `PASS_EXACT_ALL_TREE_Q3_AT_MOST_Q2_THEOREM`

Pinned all-order input:

- `RANK4_TREE_PATH_SURPLUS_RESERVE_THEOREM_2026-08-26.md`
- producer report status
  `PASS_EXACT_RANK4_TREE_PATH_SURPLUS_RESERVE_N15_PLUS`
- independent report status
  `PASS_INDEPENDENT_RANK4_TREE_PATH_SURPLUS_RESERVE_AUDIT`

Independent verifier:

- `audit_general_tree_q3_q2_rank4_bridge_independent_agent.py`
- SHA-256
  `DAAB84496BAC8FF2B1C8169DB3E51EAABA5E3F31578DEC9D1D5E992204E1561B`
- report
  `general_tree_q3_q2_rank4_bridge_independent_audit_20260828.json`
- report SHA-256
  `A4A2806A0DF06F255EAD8CB8529F690B8D2C04A6C2CDF4CD32735090941F3C42`
- status
  `PASS_INDEPENDENT_EXACT_ALL_TREE_Q3_AT_MOST_Q2_RANK4_BRIDGE_AUDIT`

The auditor did not import or execute the producer.  It independently
rebuilt every counting identity and the concave-quadratic payment, pinned
the complete rank-four dependency chain, and reproduced the producer's
order-4-through-14 value-stream hash exactly.

Replay:

```powershell
python .\verify_all_tree_q3_q2_theorem_root.py
```

## Scope boundary

This proves the `q3 <= q2` endpoint for every tree.  It does **not** yet
prove `q_r <= q3` for every `r >= 4`, the full averaged token-surplus
inequality, or Erdos Problem 993.
