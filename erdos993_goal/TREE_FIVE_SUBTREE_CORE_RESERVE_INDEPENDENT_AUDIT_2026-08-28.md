# Independent audit of the tree five-subtree core reserve

Date: 2026-08-28

Status: **independent exact audit passed.**

The fail-closed auditor

```text
audit_tree_five_subtree_core_reserve_independent_agent.py
```

reconstructed the three-shape decomposition, the nonleaf-core identity, the
maximum-weight argument, and the moment/Cauchy bound without importing the
producer.  It replayed all 205,002 unlabeled trees through order 18, including
204,986 nonstars and 1,625,160 core edges, and literally partitioned connected
five-subsets through order 11.

Its ordered value stream exactly matched the frozen producer stream:

```text
2E4B575C110FFEDA296030FBABA68042D9506D62A82DBE99CF210B08764E78F3.
```

The audit status is

```text
PASS_INDEPENDENT_EXACT_ALL_ORDER_TREE_FIVE_SUBTREE_CORE_RESERVE_AUDIT.
```

The structural theorem remains scoped to the five-subtree reserve and its
two companion coordinate bounds; it does not by itself prove `q4<=q3` or
Erdos Problem 993.
