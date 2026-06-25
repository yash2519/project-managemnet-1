"use client";
import { useGetTeamByIdQuery, useGetUsersQuery, useAddTeamMemberMutation, useRemoveTeamMemberMutation, useGetAuthUserQuery } from "@/state/api";
import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Crown, Users, FolderOpen, User as UserIcon, Calendar, UserMinus, Plus } from "lucide-react";
import Image from "next/image";

/* ─────────────────────────────────────────────────────────────────────────────
   Avatar
───────────────────────────────────────────────────────────────────────────── */
const Avatar = ({ url, username, size = "md" }: { url?: string | null; username: string; size?: "sm" | "md" | "lg" }) => {
  const sizeMap = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  };
  const iconMap = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-7 w-7",
  };

  if (url) {
    return (
      <Image
        src={`https://pm-s3-images.s3.us-east-1.amazonaws.com/${url}`}
        alt={username}
        width={56}
        height={56}
        className={`${sizeMap[size]} rounded-full object-cover ring-2 ring-white dark:ring-gray-800 flex-shrink-0`}
        onError={(e) => {
          if (e.currentTarget.src.includes("ui-avatars.com")) return;
          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
          e.currentTarget.srcset = "";
        }}
      />
    );
  }
  return (
    <div
      className={`${sizeMap[size]} flex items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 ring-2 ring-white dark:ring-gray-800 flex-shrink-0`}
    >
      <UserIcon className={`${iconMap[size]} text-white`} />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Role badge
───────────────────────────────────────────────────────────────────────────── */
const rolePalette: Record<string, { bg: string; text: string }> = {
  default: { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-600 dark:text-gray-300" },
  admin: { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-300" },
  manager: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300" },
  developer: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300" },
  designer: { bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-700 dark:text-pink-300" },
  member: { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-600 dark:text-gray-300" },
};

const getRoleStyle = (role: string) => {
  const key = role.toLowerCase();
  for (const [k, v] of Object.entries(rolePalette)) {
    if (k !== "default" && key.includes(k)) return v;
  }
  return rolePalette.default;
};

const RoleBadge = ({ role }: { role?: string | null }) => {
  const label = role?.trim() || "Member";
  const style = getRoleStyle(label);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {label}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Section card
───────────────────────────────────────────────────────────────────────────── */
const SectionCard = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-hidden shadow-sm">
    <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 px-5 py-3.5">
      <span className="text-gray-400 dark:text-gray-500">{icon}</span>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
        {title}
      </h2>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Skeleton
───────────────────────────────────────────────────────────────────────────── */
const Skeleton = () => (
  <div className="flex w-full flex-col p-8 gap-5 animate-pulse">
    <div className="h-8 w-48 rounded bg-gray-100 dark:bg-gray-800" />
    <div className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800" />
    <div className="h-64 rounded-xl bg-gray-100 dark:bg-gray-800" />
    <div className="h-48 rounded-xl bg-gray-100 dark:bg-gray-800" />
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   Team Details Page
───────────────────────────────────────────────────────────────────────────── */
const TeamDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const teamId = Number(params.id);

  const { data: team, isLoading, isError } = useGetTeamByIdQuery(teamId);
  const { data: allUsers = [] } = useGetUsersQuery();
  const { data: currentUser } = useGetAuthUserQuery({});
  
  const [addTeamMember, { isLoading: isAdding }] = useAddTeamMemberMutation();
  const [removeTeamMember] = useRemoveTeamMemberMutation();

  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState<number | "">("");

  const currentUserId = currentUser?.userDetails?.userId;
  const isAdmin = team?.members?.some((m) => m.userId === currentUserId && m.role === "ADMIN");

  const handleAddMember = async () => {
    if (!selectedUserIdToAdd) return;
    try {
      await addTeamMember({ teamId, userId: Number(selectedUserIdToAdd) }).unwrap();
      setSelectedUserIdToAdd("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMember = async (removeUserId: number) => {
    if (confirm("Are you sure you want to remove this member?")) {
      try {
        await removeTeamMember({ teamId, userId: removeUserId }).unwrap();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const availableUsers = allUsers.filter(
    (u) => !team?.members?.some((m) => m.userId === u.userId)
  );

  if (isLoading) return <Skeleton />;

  if (isError || !team) {
    return (
      <div className="flex w-full flex-col p-8">
        <button
          onClick={() => router.push("/teams")}
          className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Teams
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 px-6 py-5 text-red-700 dark:text-red-400">
          Team not found or failed to load.
        </div>
      </div>
    );
  }

  /* Resolve team lead info */
  const teamLead = team.teamLeadUserId
    ? (team.members?.find((m) => m.userId === team.teamLeadUserId) ||
       allUsers.find((u) => u.userId === team.teamLeadUserId))
    : null;

  return (
    <div className="flex w-full flex-col p-8 gap-6 max-w-4xl">

      {/* ── Back button ────────────────────────────────────────────── */}
      <button
        onClick={() => router.push("/teams")}
        className="flex w-fit items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Teams
      </button>

      {/* ── Team Info Card ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 shadow-sm overflow-hidden">
        {/* Accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {team.teamName}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {team.memberCount ?? team.members?.length ?? 0}{" "}
                  {(team.memberCount ?? team.members?.length ?? 0) === 1 ? "member" : "members"}
                </span>
                {team.projects && team.projects.length > 0 && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {team.projects.length}{" "}
                      {team.projects.length === 1 ? "project" : "projects"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Team Lead section */}
          {teamLead && (
            <div className="mt-5 flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3">
              <Crown className="h-4 w-4 flex-shrink-0 text-amber-500" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Team Lead
              </span>
              <div className="ml-2 flex items-center gap-2">
                <Avatar
                  url={(teamLead as any).profilePictureUrl}
                  username={(teamLead as any).username}
                  size="sm"
                />
                <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                  {(teamLead as any).username}
                </span>
                {(teamLead as any).roleName && (
                  <RoleBadge role={(teamLead as any).roleName} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Members ────────────────────────────────────────────────── */}
      <SectionCard
        title={`Members (${team.members?.length ?? 0})`}
        icon={<Users className="h-4 w-4" />}
      >
        {!team.members || team.members.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
            No members in this team yet.
          </p>
        ) : (
          <div className="space-y-2">
            {team.members.map((member) => {
              const isLead = member.userId === team.teamLeadUserId;
              return (
                <div
                  key={member.userId}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isLead
                      ? "bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/20"
                      : "bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/60 dark:hover:bg-gray-800/60"
                  }`}
                >
                  <Avatar url={member.profilePictureUrl} username={member.username} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-gray-800 dark:text-gray-100">
                      {member.username}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RoleBadge role={member.roleName} />
                    {isLead && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <Crown className="h-3 w-3" />
                        Lead
                      </span>
                    )}
                    {isAdmin && member.userId !== currentUserId && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="ml-2 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                        title="Remove Member"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isAdmin && availableUsers.length > 0 && (
          <div className="mt-4 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
            <select
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              value={selectedUserIdToAdd}
              onChange={(e) => setSelectedUserIdToAdd(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">— Select a user to add —</option>
              {availableUsers.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.username}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddMember}
              disabled={!selectedUserIdToAdd || isAdding}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        )}
      </SectionCard>

      {/* ── Assigned Projects ─────────────────────────────────────── */}
      <SectionCard
        title={`Assigned Projects (${team.projects?.length ?? 0})`}
        icon={<FolderOpen className="h-4 w-4" />}
      >
        {!team.projects || team.projects.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
            No projects assigned to this team yet.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {team.projects.map((project: any) => (
              <div
                key={project.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-4 py-3 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <FolderOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400 dark:text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                      {project.name}
                    </p>
                    {project.description && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {project.description}
                      </p>
                    )}
                    {(project.startDate || project.endDate) && (
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {project.startDate
                          ? new Date(project.startDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
                          : "—"}
                        {project.endDate && (
                          <> → {new Date(project.endDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default TeamDetailPage;
