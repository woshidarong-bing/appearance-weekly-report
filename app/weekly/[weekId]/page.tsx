import WeeklyViewer from "@/components/WeeklyViewer";

export default async function HistoricalWeeklyPage({ params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = await params;
  return <WeeklyViewer weekId={weekId}/>;
}
