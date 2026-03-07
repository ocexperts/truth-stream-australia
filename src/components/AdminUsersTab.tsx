import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, UserMinus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  display_name: string;
  roles: string[];
}

const AVAILABLE_ROLES = ["admin", "editor"] as const;

export function AdminUsersTab() {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.listUsers() as Promise<UserRow[]>,
  });

  const toggleRole = useMutation({
    mutationFn: async ({ userId, role, add }: { userId: string; role: string; add: boolean }) => {
      if (add) return api.addRole(userId, role);
      return api.removeRole(userId, role);
    },
    onSuccess: (_, { role, add }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(add ? `${role} role granted` : `${role} role removed`);
    },
    onError: () => toast.error("Failed to update role"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded bg-secondary" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users?.map((u) => (
        <div key={u.id} className="border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{u.display_name}</span>
              <span className="text-xs text-muted-foreground truncate">{u.email}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {u.roles.length > 0 ? (
                u.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {role}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No roles</span>
              )}
              <span className="text-xs text-muted-foreground">
                · Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            {AVAILABLE_ROLES.map((role) => {
              const hasRole = u.roles.includes(role);
              return (
                <Button
                  key={role}
                  variant={hasRole ? "destructive" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => toggleRole.mutate({ userId: u.id, role, add: !hasRole })}
                  disabled={toggleRole.isPending}
                >
                  {hasRole ? (
                    <>
                      <UserMinus className="h-3 w-3 mr-1" />
                      Remove {role}
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3 mr-1" />
                      Add {role}
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
      {(!users || users.length === 0) && (
        <p className="text-muted-foreground">No users found.</p>
      )}
    </div>
  );
}
