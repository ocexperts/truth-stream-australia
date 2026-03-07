import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminUsersTab } from "@/components/AdminUsersTab";
import { EnrollMFA } from "@/components/MFA";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Check, X, Shield, Pencil, Users, FileText, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface EditState {
  title: string;
  content: string;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ title: "", content: "" });
  const [hasMFA, setHasMFA] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setCheckingRole(false);
      return;
    }
    api.getMyRoles().then((roles: string[]) => {
      setIsAdmin(roles.includes("admin"));
      setIsEditor(roles.includes("editor"));
      setCheckingRole(false);
    }).catch(() => setCheckingRole(false));

    api.mfaStatus().then((data) => {
      setHasMFA(data.enabled);
    }).catch(() => setHasMFA(false));
  }, [user]);

  const hasAccess = isAdmin || isEditor;

  const { data: pendingStories, isLoading } = useQuery({
    queryKey: ["admin-pending-stories"],
    queryFn: () => api.getPendingStories(),
    enabled: hasAccess,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateStory(id, { status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-stories"] });
      toast.success(status === "approved" ? "Story approved and published" : "Story rejected");
    },
    onError: () => toast.error("Failed to update story"),
  });

  const deleteStory = useMutation({
    mutationFn: (id: string) => api.deleteStory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-stories"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["recent-stories"] });
      toast.success("Story deleted");
    },
    onError: () => toast.error("Failed to delete story"),
  });

  const saveEdit = useMutation({
    mutationFn: ({ id, title, content, originalTitle, originalContent }: { id: string; title: string; content: string; originalTitle: string; originalContent: string }) => {
      const updateData: Record<string, string> = { title, content };
      if (title !== originalTitle || content !== originalContent) {
        updateData.original_title = originalTitle;
        updateData.original_content = originalContent;
      }
      return api.updateStory(id, updateData);
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

  if (!user || !hasAccess) {
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
        <h1 className="mb-6 font-display text-3xl font-black flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          Admin Panel
        </h1>

        <Tabs defaultValue="stories">
          <TabsList className="mb-6">
            <TabsTrigger value="stories" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Pending Stories
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
            )}
            <TabsTrigger value="security" className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stories">
            <p className="mb-6 text-muted-foreground">
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
                {pendingStories.map((story: any) => (
                  <div key={story.id} className="border border-border bg-card p-6">
                    <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                      {story.media_outlet && (
                        <span className="font-semibold uppercase tracking-wider text-primary">
                          {story.media_outlet}
                        </span>
                      )}
                      <span>
                        Guest: {story.guest_name || "Unknown"} ({story.guest_email || "no email"})
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
                            onClick={() => saveEdit.mutate({ id: story.id, title: editState.title.trim(), content: editState.content.trim(), originalTitle: story.title, originalContent: story.content })}
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
                        <Button variant="hero" size="sm" onClick={() => updateStatus.mutate({ id: story.id, status: "approved" })} disabled={updateStatus.isPending}>
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => startEditing(story)}>
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: story.id, status: "rejected" })} disabled={updateStatus.isPending}>
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                        {isAdmin && (
                          <Button variant="destructive" size="sm" onClick={() => deleteStory.mutate(story.id)} disabled={deleteStory.isPending}>
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No pending stories to review.</p>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users">
              <p className="mb-6 text-muted-foreground">
                Manage user roles. Admins have full access. Editors can review and approve stories.
              </p>
              <AdminUsersTab />
            </TabsContent>
          )}

          <TabsContent value="security">
            <p className="mb-6 text-muted-foreground">
              Manage your account security settings.
            </p>
            {hasMFA === false && (
              <EnrollMFA onEnrolled={() => setHasMFA(true)} />
            )}
            {hasMFA === true && (
              <div className="border border-border bg-card p-6 rounded flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-sm">2FA is enabled</p>
                  <p className="text-xs text-muted-foreground">Your account is protected with an authenticator app.</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
