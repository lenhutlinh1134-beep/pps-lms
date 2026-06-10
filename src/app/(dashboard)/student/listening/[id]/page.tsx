import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/auth";
import { getTopic, topicsMeta } from "@/lib/listening-data";
import { ListeningStudio } from "@/components/listening/ListeningStudio";

export const dynamic = "force-dynamic";

export default async function ListeningTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("student");
  const topic = getTopic(id);
  if (!topic) notFound();

  return (
    <ListeningStudio
      topic={topic}
      topics={topicsMeta}
      basePath="/student/listening"
      backHref="/student"
    />
  );
}
