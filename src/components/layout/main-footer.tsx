import { MainFooter as MainFooterClient } from "./main-footer-client";
import { getCurrentUser } from "@/lib/auth/currentUser";

export async function MainFooter() {
  const currentUser = await getCurrentUser();
  const isAuthenticated = !!currentUser;
  
  return <MainFooterClient isAuthenticated={isAuthenticated} />;
}
