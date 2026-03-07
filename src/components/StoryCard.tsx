import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StoryCardProps {
  story: any;
  authorName: string;
  commentCount: number;
  showDelete?: boolean;
  deleting?: boolean;
  onDelete?: (storyId: string) => void;
}

export function StoryCard({ story, authorName, commentCount, showDelete = false, deleting = false, onDelete }: StoryCardProps) {
  return (
    <div className="border border-border bg-card transition-all hover:border-primary/40 hover:border-glow">
      <Link
        to={`/story/${story.id}`}
        className="group block p-6"
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

      {showDelete && onDelete && (
        <div className="border-t border-border px-6 py-3">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onDelete(story.id)}
            disabled={deleting}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete Story
          </Button>
        </div>
      )}
    </div>
  );
}
