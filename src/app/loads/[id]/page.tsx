import { LoadDetailsPageClient } from "@/components/classifieds/LoadDetailsPageClient";

export default async function LoadDetailsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LoadDetailsPageClient id={id} />;
}
