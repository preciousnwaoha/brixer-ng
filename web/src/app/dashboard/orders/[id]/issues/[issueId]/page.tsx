import { IssueForm } from "@/components/orders/issue-form";
export default async function IssuePage({ params }: { params: Promise<{ id: string; issueId: string }> }) {
  const { id, issueId } = await params;
  return <IssueForm orderId={id} issueId={issueId} />;
}
