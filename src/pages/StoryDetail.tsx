import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { ChevronUp, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function StoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: story, isLoading } = useQuery({
    queryKey: ["story", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*, profiles(display_name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles(display_name)")
        .eq("story_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("comments").insert({
        story_id: id!,
        user_id: user!.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      toast.success("Comment added");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  const handleVote = async () => {
    if (!user) return toast.error("Sign in to vote");
    const { error } = await supabase.from("votes").upsert({
      user_id: user.id,
      story_id: id!,
      vote_type: 1,
    });
    if (!error) {
      // Update upvote count
      const { count } = await supabase
        .from("votes")
        .select("*", { count: "exact", head: true })
        .eq("story_id", id!);
      await supabase.from("stories").update({ upvotes: count || 0 }).eq("id", id!);
      queryClient.invalidateQueries({ queryKey: ["story", id] });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <div className="h-8 w-2/3 animate-pulse rounded bg-secondary mb-4" />
          <div className="h-40 animate-pulse rounded bg-secondary" />
        </main>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Story not found</h1>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <article>
          <div className="flex items-start gap-4 mb-6">
            <button
              onClick={handleVote}
              className="flex flex-col items-center gap-1 pt-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronUp className="h-5 w-5" />
              <span className="text-sm font-bold">{story.upvotes || 0}</span>
            </button>
            <div>
              {story.media_outlet && (
                <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">
                  {story.media_outlet}
                </span>
              )}
              <h1 className="font-display text-3xl font-black leading-tight">{story.title}</h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                <span>{story.profiles?.display_name || "Anonymous"}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6">
            <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">{story.content}</p>
          </div>
        </article>

        {/* Comments */}
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Comments ({comments?.length || 0})
          </h2>

          {user && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (comment.trim()) addComment.mutate(comment.trim());
              }}
              className="mb-8"
            >
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add your comment..."
                className="bg-secondary border-border mb-3"
                maxLength={2000}
              />
              <Button type="submit" variant="hero" size="sm" disabled={addComment.isPending || !comment.trim()}>
                Post Comment
              </Button>
            </form>
          )}

          <div className="space-y-4">
            {comments?.map((c) => (
              <div key={c.id} className="border-l-2 border-border pl-4 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-foreground">{c.profiles?.display_name || "Anonymous"}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-sm text-foreground/80">{c.content}</p>
              </div>
            ))}
            {(!comments || comments.length === 0) && (
              <p className="text-sm text-muted-foreground">No comments yet. Be the first to speak up.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
