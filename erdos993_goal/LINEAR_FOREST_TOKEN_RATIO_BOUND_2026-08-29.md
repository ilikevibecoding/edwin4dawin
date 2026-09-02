# Linear-forest token-sliding ratio bound

Date: 2026-08-29

Let `L` be a disjoint union of `c>=1` nonempty paths on a total of `M`
vertices.  Let `f_j=i_j(L)` and let `z_j` count `(j+1)`-sets inducing
exactly one edge.  At every supported rank,

```text
q_j(L)=z_j/(j f_j) <= (M-2j+c)/(M-j+c).             (1)
```

To prove (1), condition on the numbers `k_i` of selected vertices in the
path components.  Put `g_i=n_i-2k_i+1`.  A hard-particle configuration on
that path is a weak composition of `g_i` into `k_i+1` gaps.  A specified gap
is positive with probability `g_i/(g_i+k_i)`, hence half the mean directed
token-slide degree in this allocation is

```text
sum_i k_i g_i/(k_i+g_i).                            (2)
```

The exact two-pair identity

```text
(a+c)(b+d)/(a+b+c+d)-ab/(a+b)-cd/(c+d)
=(ad-bc)^2/((a+b)(c+d)(a+b+c+d)) >=0               (3)
```

iterates to bound (2) by `jG/(j+G)`, where
`G=sum_i g_i=M-2j+c`.  Each one-edge set is exactly an undirected edge of
the token-sliding graph, so division by `j` gives (1).  The value of `G` is
the same in every token allocation, and averaging preserves the bound.

The exact replay checked 780 bounded linear forests,
5274 supported ranks, and
40590 token allocations directly against the
zero/one-edge polynomial rows.

This is an all-order structural theorem.  It does not by itself prove the
terminal Newton `m=0` sign, the full terminal-payment theorem, or Erdos
Problem 993.

Replay:

```powershell
python .\prove_linear_forest_token_ratio_bound_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_LINEAR_FOREST_TOKEN_RATIO_BOUND
```
