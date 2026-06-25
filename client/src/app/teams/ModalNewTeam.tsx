"use client";
import Modal from "@/components/Modal";
import { useCreateTeamMutation, useGetUsersQuery } from "@/state/api";
import React, { useState, useMemo } from "react";
import { Search, X, Check, Users, Crown } from "lucide-react";
import Image from "next/image";
import { User as UserIcon } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

/* ─────────────────────────────────────────────────────────────────────────────
   Small avatar for user list
───────────────────────────────────────────────────────────────────────────── */
const MiniAvatar = ({ url, username }: { url?: string | null; username: string }) => {
  if (url) {
    return (
      <Image
        src={`https://pm-s3-images.s3.us-east-1.amazonaws.com/${url}`}
        alt={username}
        width={28}
        height={28}
        className="h-7 w-7 rounded-full object-cover flex-shrink-0"
        onError={(e) => {
          if (e.currentTarget.src.includes("ui-avatars.com")) return;
          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
          e.currentTarget.srcset = "";
        }}
      />
    );
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0">
      <UserIcon className="h-3.5 w-3.5 text-white" />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Modal
───────────────────────────────────────────────────────────────────────────── */
const ModalNewTeam = ({ isOpen, onClose }: Props) => {
  const [createTeam, { isLoading }] = useCreateTeamMutation();
  const { data: users = [] } = useGetUsersQuery();

  const [teamName, setTeamName] = useState("");
  const [teamLeadUserId, setTeamLeadUserId] = useState<number | null>(null);
  const [memberIds, setMemberIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  /* ── Filter users by search ─────────────────────────────────────── */
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.username.toLowerCase().includes(q) ||
      (u.roleName ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  /* ── Toggle a member ─────────────────────────────────────────────── */
  const toggleMember = (userId: number) => {
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
        // If the deselected user was the lead, clear the lead
        if (teamLeadUserId === userId) setTeamLeadUserId(null);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  /* ── Effective member list (includes lead automatically) ─────────── */
  const effectiveMemberIds = useMemo(() => {
    const all = new Set(memberIds);
    if (teamLeadUserId !== null) all.add(teamLeadUserId);
    return all;
  }, [memberIds, teamLeadUserId]);

  /* ── Members eligible as team lead (must be selected) ────────────── */
  const eligibleLeads = useMemo(
    () => users.filter((u) => effectiveMemberIds.has(u.userId!)),
    [users, effectiveMemberIds]
  );

  const isFormValid = teamName.trim().length > 0 && effectiveMemberIds.size > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    await createTeam({
      teamName: teamName.trim(),
      teamLeadUserId: teamLeadUserId ?? undefined,
      memberUserIds: Array.from(effectiveMemberIds),
    });

    // reset
    setTeamName("");
    setTeamLeadUserId(null);
    setMemberIds(new Set());
    setSearch("");
    onClose();
  };

  const inputStyles =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Create New Team">
      <form className="mt-4 space-y-5" onSubmit={handleSubmit}>

        {/* ── Team Name ────────────────────────────────────────────── */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Team Name <span className="text-red-500">*</span>
          </label>
          <input
            id="new-team-name"
            type="text"
            className={inputStyles}
            placeholder="e.g. Hardware Team"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </div>

        {/* ── Members multi-select ─────────────────────────────────── */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <Users className="h-3.5 w-3.5" />
            Members{" "}
            {effectiveMemberIds.size > 0 && (
              <span className="ml-auto rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                {effectiveMemberIds.size} selected
              </span>
            )}
          </label>

          {/* Search inside members */}
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              id="member-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className={`${inputStyles} pl-8 pr-8`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* User list */}
          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
            {filteredUsers.length === 0 ? (
              <p className="px-4 py-3 text-center text-xs text-gray-400 dark:text-gray-500">
                No users found
              </p>
            ) : (
              filteredUsers.map((user) => {
                const uid = user.userId!;
                const isChecked = effectiveMemberIds.has(uid);
                const isLead = teamLeadUserId === uid;
                return (
                  <label
                    key={uid}
                    htmlFor={`member-${uid}`}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors ${
                      isChecked
                        ? "bg-blue-50/60 dark:bg-blue-900/20"
                        : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                    }`}
                  >
                    <input
                      id={`member-${uid}`}
                      type="checkbox"
                      className="sr-only"
                      checked={isChecked}
                      onChange={() => toggleMember(uid)}
                    />
                    {/* Custom checkbox */}
                    <div
                      className={`flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        isChecked
                          ? "border-blue-600 bg-blue-600"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                      style={{ height: "18px", width: "18px" }}
                    >
                      {isChecked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>

                    <MiniAvatar url={user.profilePictureUrl} username={user.username} />

                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                        {user.username}
                      </p>
                      {user.roleName && (
                        <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                          {user.roleName}
                        </p>
                      )}
                    </div>

                    {isLead && (
                      <span className="flex-shrink-0 flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <Crown className="h-3 w-3" />
                        Lead
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* ── Team Lead ─────────────────────────────────────────────── */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <Crown className="h-3.5 w-3.5 text-amber-500" />
            Team Lead
            <span className="ml-1 text-gray-400 font-normal normal-case">(select from members above)</span>
          </label>
          <select
            id="team-lead-select"
            className={inputStyles}
            value={teamLeadUserId ?? ""}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              setTeamLeadUserId(val);
              // Auto-add lead as a member
              if (val !== null) {
                setMemberIds((prev) => new Set(Array.from(prev).concat([val])));
              }
            }}
          >
            <option value="">— No lead selected —</option>
            {eligibleLeads.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.username}{u.roleName ? ` (${u.roleName})` : ""}
              </option>
            ))}
          </select>
          {eligibleLeads.length === 0 && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Select at least one member first.
            </p>
          )}
        </div>

        {/* ── Submit ────────────────────────────────────────────────── */}
        <button
          id="create-team-submit"
          type="submit"
          disabled={!isFormValid || isLoading}
          className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            !isFormValid || isLoading ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Creating…
            </>
          ) : (
            <>
              <Users className="h-4 w-4" />
              Create Team
              {effectiveMemberIds.size > 0 && (
                <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-xs">
                  {effectiveMemberIds.size}
                </span>
              )}
            </>
          )}
        </button>
      </form>
    </Modal>
  );
};

export default ModalNewTeam;
