# Balanced subdivided-star one-centre path floor

Date: 2026-08-29

Let the balanced centre degrees be `r_i in {q,q+1}`, where
`R=dq+s`, `0<=s<d`.  Let `y_i` be the number of occupied arms at centre `i`
and `Y=sum y_i`.

The frozen occupancy-sector theorem gives, inside `E=F-H`, the exactly-one-
centre sector

```text
x K_i^0 product_(k!=i) H_k^0
=x(1+x)^(R-Y-r_i+2y_i)(1+2x)^(Y-y_i).             (1)
```

The two exponents in (1) are nonnegative: the unoccupied arms outside centre
`i` number `(R-Y)-(r_i-y_i)>=0`.  After the selected centre contributes the
leading `x`, the remaining factor is the independence row of a linear forest
on exactly

```text
(R-Y-r_i+2y_i)+2(Y-y_i)=R+Y-r_i                  (2)
```

vertices.  Endpoint joining obeys

```text
P_aP_b-P_(a+b)=x^2P_(a-2)P_(b-2)>=coeff 0,         (3)
```

so every such linear-forest row coefficientwise dominates the path row on
the same number of vertices.  Summing (1) over the `s` degree-`q+1` centres
and the `d-s` degree-`q` centres proves the simultaneous all-rank floor

```text
F-H >=coeff x{s P_(R+Y-q-1)+(d-s)P_(R+Y-q)}.       (4)
```

The shifts in (2)-(4) are exact.  The bound is independent of the occupancy
histogram.  It is an all-order structural lemma only; positivity of the final
retained-`h_(j-1)` scalar combination, terminal Newton `m=0`, and Erdos
Problem 993 still require separate proofs.

Replay:

```powershell
python .\prove_balanced_subdivided_star_one_center_path_floor_adversary.py
```

Required marker:

```text
PASS_EXACT_ALL_ORDER_BALANCED_ONE_CENTER_PATH_FLOOR
```
