import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import { z } from "zod";

const postSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  excerpt: z.string().max(300, "Excerpt too long").optional(),
  content: z.string().min(1, "Content is required").max(10000, "Content too long"),
});

export default function CreatePost() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      if (id) {
        const { data: post, error } = await supabase
          .from("posts")
          .select("*")
          .eq("id", id)
          .eq("author_id", session.user.id)
          .single();

        if (error || !post) {
          toast.error("Post not found or unauthorized");
          navigate("/");
          return;
        }

        setTitle(post.title);
        setExcerpt(post.excerpt || "");
        setContent(post.content);
        setPublished(post.published);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, id]);

  const handleSubmit = async (e: React.FormEvent, shouldPublish: boolean) => {
    e.preventDefault();
    if (!user) return;

    try {
      const validation = postSchema.parse({ title, excerpt, content });
      setLoading(true);

      if (id) {
        const { error } = await supabase
          .from("posts")
          .update({
            title: validation.title,
            excerpt: validation.excerpt || null,
            content: validation.content,
            published: shouldPublish,
          })
          .eq("id", id)
          .eq("author_id", user.id);

        if (error) throw error;
        toast.success("Post updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("posts")
          .insert({
            title: validation.title,
            excerpt: validation.excerpt || null,
            content: validation.content,
            author_id: user.id,
            published: shouldPublish,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success("Post created successfully!");
        navigate(`/post/${data.id}`);
        return;
      }

      navigate(`/post/${id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => toast.error(err.message));
      } else {
        toast.error("Failed to save post");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>{id ? "Edit Post" : "Create New Post"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter your post title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt (Optional)</Label>
                <Input
                  id="excerpt"
                  placeholder="Brief description of your post..."
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Write your post content..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={15}
                  required
                />
              </div>
              <div className="flex gap-4">
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e, false)}
                  variant="outline"
                  disabled={loading}
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={loading}
                >
                  {published ? "Update & Publish" : "Publish"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
