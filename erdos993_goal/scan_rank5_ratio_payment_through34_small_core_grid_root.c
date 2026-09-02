#define scan_ratio_payment scan_ratio_payment_diagonal_unused
#include "scan_rank5_ratio_payment_order28_small_cores_root.c"
#undef scan_ratio_payment

/* Exact finite strong-payment grid for core orders 1..19 through order 34. */

#define SIBLING_SLOTS 33

static u64 grid34_trees[MAX_ORDER + 1];
static u64 grid34_roots[MAX_ORDER + 1][SIBLING_SLOTS];
static u64 grid34_negative[MAX_ORDER + 1][SIBLING_SLOTS];
static i128 grid34_minimum[MAX_ORDER + 1][SIBLING_SLOTS];
static unsigned char grid34_minimum_set[MAX_ORDER + 1][SIBLING_SLOTS];
static u64 grid34_witness_tree[MAX_ORDER + 1][SIBLING_SLOTS];
static int grid34_witness_root[MAX_ORDER + 1][SIBLING_SLOTS];
static u64 grid34_witness_window[MAX_ORDER + 1][SIBLING_SLOTS][5];
static int grid34_registered = 0;

static void report_grid34(void)
{
    u64 total_tree_rows = 0, total_root_rows = 0, total_negative = 0;
    puts("core_order,siblings,total_order,trees,roots,negative,min_margin,witness_tree,witness_root,a,b,d,e,f");
    for (int order = 1; order <= MAX_ORDER; ++order)
    {
        int low = 10 - order;
        if (low < 0) low = 0;
        int high = 32 - order;
        for (int siblings = low; siblings <= high; ++siblings)
        {
            printf("%d,%d,%d,%llu,%llu,%llu,", order, siblings,
                   order + siblings + 2, grid34_trees[order],
                   grid34_roots[order][siblings], grid34_negative[order][siblings]);
            print_i128(grid34_minimum[order][siblings]);
            printf(",%llu,%d,%llu,%llu,%llu,%llu,%llu\n",
                   grid34_witness_tree[order][siblings],
                   grid34_witness_root[order][siblings],
                   grid34_witness_window[order][siblings][0],
                   grid34_witness_window[order][siblings][1],
                   grid34_witness_window[order][siblings][2],
                   grid34_witness_window[order][siblings][3],
                   grid34_witness_window[order][siblings][4]);
            total_tree_rows += grid34_trees[order];
            total_root_rows += grid34_roots[order][siblings];
            total_negative += grid34_negative[order][siblings];
        }
    }
    printf("TOTAL_ROWS,%llu,%llu,%llu\n", total_tree_rows, total_root_rows, total_negative);
    puts(total_negative == 0
         ? "PASS_EXACT_RANK5_RATIO_PAYMENT_THROUGH34_SMALL_CORE_GRID"
         : "FAIL_RANK5_RATIO_PAYMENT_THROUGH34_SMALL_CORE_GRID");
}

void scan_ratio_payment_grid34(FILE *output, int parent[], int order)
{
    (void)output;
    if (!grid34_registered)
    {
        if (atexit(report_grid34) != 0) abort();
        grid34_registered = 1;
    }
    current_order = order;
    memset(adjacency, 0, sizeof(adjacency));
    memset(done, 0, sizeof(done));
    memset(msg_excluded, 0, sizeof(msg_excluded));
    memset(msg_total, 0, sizeof(msg_total));
    for (int vertex = 2; vertex <= order; ++vertex)
    {
        int ancestor = parent[vertex];
        adjacency[vertex][ancestor] = 1;
        adjacency[ancestor][vertex] = 1;
    }
    message(1, 0);
    u64 core[LIMIT + 1];
    memcpy(core, msg_total[1][0], sizeof(core));

    u64 deleted_by_root[MAX_ORDER + 1][LIMIT + 1];
    memset(deleted_by_root, 0, sizeof(deleted_by_root));
    for (int root = 1; root <= order; ++root)
    {
        deleted_by_root[root][0] = 1;
        u64 temporary[LIMIT + 1];
        for (int neighbor = 1; neighbor <= order; ++neighbor)
        {
            if (!adjacency[root][neighbor]) continue;
            message(neighbor, root);
            poly_mul(deleted_by_root[root], msg_total[neighbor][root], temporary);
            memcpy(deleted_by_root[root], temporary, sizeof(temporary));
        }
    }

    u64 tree_index = grid34_trees[order]++;
    int low = 10 - order;
    if (low < 0) low = 0;
    int high = 32 - order;
    for (int siblings = low; siblings <= high; ++siblings)
    {
        u64 d = smoothed(core, siblings, 3);
        u64 e = smoothed(core, siblings, 4);
        u64 f = smoothed(core, siblings, 5);
        for (int root = 1; root <= order; ++root)
        {
            u64 a = e + deleted_by_root[root][3];
            u64 b = f + deleted_by_root[root][4];
            i128 margin = ratio_payment_margin(a, b, d, e, f);
            ++grid34_roots[order][siblings];
            if (margin < 0) ++grid34_negative[order][siblings];
            if (!grid34_minimum_set[order][siblings]
                || margin < grid34_minimum[order][siblings])
            {
                grid34_minimum_set[order][siblings] = 1;
                grid34_minimum[order][siblings] = margin;
                grid34_witness_tree[order][siblings] = tree_index;
                grid34_witness_root[order][siblings] = root;
                grid34_witness_window[order][siblings][0] = a;
                grid34_witness_window[order][siblings][1] = b;
                grid34_witness_window[order][siblings][2] = d;
                grid34_witness_window[order][siblings][3] = e;
                grid34_witness_window[order][siblings][4] = f;
            }
        }
    }
}
