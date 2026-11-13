import { PublicShell } from "@/components/layout/public-shell";
import { CartScreen } from "@/components/cart/cart-screen";
export default function CartPage() {
  return (
    <PublicShell>
      <main className="shell max-w-4xl py-16 sm:py-20">
        <h1 className="display-title mb-8 text-4xl font-bold text-primary">
          Review your services.
        </h1>
        <CartScreen />
      </main>
    </PublicShell>
  );
}
