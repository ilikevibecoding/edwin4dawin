"""Independent replay ("audit") implementation for the Erdős #993 toolkit.

Nothing in this package imports from :mod:`erdos993lib`.  Every algorithm here
is deliberately different from the one used by the main library:

* :mod:`audit.indpoly_audit` -- independence polynomials by the vertex
  deletion recursion ``I(G) = I(G - v) + x I(G - N[v])`` memoised on vertex
  bitmasks (works for arbitrary graphs), instead of the rooted in/out tree DP.
* :mod:`audit.trees_audit` -- free trees by generating *all* rooted trees with
  the Beyer-Hedetniemi successor algorithm and de-duplicating with a canonical
  form rooted at the centre(s), instead of the Wright-Richmond-Odlyzko-McKay
  free-tree generator; forests as multisets of trees.
* :mod:`audit.checks_audit` -- unimodality, log-concavity, ``L``, WR, ISO and
  TAIL written directly from their definitions.

The two implementations are cross-checked by ``scripts/audit_independent.py``
and ``tests/test_audit.py``.
"""
