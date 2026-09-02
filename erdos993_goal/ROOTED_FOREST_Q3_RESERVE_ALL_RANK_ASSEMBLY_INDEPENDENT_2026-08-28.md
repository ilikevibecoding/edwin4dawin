# All-rank rooted-forest q3 reserve

Date: 2026-08-28

Status: **proved for every finite rooted forest and every rank `j>=3`.**

Let `F` be a finite forest with one distinguished root in each component,
let `H=F-roots`, and put

```text
f_t=i_t(F),  h_t=i_t(H),  K_2=2f_2-s_2(F).
```

Then for every integer `j>=3`,

```text
[2(j+1)h_2+(j-2)K_2]f_j >= 6h_jf_2.                (R_j)
```

The fail-closed coverage is:

- `j=3`: the corrected exact rank-3 theorem;
- `j=4`: the exact analytic rank-4 theorem;
- `j=5`: the direct coefficient-domination theorem;
- `j>=6`: the corrected high-rank reduction on cores with no isolated root
  component;
- every `j>=3`: the corrected isolated-distinguished-root preservation lemma.

Every pinned dependency uses the exact bound

```text
h_2=C(M-1,2)+D-1>=C(M-1,2)+c-1.
```

No artifact containing the superseded off-by-one `+c` bound is imported.

This assembly proves only the abstract rooted-forest reserve `(R_j)`.  It does
not by itself prove terminal-support preservation, the complete two-block
payment, the all-tree `q_r<=q_3` envelope, the forest independence-polynomial
conjecture, or Erdos Problem 993.
