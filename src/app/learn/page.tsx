import { Suspense } from "react";
import { LearningWorkspace } from "@/components/learning/learning-workspace";

async function LearnContent({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <LearningWorkspace initialMode={mode === "test" ? "test" : "memory"} />;
}

export default function LearnPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  return <Suspense fallback={<main className="p-8">正在加载词汇…</main>}><LearnContent searchParams={searchParams} /></Suspense>;
}
