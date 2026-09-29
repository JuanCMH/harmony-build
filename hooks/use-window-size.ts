import { useEffect, useState } from "react";

export function useWindowSize() {
  const [width, setWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }

    if (typeof window !== "undefined") {
      setWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
    }

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}


