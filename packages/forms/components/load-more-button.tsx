import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface LoadMoreButtonProps {
  canLoadMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

/** «Cargar más» bajo una tabla paginada. Mientras trae la página siguiente
 *  sigue en su sitio, girando: si desapareciera, la tabla saltaría. */
export const LoadMoreButton = ({
  canLoadMore,
  isLoadingMore,
  onLoadMore,
}: LoadMoreButtonProps) =>
  canLoadMore || isLoadingMore ? (
    <div className="flex justify-center">
      <Button
        variant="outline"
        size="sm"
        disabled={isLoadingMore}
        onClick={onLoadMore}
      >
        {isLoadingMore ? <Loader2 className="animate-spin" /> : null}
        Cargar más
      </Button>
    </div>
  ) : null;
