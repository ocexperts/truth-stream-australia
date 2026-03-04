import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { StoryCard } from "@/components/StoryCard";
import { ArrowRight } from "lucide-react";

const Index = () => {
  const { data: recentStories } = useQuery({
    queryKey: ["recent-stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*, profiles(display_name), comments(count)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="font-display text-5xl font-black leading-[1.1] md:text-7xl">
              Hold Australian Media
              <br />
              <span className="text-gradient-danger">Accountable.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
              Share your experience. Expose bias, mistreatment, and misconduct.
              Your story is the evidence Australia needs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/submit">
                <Button variant="hero" size="lg">
                  Share Your Story
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/stories">
                <Button variant="ghost" size="lg" className="text-muted-foreground">
                  Read Stories
                </Button>
              </Link>
            </div>
          </div>
          {/* Background accent */}
          <div className="absolute -right-20 top-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-sm">
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">{recentStories?.length || 0}</span> stories shared
          </span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            The truth won't silence itself
          </span>
        </div>
      </section>

      {/* Recent Stories */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Latest Stories</h2>
          <Link to="/stories" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentStories && recentStories.length > 0 ? (
          <div className="space-y-3">
            {recentStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                authorName={story.profiles?.display_name || "Anonymous"}
                commentCount={(story.comments as any)?.[0]?.count || 0}
              />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground mb-4">No stories yet. Be the first to speak up.</p>
            <Link to="/submit">
              <Button variant="hero">Share Your Story</Button>
            </Link>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center text-sm text-muted-foreground">
          <p className="font-display text-lg font-bold text-foreground mb-1">ARN</p>
          <p>Australian Review Network · arn.net.au</p>
          <p className="mt-2">Your voice. Your truth. Their accountability.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
