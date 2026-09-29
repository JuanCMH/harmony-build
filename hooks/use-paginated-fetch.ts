import { usePaginatedQuery } from "convex/react";
import type {
  FunctionArgs,
  FunctionReference,
  PaginationOptions,
  PaginationResult,
} from "convex/server";

// `any` es la forma en que Convex tipa «cualquier fila»; la concreta sale de `T`.
type PaginatedQuery = FunctionReference<
  "query",
  "public",
  { paginationOpts: PaginationOptions },
  PaginationResult<any>
>;

/**
 * Una consulta paginada, con la misma forma que `useFetch`.
 *
 * `args` va sin `paginationOpts` —los pone Convex— y acepta `"skip"`.
 * `loadMore` trae la página siguiente; `canLoadMore` dice si la hay.
 */
export const usePaginatedFetch = <T extends PaginatedQuery>(
  endpoint: T,
  args: Omit<FunctionArgs<T>, "paginationOpts"> | "skip",
  pageSize: number,
) => {
  const { results, status, loadMore } = usePaginatedQuery(
    endpoint,
    args as Parameters<typeof usePaginatedQuery<T>>[1],
    { initialNumItems: pageSize },
  );

  return {
    data: results as T["_returnType"]["page"],
    isLoading: status === "LoadingFirstPage",
    isLoadingMore: status === "LoadingMore",
    canLoadMore: status === "CanLoadMore",
    loadMore: () => loadMore(pageSize),
  };
};
