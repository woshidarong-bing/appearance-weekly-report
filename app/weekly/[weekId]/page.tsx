import WeeklyViewer from "@/components/WeeklyViewer";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ weekId: "_" }];
}

export default async function HistoricalWeeklyPage({ params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = await params;
  return <WeeklyViewer weekId={weekId}/>;
}
