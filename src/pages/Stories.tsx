import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) {
          setIsAdmin(false);
          return;
        }
        setIsAdmin((data || []).some((r) => r.role === "admin"));
      });
  }, [user]);

  const deleteStory = useMutation({
    mutationFn: async (storyId: string) => {
      const { error } = await supabase.from("stories").delete().eq("id", storyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["recent-stories"] });
      toast.success("Story deleted");
    },
    onError: () => toast.error("Failed to delete story"),
  });

  const { data: stories, isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*, comments(count)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set(data.filter(s => s.user_id).map(s => s.user_id))];
      let profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);
      }
      return data.map(s => ({
        ...s,
        author_name: s.user_id
          ? profileMap.get(s.user_id) || "Anonymous"
          : (s as any).guest_name || "Guest",
      }));
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
                authorName={story.author_name}
                commentCount={(story.comments as any)?.[0]?.count || 0}
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
