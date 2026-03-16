const API_URL = import.meta.env.VITE_API_URL || "/api";

function getToken(): string | null {
  return localStorage.getItem("arn_token");
}

function setToken(token: string | null) {
  if (token) localStorage.setItem("arn_token", token);
  else localStorage.removeItem("arn_token");
}

function getUser(): any | null {
  const raw = localStorage.getItem("arn_user");
  return raw ? JSON.parse(raw) : null;
}

function setUser(user: any | null) {
  if (user) localStorage.setItem("arn_user", JSON.stringify(user));
  else localStorage.removeItem("arn_user");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("Cannot reach the API. If you're self-hosting, use your VM/domain URL instead of the Lovable preview.");
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  getToken,
  setToken,
  getUser,
  setUser,

  // Auth
  async signUp(email: string, password: string, displayName: string) {
    const data = await request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name: displayName }),
    });
    setToken(data.token);
    setUser(data.user);
    return data;
  },

  async signIn(email: string, password: string) {
    const data = await request("/auth/signin", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.mfa_required) {
      setToken(data.mfa_token);
      return data;
    }
    setToken(data.token);
    setUser(data.user);
    return data;
  },

  async signOut() {
    setToken(null);
    setUser(null);
  },

  async getMe() {
    return request("/auth/me");
  },

  // MFA
  async mfaEnroll() {
    return request("/auth/mfa/enroll", { method: "POST" });
  },

  async mfaVerify(code: string) {
    const data = await request("/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    if (data.token) {
      setToken(data.token);
      // Refresh user info
      const user = await request("/auth/me");
      setUser(user);
    }
    return data;
  },

  async mfaStatus() {
    return request("/auth/mfa/status");
  },

  // Stories
  async getStories() {
    return request("/stories");
  },

  async getRecentStories() {
    return request("/stories/recent");
  },

  async getStory(id: string) {
    return request(`/stories/${id}`);
  },

  async createStory(data: any) {
    return request("/stories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateStory(id: string, data: any) {
    return request(`/stories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteStory(id: string) {
    return request(`/stories/${id}`, { method: "DELETE" });
  },

  async getPendingStories() {
    return request("/stories/admin/pending");
  },

  // Comments
  async getComments(storyId: string) {
    return request(`/comments/${storyId}`);
  },

  async createComment(storyId: string, content: string) {
    return request("/comments", {
      method: "POST",
      body: JSON.stringify({ story_id: storyId, content }),
    });
  },

  async deleteComment(id: string) {
    return request(`/comments/${id}`, { method: "DELETE" });
  },

  // Votes
  async vote(storyId: string) {
    return request("/votes", {
      method: "POST",
      body: JSON.stringify({ story_id: storyId }),
    });
  },

  // Admin
  async getMyRoles() {
    return request("/admin/my-roles");
  },

  async listUsers() {
    return request("/admin/users");
  },

  async addRole(userId: string, role: string) {
    return request("/admin/roles", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, role }),
    });
  },

  async removeRole(userId: string, role: string) {
    return request("/admin/roles", {
      method: "DELETE",
      body: JSON.stringify({ user_id: userId, role }),
    });
  },
};
