import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const MEDIA_OUTLETS = [
  "ABC", "Nine/Fairfax", "Seven West Media", "News Corp",
  "SBS", "The Guardian AU", "Crikey", "The Australian",
  "Daily Telegraph", "Herald Sun", "Sky News", "Other",
];

export default function SubmitStoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mediaOutlet, setMediaOutlet] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Sign in to share your story</h1>
          <p className="text-muted-foreground">You must be signed in to submit a story.</p>
        </main>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    const { error } = await supabase.from("stories").insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      media_outlet: mediaOutlet || null,
    });

    if (error) {
      toast.error("Failed to submit story");
    } else {
      toast.success("Story published");
      navigate("/stories");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 font-display text-3xl font-black">Share Your Story</h1>
        <p className="mb-8 text-muted-foreground">
          Tell Australia what happened. Your voice matters.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-muted-foreground">Media Outlet</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {MEDIA_OUTLETS.map((outlet) => (
                <button
                  key={outlet}
                  type="button"
                  onClick={() => setMediaOutlet(mediaOutlet === outlet ? "" : outlet)}
                  className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors ${
                    mediaOutlet === outlet
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {outlet}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="title" className="text-muted-foreground">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A concise headline for your experience"
              className="mt-1 bg-secondary border-border"
              maxLength={200}
              required
            />
          </div>
          <div>
            <Label htmlFor="content" className="text-muted-foreground">Your Story</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What happened? How were you treated? Be specific..."
              className="mt-1 min-h-[200px] bg-secondary border-border"
              maxLength={5000}
              required
            />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={loading}>
            {loading ? "Publishing..." : "Publish Story"}
          </Button>
        </form>
      </main>
    </div>
  );
}
