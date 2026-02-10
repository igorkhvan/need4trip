import { MainFooter as MainFooterClient } from "./main-footer-client";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { isSoftBetaStrict } from "@/lib/config/paywall";

export async function MainFooter() {
  const currentUser = await getCurrentUser();
  const isAuthenticated = !!currentUser;
  const betaStrict = isSoftBetaStrict();
  
  return <MainFooterClient isAuthenticated={isAuthenticated} betaStrict={betaStrict} />;
}
