export const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) {
    console.log("Service Worker is not supported in this browser.");
    return;
  }
  await navigator.serviceWorker.register("/service-worker.js");
};

export const getReadyServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) {
    console.log("Service Worker is not supported in this browser.");
    return;
  }
  const registration = await navigator.serviceWorker.ready;
  return registration;
};