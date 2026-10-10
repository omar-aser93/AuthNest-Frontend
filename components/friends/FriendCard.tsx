import Link from "next/link";
import Image from "next/image";
import FriendActionButton from "./FriendActionButton";
import { Users } from "lucide-react";

// TypeScript interface for FriendCard received props
interface FriendCardProps {
  user: {
    id: string;
    name: string;
    image?: string;
    bio?: string;
  };
  initialStatus: {
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED" | null;
    friendshipId?: string;
    direction?: "sent" | "received";
  } | null;
  mutualCount?: number;
}


// FriendCard component to display individual friend or request or suggestion, receives user info, initial friendship status and mutual friends count
export default function FriendCard({ user, initialStatus, mutualCount }: FriendCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
      <Link href={`/user/${user.id}`} className="flex items-center gap-3 flex-1">
        {/* Image + Name + Bio + Mutual friends count */}
        <Image src={user.image || "/default-avatar.png"} alt={user.name} width={48} height={48} className="rounded-full object-cover" />
        <div>
          <p className="font-medium">{user.name}</p>
          {user.bio && <p className="text-sm text-gray-500 line-clamp-1">{user.bio}</p>}
          {mutualCount !== undefined && mutualCount > 0 && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Users className="h-3 w-3" /> {mutualCount} mutual friend{mutualCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </Link>

      {/* FriendActionButton component, pass the targetUserId, initialStatus */}
      <FriendActionButton targetUserId={user.id} initialStatus={initialStatus} />
    </div>
  );
}