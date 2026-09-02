#!/usr/bin/env python3
"""Search exact diagonal embeddings of consecutive mixed kernels."""

from probe_mixed_confluent_kernel import mixed_kernel


def diagonal_equivalent(a, b):
    n = len(a)
    if any(a[i][j] == 0 or b[i][j] == 0 for i in range(n) for j in range(n)):
        return False
    base = b[0][0] / a[0][0]
    row_scale = [b[i][0] / a[i][0] / base for i in range(n)]
    col_scale = [b[0][j] / a[0][j] for j in range(n)]
    return all(
        b[i][j] == base * row_scale[i] * col_scale[j] * a[i][j]
        for i in range(n)
        for j in range(n)
    )


def submatrix(a, rows, columns):
    return [[a[i][j] for j in columns] for i in rows]


def main():
    for q in range(3, 11):
        small = mixed_kernel(q - 1)
        large = mixed_kernel(q)
        hits = []
        for delete_row in range(q):
            rows = [i for i in range(q) if i != delete_row]
            for delete_column in range(q):
                columns = [j for j in range(q) if j != delete_column]
                candidate = submatrix(large, rows, columns)
                if diagonal_equivalent(candidate, small):
                    hits.append((delete_row, delete_column, "direct"))
                reversed_candidate = [row[::-1] for row in candidate[::-1]]
                if diagonal_equivalent(reversed_candidate, small):
                    hits.append((delete_row, delete_column, "reverse"))
        print(f"q={q} hits={hits}")


if __name__ == "__main__":
    main()
