import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Check, X, Shield, Pencil } from "lucide-react";
import { useEffect, useState } from "react";

interface EditState {
  title: string;
  content: string;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ title: "", content: "" });

  useEffect(() => {
    if (!user) {
      setCheckingRole(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .then(({ data }) => {
        setIsAdmin(!!(data && data.length > 0));
        setCheckingRole(false);
      });
  }, [user]);

  const { data: pendingStories, isLoading } = useQuery({
    queryKey: ["admin-pending-stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("stories")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-stories"] });
      toast.success(status === "approved" ? "Story approved and published" : "Story rejected");
    },
    onError: () => toast.error("Failed to update story"),
  });

  const saveEdit = useMutation({
    mutationFn: async ({ id, title, content, originalTitle, originalContent }: { id: string; title: string; content: string; originalTitle: string; originalContent: string }) => {
      const updateData: Record<string, unknown> = { title, content };
      // Only save originals if content was actually changed
      if (title !== originalTitle || content !== originalContent) {
        updateData.original_title = originalTitle;
        updateData.original_content = originalContent;
      }
      const { error } = await supabase
        .from("stories")
        .update(updateData as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-stories"] });
      setEditing(null);
      toast.success("Story updated");
    },
    onError: () => toast.error("Failed to save edits"),
  });

  const startEditing = (story: { id: string; title: string; content: string }) => {
    setEditing(story.id);
    setEditState({ title: story.title, content: story.content });
  };

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="h-8 w-48 mx-auto animate-pulse rounded bg-secondary" />
        </main>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-20 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="font-display text-3xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-2 font-display text-3xl font-black flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          Admin — Pending Stories
        </h1>
        <p className="mb-8 text-muted-foreground">
          Review, edit, and approve guest submissions before they go live.
        </p>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded bg-secondary" />
            ))}
          </div>
        ) : pendingStories && pendingStories.length > 0 ? (
          <div className="space-y-4">
            {pendingStories.map((story) => (
              <div key={story.id} className="border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                  {story.media_outlet && (
                    <span className="font-semibold uppercase tracking-wider text-primary">
                      {story.media_outlet}
                    </span>
                  )}
                  <span>
                    Guest: {(story as any).guest_name || "Unknown"} ({(story as any).guest_email || "no email"})
                  </span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}</span>
                </div>

                {editing === story.id ? (
                  <div className="space-y-3 mb-4">
                    <Input
                      value={editState.title}
                      onChange={(e) => setEditState((s) => ({ ...s, title: e.target.value }))}
                      className="bg-secondary border-border font-display font-bold"
                    />
                    <Textarea
                      value={editState.content}
                      onChange={(e) => setEditState((s) => ({ ...s, content: e.target.value }))}
                      className="bg-secondary border-border min-h-[150px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() => saveEdit.mutate({ id: story.id, title: editState.title.trim(), content: editState.content.trim() })}
                        disabled={saveEdit.isPending || !editState.title.trim() || !editState.content.trim()}
                      >
                        Save Changes
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-display text-lg font-bold mb-2">{story.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-4 mb-4 whitespace-pre-wrap">
                      {story.content}
                    </p>
                  </>
                )}

                {editing !== story.id && (
                  <div className="flex gap-2">
                    <Button
                      variant="hero"
                      size="sm"
                      onClick={() => updateStatus.mutate({ id: story.id, status: "approved" })}
                      disabled={updateStatus.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(story)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus.mutate({ id: story.id, status: "rejected" })}
                      disabled={updateStatus.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No pending stories to review.</p>
        )}
      </main>
    </div>
  );
}
