import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StoryCard } from "@/components/StoryCard";
import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function StoriesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    api.getMyRoles().then((roles: string[]) => {
      setIsAdmin(roles.includes("admin"));
    }).catch(() => setIsAdmin(false));
  }, [user]);

  const deleteStory = useMutation({
    mutationFn: (storyId: string) => api.deleteStory(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["recent-stories"] });
      toast.success("Story deleted");
    },
    onError: () => toast.error("Failed to delete story"),
  });

  const { data: stories, isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: () => api.getStories(),
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
            {stories.map((story: any) => (
              <StoryCard
                key={story.id}
                story={story}
                authorName={story.author_name}
                commentCount={story.comment_count || 0}
                showDelete={isAdmin}
                deleting={deleteStory.isPending}
                onDelete={(storyId) => deleteStory.mutate(storyId)}
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
