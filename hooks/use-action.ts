import { useAction } from "convex/react";
import { FunctionReference } from "convex/server";
import { useCallback, useMemo, useState } from "react";

type Options<ResponseType> = {
  onSuccess?: (data: ResponseType) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
  throwError?: boolean;
};

type Status = "success" | "error" | "pending" | "settled" | null;

export const useExecute = <T extends FunctionReference<"action">>(
  endpoint: T,
) => {
  const [data, setData] = useState<T["_returnType"] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<Status>(null);

  const isPending = useMemo(() => status === "pending", [status]);
  const isSuccess = useMemo(() => status === "success", [status]);
  const isError = useMemo(() => status === "error", [status]);
  const isSettled = useMemo(() => status === "settled", [status]);

  const action = useAction(endpoint);

  const execute = useCallback(
    async (args: T["_args"], options?: Options<T["_returnType"]>) => {
      try {
        setData(null);
        setError(null);
        setStatus("pending");

        const response = await action(args);
        setData(response);
        setStatus("success");
        options?.onSuccess?.(response);

        return response;
      } catch (err) {
        setError(err as Error);
        setStatus("error");
        options?.onError?.(err as Error);
        if (options?.throwError) throw err;
      } finally {
        setStatus("settled");
        options?.onSettled?.();
      }
    },
    [action],
  );

  return {
    execute,
    data,
    error,
    isPending,
    isSuccess,
    isError,
    isSettled,
  };
};