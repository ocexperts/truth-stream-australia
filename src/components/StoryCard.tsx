import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, ChevronUp } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface StoryCardProps {
  story: Tables<"stories">;
  authorName: string;
  commentCount: number;
}

export function StoryCard({ story, authorName, commentCount }: StoryCardProps) {
  return (
    <Link
      to={`/story/${story.id}`}
      className="group block border border-border bg-card p-6 transition-all hover:border-primary/40 hover:border-glow"
    >
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-1 pt-1">
          <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-sm font-semibold text-muted-foreground">{story.upvotes || 0}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {story.media_outlet && (
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {story.media_outlet}
              </span>
            )}
            {story.category && story.category !== "general" && (
              <span className="text-xs text-muted-foreground">
                · {story.category}
              </span>
            )}
          </div>
          <h3 className="font-display text-lg font-bold leading-tight group-hover:text-primary transition-colors">
            {story.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {story.content}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span>{authorName}</span>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {commentCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
