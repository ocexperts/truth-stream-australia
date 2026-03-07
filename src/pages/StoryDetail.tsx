import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { ChevronUp, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

function OriginalContentToggle({ originalTitle, originalContent, currentTitle }: { originalTitle?: string; originalContent: string; currentTitle: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 border border-border rounded">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>This story was edited by a moderator — view original</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border px-4 py-4 bg-secondary/30">
          {originalTitle && originalTitle !== currentTitle && (
            <h4 className="font-display font-bold mb-2 text-sm text-muted-foreground">
              Original title: {originalTitle}
            </h4>
          )}
          <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
            {originalContent}
          </p>
        </div>
      )}
    </div>
  );
}

export default function StoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
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

  const { data: story, isLoading } = useQuery({
    queryKey: ["story", id],
    queryFn: () => api.getStory(id!),
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", id],
    queryFn: () => api.getComments(id!),
    enabled: !!id,
  });

  const addComment = useMutation({
    mutationFn: (content: string) => api.createComment(id!, content),
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      toast.success("Comment added");
    },
    onError: () => toast.error("Failed to add comment"),
  });

  const deleteStory = useMutation({
    mutationFn: () => api.deleteStory(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["recent-stories"] });
      toast.success("Story deleted");
      navigate("/stories");
    },
    onError: () => toast.error("Failed to delete story"),
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: string) => api.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      toast.success("Comment deleted");
    },
    onError: () => toast.error("Failed to delete comment"),
  });

  const handleVote = async () => {
    if (!user) return toast.error("Sign in to vote");
    try {
      await api.vote(id!);
      queryClient.invalidateQueries({ queryKey: ["story", id] });
    } catch {
      toast.error("Failed to vote");
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
                <span>{story.author_name}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}</span>
              </div>
              {isAdmin && (
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteStory.mutate()}
                    disabled={deleteStory.isPending}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete Story
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-border pt-6">
            <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">{story.content}</p>
            {story.original_content && story.original_content !== story.content && (
              <OriginalContentToggle
                originalTitle={story.original_title}
                originalContent={story.original_content}
                currentTitle={story.title}
              />
            )}
          </div>
        </article>

        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Comments ({comments?.length || 0})
          </h2>

          {user ? (
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
          ) : (
            <p className="mb-8 text-sm text-muted-foreground">
              Sign in to leave a comment.
            </p>
          )}

          <div className="space-y-4">
            {comments?.map((c: any) => (
              <div key={c.id} className="border-l-2 border-border pl-4 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-foreground">{c.author_name}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                  {(isAdmin || c.user_id === user?.id) && (
                    <button
                      onClick={() => deleteComment.mutate(c.id)}
                      disabled={deleteComment.isPending}
                      className="ml-auto text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
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
