import { getCatalogue } from "@/lib/catalogue";
import { ServiceGrid } from "@/components/services/service-grid";
export default async function NewOrderPage() {
  const services = await getCatalogue();
  return (
    <section className="pb-20">
      {/* <h2 className="mb-3 text-2xl font-extrabold text-primary">
        Choose your services
      </h2> */}
      {/* <p className="mb-7 text-sm text-muted">
        Select the services you need, then continue to review your order.
      </p> */}
      <ServiceGrid services={services} />
    </section>
  );
}
