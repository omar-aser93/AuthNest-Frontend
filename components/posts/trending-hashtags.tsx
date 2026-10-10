import { getTrendingHashtags } from "@/lib/queries/postQueries";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


// TRENDING HASHTAGS component
export default async function TrendingHashtags() {

  const hashtags = await getTrendingHashtags(20);   // fetch the trending hashtags 
  return (
    <Card className="border rounded-xl shadow-sm">
      {/* HEADER */}
      <CardHeader>
        <CardTitle className="text-lg font-semibold">🔥 Trending Hashtags</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {hashtags.length === 0 && (<p className="text-sm text-muted-foreground">No trending hashtags yet.</p> )}

        <div className="flex flex-wrap gap-2">
          {/* Map over the hashtags array and render each tag */}
          {hashtags.map((tag) => (
            <Link key={tag.hashtag} href={`/hashtags/${tag.hashtag}`}>
              <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition rounded-full px-3 py-1" >
                #{tag.hashtag}
                <span className="ml-1 text-xs opacity-70">({tag.count})</span>
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
