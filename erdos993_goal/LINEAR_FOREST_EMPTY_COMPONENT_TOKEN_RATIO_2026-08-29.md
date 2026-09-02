# Empty-component refinement of the linear-forest token bound

Date: 2026-08-29

Let `L` be a disjoint union of `c>=1` nonempty paths on `M` vertices, and
suppose at least `s` components have at least two vertices.  At a supported
rank `j`, put

```text
G=M-2j+c,
E=2(c-j)_+ +(s-j)_+,
G*=G-E.
```

Then the one-edge ratio satisfies

```text
q_j(L)=z_j/(j f_j) <= G*/(j+G*).                   (1)
```

Indeed, condition on a token allocation `k_i`.  At most `j` components are
nonempty, so at least `(c-j)_+` components contain no token.  Every empty
path contributes `n_i+1>=2` free gaps.  After all `c-s` one-vertex paths
have been used as the cheapest empty components, each further empty path
contributes at least one additional gap.  Thus the empty components contain
at least `E` of the fixed total `G` free gaps.

The empty components contribute zero to

```text
sum_i k_i g_i/(k_i+g_i).
```

Applying the frozen parallel-sum identity only to active components bounds
this by `j(G-E)/(j+G-E)`.  The function is increasing in the active free-gap
mass, and averaging over token allocations proves (1).

The exact replay checked 780 bounded linear forests,
5274 supported ranks, and
40590 token allocations.

This is an all-order structural theorem.  It does not by itself prove the
terminal Newton m=0 sign or Erdos Problem 993.

Replay:

```powershell
python .\prove_linear_forest_empty_component_token_ratio_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_LINEAR_FOREST_EMPTY_COMPONENT_TOKEN_RATIO
```
