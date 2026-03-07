import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
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
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const isGuest = !user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    if (isGuest && (!guestName.trim() || !guestEmail.trim())) return;

    setLoading(true);

    try {
      await api.createStory({
        title: title.trim(),
        content: content.trim(),
        media_outlet: mediaOutlet || null,
        ...(isGuest ? { guest_name: guestName.trim(), guest_email: guestEmail.trim() } : {}),
      });

      if (isGuest) {
        toast.success("Story submitted! It will appear after admin approval.");
      } else {
        toast.success("Story published");
      }
      navigate("/stories");
    } catch {
      toast.error("Failed to submit story");
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
          {isGuest && (
            <span className="block mt-1 text-xs text-primary">
              Submitting as a guest — your story will be reviewed before publishing.
            </span>
          )}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isGuest && (
            <div className="space-y-4 rounded border border-border bg-secondary/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guest Details</p>
              <div>
                <Label htmlFor="guestName" className="text-muted-foreground">Your Name</Label>
                <Input id="guestName" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="How should we credit you?" className="mt-1 bg-secondary border-border" maxLength={100} required />
              </div>
              <div>
                <Label htmlFor="guestEmail" className="text-muted-foreground">Email (private)</Label>
                <Input id="guestEmail" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="For follow-up only — never shown publicly" className="mt-1 bg-secondary border-border" maxLength={255} required />
              </div>
            </div>
          )}

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
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A concise headline for your experience" className="mt-1 bg-secondary border-border" maxLength={200} required />
          </div>

          <div>
            <Label htmlFor="content" className="text-muted-foreground">Your Story</Label>
            <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="What happened? How were you treated? Be specific..." className="mt-1 min-h-[200px] bg-secondary border-border" maxLength={5000} required />
          </div>

          <Button type="submit" variant="hero" className="w-full" disabled={loading}>
            {loading ? "Submitting..." : isGuest ? "Submit for Review" : "Publish Story"}
          </Button>
        </form>
      </main>
    </div>
  );
}
