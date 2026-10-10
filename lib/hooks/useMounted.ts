import { useEffect, useState } from "react";

// A small hook, that is used to solve a hydration error, it checks if the component is mounted on the client side.
export function useMounted() {
  const [mounted, setMounted] = useState(false);  // state to store if mounted
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);     
  }, []); // empty array means it runs once after mount, exactly what we want
  return mounted;
}