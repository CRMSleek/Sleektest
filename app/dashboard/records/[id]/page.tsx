import { DynamicRecordPage } from "@/components/dashboard/crm-platform-workspace"

type PageProps = { params: Promise<{ id: string }> }

export default async function RecordDetailPage({ params }: PageProps) {
  const { id } = await params
  return <DynamicRecordPage recordId={id} />
}
