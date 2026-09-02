# Linear-forest coefficient ceiling from a forced matching

Date: 2026-08-29

Let a linear forest have `T` vertices and `c` nonempty path components of
orders `n_i`.  Its matching number satisfies

```text
sum floor(n_i/2) >= ceil((T-c)/2)=m.                (1)
```

Choose any `m` disjoint edges.  Every independent set of the full forest is
an independent set of the spanning subgraph consisting of those `m` edges
and `T-2m` isolated vertices.  Hence, coefficientwise,

```text
I_F(x) <= (1+2x)^m (1+x)^(T-2m).                   (2)
```

This applies in particular to every d=1 deep-tail row `K` with `c=Y`.
The bounded replay checked 9330 literal forests
and 107775 coefficients.

This is only a linear-forest row ceiling; terminal-payment signs and Erdos
Problem 993 remain separate.
