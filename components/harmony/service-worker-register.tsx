"use client";

import { registerServiceWorker } from "@/components/harmony/service-worker";
import { logError } from "@/lib/logging";
import { useEffect } from "react";

const ServiceWorkerRegister = () => {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      registerServiceWorker().catch((error) => {
        logError("service_worker.register", error);
      });
    }
  }, []);

  return null;
};

export default ServiceWorkerRegister;
