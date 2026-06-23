// Auto-generated file

import { lazy } from "react";

const SCREEN_COMPONENTS: Record<string, React.ComponentType> = {
  "signup-id": lazy(() => import("@/screens/signup-id"))
};

export const getScreenComponent = (
  screenName: string | undefined
): React.ComponentType | null => {
  if (!screenName) {
    return null;
  }
  return SCREEN_COMPONENTS[screenName] || null;
};
