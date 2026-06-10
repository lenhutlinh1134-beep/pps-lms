import { notFound } from "next/navigation";
import { getTopic, listeningTopics, topicsMeta } from "@/lib/listening-data";
import { ListeningStudio } from "@/components/listening/ListeningStudio";

export function generateStaticParams() {
  return listeningTopics.map((t) => ({ id: t.id }));
}

export default async function DemoTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const topic = getTopic(id);
  if (!topic) notFound();

  return (
    <ListeningStudio
      topic={topic}
      topics={topicsMeta}
      basePath="/demo"
      backHref="/"
    />
  );
}
