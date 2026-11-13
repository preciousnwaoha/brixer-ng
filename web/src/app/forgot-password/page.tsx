import { AccountActions } from "@/components/auth/account-actions";
import { Logo } from "@/components/ui/logo";
import { loginPortal } from "@/lib/auth-routing";
export default async function ForgotPassword({ searchParams }: { searchParams: Promise<{ email?: string; portal?: string; next?: string }> }) {
  const query = await searchParams;
  return <main className="grid min-h-screen place-items-center bg-alt-mint p-5"><section className="w-full max-w-md rounded-3xl bg-white p-8"><Logo /><h1 className="mt-7 text-3xl font-bold text-primary">Reset your password.</h1><AccountActions mode="recover" initialValue={query.email} portal={loginPortal(query.portal)} next={query.next} /></section></main>;
}
