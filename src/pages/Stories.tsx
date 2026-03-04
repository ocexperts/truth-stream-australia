import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoryCard } from "@/components/StoryCard";
import { Header } from "@/components/Header";

export default function StoriesPage() {
  const { data: stories, isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*, profiles(display_name), comments(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-2 font-display text-4xl font-black">All Stories</h1>
        <p className="mb-10 text-muted-foreground">
          Real experiences from real Australians with the media.
        </p>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded bg-secondary" />
            ))}
          </div>
        ) : stories && stories.length > 0 ? (
          <div className="space-y-4">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                authorName={story.profiles?.display_name || "Anonymous"}
                commentCount={(story.comments as any)?.[0]?.count || 0}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No stories yet. Be the first to share.</p>
        )}
      </main>
    </div>
  );
}
