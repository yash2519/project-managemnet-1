"use client";

import Header from "@/components/Header";
import React, { useState, useEffect, useRef } from "react";
import { useGetAuthUserQuery, useGetTeamsQuery, useUpdateUserMutation, useUpdateProfilePictureMutation } from "@/state/api";
import Image from "next/image";
import { User as UserIcon, Camera, Loader2 } from "lucide-react";
import { useS3Upload } from "@/hooks/useS3Upload";

const Profile = () => {
  const { data: currentUser, refetch: refetchUser } = useGetAuthUserQuery({});
  const { data: teamsData } = useGetTeamsQuery();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [updateProfilePicture] = useUpdateProfilePictureMutation();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pictureError, setPictureError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleNameError, setRoleNameError] = useState("");

  const userDetails = currentUser?.userDetails || currentUser;
  const userId = userDetails?.userId;

  // Upload hook — profile picture specific
  const { upload, isUploading } = useS3Upload({
    uploadType: "profile-pictures",
    referenceId: userId,
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
    maxSizeMb: 5,
    onSuccess: async (confirmedUpload) => {
      // Update User.profilePictureUrl in the DB
      try {
        await updateProfilePicture({
          s3Key: confirmedUpload.s3Key,
          publicUrl: confirmedUpload.publicUrl,
        }).unwrap();
        // Re-fetch auth user so the new picture propagates everywhere
        refetchUser();
      } catch (err) {
        setPictureError("Picture uploaded but failed to save. Please try again.");
      }
    },
    onError: (err) => setPictureError(err),
  });

  useEffect(() => {
    const details = currentUser?.userDetails || currentUser;
    if (details) {
      setRoleName(details.roleName || "");
    }
  }, [currentUser]);

  // Clear avatar preview when the DB picture changes
  useEffect(() => {
    setAvatarPreview(null);
  }, [userDetails?.profilePictureUrl]);

  if (!currentUser) return null;

  const email = userDetails?.email || "Unknown";

  const validateInput = (value: string) => {
    if (!value) return "Role cannot be empty.";
    const regex = /^[a-zA-Z\s]+$/;
    if (!regex.test(value)) {
      return "Only alphabetic characters and spaces are allowed.";
    }
    return "";
  };

  const handleSave = async () => {
    if (!userDetails?.cognitoId) return;

    const trimmedRole = roleName.trim();

    setRoleName(trimmedRole);

    const rErr = validateInput(trimmedRole);
    setRoleNameError(rErr);

    if (rErr) return;

    try {
      await updateUser({
        cognitoId: userDetails.cognitoId,
        username: userDetails.username,
        roleName: trimmedRole,
      }).unwrap();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update user profile", error);
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRoleName(val);
    setRoleNameError(validateInput(val));
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPictureError(null);

    // Show instant local preview
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    await upload(file);

    // Clean up the object URL after the upload completes
    URL.revokeObjectURL(localUrl);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const currentPictureUrl = userDetails?.profilePictureUrl
    ? `https://pm-s3-images.s3.us-east-1.amazonaws.com/${userDetails.profilePictureUrl}`
    : null;

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

          {/* Avatar with camera overlay */}
          <div className="relative shrink-0">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              className="hidden"
              aria-label="Upload profile picture"
              onChange={handleAvatarFileChange}
            />

            {/* Avatar circle */}
            <div
              className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden shadow-inner ring-4 ring-white dark:ring-gray-900 cursor-pointer"
              onMouseEnter={() => setIsHoveringAvatar(true)}
              onMouseLeave={() => setIsHoveringAvatar(false)}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              role="button"
              aria-label="Change profile picture"
              title="Click to change profile picture"
            >
              {/* Profile picture or fallback */}
              {(avatarPreview || currentPictureUrl) ? (
                <Image
                  src={avatarPreview ?? currentPictureUrl!}
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

              {/* Upload spinner overlay */}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <Loader2 className="h-7 w-7 animate-spin text-white" />
                </div>
              )}

              {/* Camera hover overlay */}
              {!isUploading && (
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/50 transition-opacity duration-200 ${
                    isHoveringAvatar ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <Camera className="h-6 w-6 text-white" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-white">
                    Change
                  </span>
                </div>
              )}
            </div>

            {/* Upload progress ring */}
            {isUploading && (
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 shadow-md">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Name + role text */}
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userDetails?.username || "Unknown"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">{userDetails?.roleName || "Not Specified"}</p>

            {/* Error message under avatar block */}
            {pictureError && (
              <p className="mt-1 text-xs text-red-500">{pictureError}</p>
            )}

            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              Click the avatar to change your profile picture · Max 5 MB · JPG, PNG, WebP, GIF
            </p>
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
            <div className={textStyles}>
              {userDetails?.teams && userDetails.teams.length > 0
                ? userDetails.teams.map((t: any) => t.team?.teamName || t.teamName).filter(Boolean).join(", ")
                : "Unassigned"}
            </div>
          </div>
          <div>
            <label className={labelStyles}>Role</label>
            {isEditing ? (
              <div>
                <input
                  type="text"
                  className={inputStyles}
                  value={roleName}
                  onChange={handleRoleChange}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Please enter the complete role name. Avoid abbreviations.
                </p>
                {roleNameError && <p className="mt-1 text-sm text-red-500">{roleNameError}</p>}
              </div>
            ) : (
              <div className={textStyles}>{userDetails?.roleName || "Not Specified"}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
