import React from "react";
import Image from "next/image";
import { User as UserIcon } from "lucide-react";
import { rolePalette, getRoleStyle } from "@/lib/utils";

export const RoleBadge = ({ role }: { role?: string | null }) => {
  const label = role?.trim() || "Not Specified";
  const style = role?.trim() ? getRoleStyle(label) : rolePalette.default;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {label}
    </span>
  );
};

export const Avatar = ({ url, username }: { url?: string | null; username: string }) => {
  if (url) {
    return (
      <Image
        src={`https://pm-s3-images.s3.us-east-1.amazonaws.com/${url}`}
        alt={username}
        width={36}
        height={36}
        className="h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-gray-800"
        onError={(e) => {
          if (e.currentTarget.src.includes("ui-avatars.com")) return;
          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
          e.currentTarget.srcset = "";
        }}
      />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 ring-2 ring-white dark:ring-gray-800">
      <UserIcon className="h-4 w-4 text-white" />
    </div>
  );
};
