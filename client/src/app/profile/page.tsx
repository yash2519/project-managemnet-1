"use client";

import Header from "@/components/Header";
import React, { useState, useEffect } from "react";
import { useGetAuthUserQuery, useGetTeamsQuery, useUpdateUserMutation } from "@/state/api";
import Image from "next/image";
import { User as UserIcon } from "lucide-react";

const Profile = () => {
  const { data: currentUser } = useGetAuthUserQuery({});
  const { data: teamsData } = useGetTeamsQuery();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [teamIds, setTeamIds] = useState<number[]>([]);

  useEffect(() => {
    const details = currentUser?.userDetails || currentUser;
    if (details) {
      setRoleName(details.roleName || "");
      setTeamIds(details.teams?.map((t: any) => t.teamId) || []);
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const userDetails = currentUser.userDetails || currentUser;
  const email = userDetails?.email || "Unknown";

  const handleSave = async () => {
    if (!userDetails?.cognitoId) return;
    try {
      await updateUser({
        cognitoId: userDetails.cognitoId,
        username: userDetails.username,
        roleName,
        teamIds,
      }).unwrap();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update user profile", error);
    }
  };

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map((opt) =>
      Number(opt.value)
    );
    setTeamIds(selectedOptions);
  };

  const labelStyles = "block text-sm font-medium text-gray-500 dark:text-gray-400";
  const textStyles =
    "mt-1 block w-full border border-gray-200 rounded-lg bg-gray-50 p-3 text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white";
  const inputStyles =
    "mt-1 block w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:border-blue-500 focus:ring-blue-500 shadow-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Header name="Profile Details" />
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition"
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              disabled={isUpdating}
            >
              {isUpdating ? "Saving..." : "Save"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-primary text-white rounded hover:bg-blue-600 transition"
          >
            Edit Profile
          </button>
        )}
      </div>

      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
        <div className="mb-8 flex items-center gap-6 border-b border-gray-200 pb-8 dark:border-gray-700">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden shadow-inner ring-4 ring-white dark:ring-gray-900">
            {userDetails?.profilePictureUrl ? (
              <Image
                src={`https://pm-s3-images.s3.us-east-1.amazonaws.com/${userDetails?.profilePictureUrl}`}
                alt="Profile"
                width={100}
                height={100}
                className="h-full w-full object-cover"
                onError={(e) => {
                  if (e.currentTarget.src.includes("ui-avatars.com")) return;
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${userDetails?.username}`;
                  e.currentTarget.srcset = "";
                }}
              />
            ) : (
              <UserIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userDetails?.username || "Unknown"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">{userDetails?.roleName || "Unassigned Role"}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className={labelStyles}>Username</label>
            <div className={textStyles}>{userDetails?.username || "Unknown"}</div>
          </div>
          <div>
            <label className={labelStyles}>Email</label>
            <div className={textStyles}>{email}</div>
          </div>
          <div>
            <label className={labelStyles}>Teams</label>
            {isEditing ? (
              <select
                multiple
                className={`${inputStyles} h-32`}
                value={teamIds.map(String)}
                onChange={handleTeamChange}
              >
                {teamsData?.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            ) : (
              <div className={textStyles}>
                {userDetails?.teams && userDetails.teams.length > 0
                  ? userDetails.teams.map((t: any) => t.teamName).join(", ")
                  : "Unassigned"}
              </div>
            )}
          </div>
          <div>
            <label className={labelStyles}>Role</label>
            {isEditing ? (
              <input
                type="text"
                className={inputStyles}
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              />
            ) : (
              <div className={textStyles}>{userDetails?.roleName || "Unassigned"}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
