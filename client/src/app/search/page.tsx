"use client";

import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { useSearchQuery } from "@/state/api";
import { debounce } from "lodash";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FolderOpen, CheckSquare, User as UserIcon, Search as SearchIcon } from "lucide-react";

const HighlightedText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  // Escape regex special characters from highlight
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedHighlight})`, "gi");
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-200 px-0.5 text-yellow-900 dark:bg-yellow-900/60 dark:text-yellow-100"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

const getSnippet = (text: string, highlight: string, length = 120) => {
  if (!text) return "";
  const trimmedHighlight = highlight.trim();
  if (!trimmedHighlight) return text.slice(0, length) + (text.length > length ? "..." : "");

  const index = text.toLowerCase().indexOf(trimmedHighlight.toLowerCase());
  if (index === -1) return text.slice(0, length) + (text.length > length ? "..." : "");

  const start = Math.max(0, index - Math.floor(length / 2));
  let snippet = text.slice(start, start + length);
  if (start > 0) snippet = "..." + snippet;
  if (start + length < text.length) snippet = snippet + "...";
  return snippet;
};

const SearchResultCard = ({
  type,
  title,
  subtitle,
  description,
  searchTerm,
  icon: Icon,
}: {
  type: "Project" | "Task" | "User";
  title: string;
  subtitle?: string | null;
  description?: string | null;
  searchTerm: string;
  icon: React.ElementType;
}) => {
  const typeStyles = {
    Project: {
      bg: "bg-blue-50 dark:bg-blue-900/30",
      text: "text-blue-600 dark:text-blue-400",
      badgeBg: "bg-blue-100 dark:bg-blue-900/50",
      badgeText: "text-blue-700 dark:text-blue-300",
    },
    Task: {
      bg: "bg-green-50 dark:bg-green-900/30",
      text: "text-green-600 dark:text-green-400",
      badgeBg: "bg-green-100 dark:bg-green-900/50",
      badgeText: "text-green-700 dark:text-green-300",
    },
    User: {
      bg: "bg-purple-50 dark:bg-purple-900/30",
      text: "text-purple-600 dark:text-purple-400",
      badgeBg: "bg-purple-100 dark:bg-purple-900/50",
      badgeText: "text-purple-700 dark:text-purple-300",
    },
  };

  const style = typeStyles[type];

  return (
    <div className="flex gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-dark-secondary">
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${style.bg} ${style.text}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.badgeBg} ${style.badgeText}`}>
            {type}
          </span>
          {subtitle && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              {subtitle}
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold text-gray-900 truncate dark:text-white">
          <HighlightedText text={title} highlight={searchTerm} />
        </h3>
        {description && (
          <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            <HighlightedText text={getSnippet(description, searchTerm)} highlight={searchTerm} />
          </p>
        )}
      </div>
    </div>
  );
};

const SearchContent = () => {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);

  useEffect(() => {
    setSearchTerm(initialQuery);
    setSearchInput(initialQuery);
  }, [initialQuery]);

  const cleanSearchTerm = searchTerm.trim();

  const {
    data: searchResults,
    isLoading,
    isError,
  } = useSearchQuery(
    { query: cleanSearchTerm },
    {
      skip: cleanSearchTerm.length < 1,
    }
  );

  const handleSearch = React.useMemo(
    () =>
      debounce((value: string) => {
        setSearchTerm(value);
      }, 500),
    []
  );

  useEffect(() => {
    return handleSearch.cancel;
  }, [handleSearch.cancel]);

  const hasResults =
    searchResults &&
    ((searchResults.tasks && searchResults.tasks.length > 0) ||
      (searchResults.projects && searchResults.projects.length > 0) ||
      (searchResults.users && searchResults.users.length > 0));

  return (
    <div className="mx-auto w-full max-w-5xl p-8">
      <Header name="Global Search" />
      <div className="mb-8 mt-6 relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search projects, tasks, descriptions, and more..."
          className="w-full rounded-xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-gray-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-dark-secondary dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500"
          onChange={(e) => {
            setSearchInput(e.target.value);
            handleSearch(e.target.value);
          }}
          value={searchInput}
        />
      </div>

      <div className="mt-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-500"></div>
          </div>
        )}
        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
            <p className="font-medium">An error occurred while fetching search results.</p>
            <p className="mt-1 text-sm">Please try again later.</p>
          </div>
        )}

        {!isLoading && !isError && searchResults && !hasResults && cleanSearchTerm.length > 0 && (
          <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-dark-secondary">
            <EmptyState
              title={`No results found for "${cleanSearchTerm}"`}
              description="We couldn't find anything matching your search. Try checking for typos or using different keywords."
            />
          </div>
        )}

        {!isLoading && !isError && searchResults && hasResults && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {searchResults.projects && searchResults.projects.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Projects
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {searchResults.projects.length}
                  </span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {searchResults.projects.map((project) => (
                    <Link href={`/projects/${project.id}`} key={project.id}>
                      <SearchResultCard
                        type="Project"
                        title={project.name}
                        description={project.description}
                        searchTerm={cleanSearchTerm}
                        icon={FolderOpen}
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {searchResults.tasks && searchResults.tasks.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Tasks
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {searchResults.tasks.length}
                  </span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {searchResults.tasks.map((task) => (
                    <Link href={`/projects/${task.projectId}?taskId=${task.id}`} key={task.id}>
                      <SearchResultCard
                        type="Task"
                        title={task.title}
                        subtitle={task.project ? `Project: ${task.project.name}` : undefined}
                        description={task.description}
                        searchTerm={cleanSearchTerm}
                        icon={CheckSquare}
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {searchResults.users && searchResults.users.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Users
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {searchResults.users.length}
                  </span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {searchResults.users.map((user) => (
                    <Link href="/users" key={user.userId}>
                      <SearchResultCard
                        type="User"
                        title={user.username}
                        subtitle={user.roleName || "Member"}
                        description={user.email}
                        searchTerm={cleanSearchTerm}
                        icon={UserIcon}
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Search = () => {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-500"></div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
};

export default Search;
