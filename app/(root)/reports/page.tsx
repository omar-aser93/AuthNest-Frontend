import { getMyReports } from "@/lib/queries/reportQueries";
import { formatTimeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Page metadata
export const metadata = {
  title: "My Reports - AuthNest",
  description: "Reports you've submitted.",
};


// My reports page (Posts/Comments/Users)
export default async function MyReportsPage() {
  const data = await getMyReports();             // Fetch my reports using the "getMyReports" query

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-4">
      <h1 className="text-2xl font-semibold">My Reports</h1>

      {data.error ? (
        <p className="text-red-500">{data.error}</p>
      ) : data.reports.length === 0 ? (
        <p className="text-muted-foreground">You haven&apos;t reported anything yet.</p>
      ) : (
        <ul className="divide-y border rounded-lg">
          {data.reports.map((r) => (
            <li key={r.id} className="flex items-center justify-between p-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  {r.targetType} · {r.reason}
                </span>
                <span className="text-xs text-muted-foreground">
                  Reported {formatTimeAgo(r.createdAt)}
                </span>
              </div>
              <Badge
                variant={
                  r.status === "PENDING" ? "secondary" :
                  r.status === "ACTIONED" ? "default" :
                  r.status === "DISMISSED" ? "outline" : "secondary"
                }
              >
                {r.status.toLowerCase()}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}