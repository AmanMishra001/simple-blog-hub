import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Trash2, Edit, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function PostView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (username, full_name, avatar_url)
        `)
        .eq("id", id)
        .single();

      if (postError || !postData) {
        toast.error("Post not found");
        navigate("/");
        return;
      }

      setPost(postData);

      const { data: commentsData } = await supabase
        .from("comments")
        .select(`
          *,
          profiles (username, full_name, avatar_url)
        `)
        .eq("post_id", id)
        .order("created_at", { ascending: true });

      setComments(commentsData || []);
      setLoading(false);
    };

    fetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete post");
    } else {
      toast.success("Post deleted successfully");
      navigate("/");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    const { error } = await supabase.from("comments").insert({
      content: newComment,
      post_id: id,
      author_id: user.id,
    });

    if (error) {
      toast.error("Failed to add comment");
    } else {
      setNewComment("");
      const { data } = await supabase
        .from("comments")
        .select(`
          *,
          profiles (username, full_name, avatar_url)
        `)
        .eq("post_id", id)
        .order("created_at", { ascending: true });
      setComments(data || []);
      toast.success("Comment added!");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);

    if (error) {
      toast.error("Failed to delete comment");
    } else {
      setComments(comments.filter((c) => c.id !== commentId));
      toast.success("Comment deleted");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <article className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback>{post.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <Link
                to={`/profile/${post.author_id}`}
                className="hover:text-foreground transition-colors"
              >
                {post.profiles?.full_name || post.profiles?.username}
              </Link>
            </div>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
            {user?.id === post.author_id && (
              <>
                <span>•</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/edit/${post.id}`)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </>
            )}
          </div>
          {post.excerpt && (
            <p className="text-lg text-muted-foreground mb-6">{post.excerpt}</p>
          )}
          <div className="prose prose-lg max-w-none">
            <p className="whitespace-pre-wrap">{post.content}</p>
          </div>
        </div>

        <div className="border-t pt-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Comments ({comments.length})
          </h2>

          {user ? (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <form onSubmit={handleAddComment} className="space-y-4">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button type="submit" disabled={!newComment.trim()}>
                    Post Comment
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">
                  Please sign in to leave a comment
                </p>
                <Button asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={comment.profiles?.avatar_url} />
                      <AvatarFallback>
                        {comment.profiles?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          to={`/profile/${comment.author_id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {comment.profiles?.full_name || comment.profiles?.username}
                        </Link>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                    {user?.id === comment.author_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
