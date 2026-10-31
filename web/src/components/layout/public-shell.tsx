import type { ReactNode } from "react";
import { Header } from "./header";
import { Footer } from "./footer";

export function PublicShell({ children }: { children: ReactNode }) {
  return <><Header /><main>{children}</main><Footer /></>;
}
