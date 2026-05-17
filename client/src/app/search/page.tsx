"use client";

import Header from "@/components/Header";
import ProjectCard from "@/components/ProjectCard";
import TaskCard from "@/components/TaskCard";
import UserCard from "@/components/UserCard";
import EmptyState from "@/components/EmptyState";
import { useGetAuthUserQuery, useSearchQuery } from "@/state/api";
import { debounce } from "lodash";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const SearchContent = () => {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);

  useEffect(() => {
    setSearchTerm(initialQuery);
    setSearchInput(initialQuery);
  }, [initialQuery]);
  const { data: currentUser } = useGetAuthUserQuery({});
  const userId = currentUser?.userId || currentUser?.userDetails?.userId;

  const {
    data: searchResults,
    isLoading,
    isError,
  } = useSearchQuery({ query: searchTerm, userId }, {
    skip: searchTerm.length < 1,
  });

  const handleSearch = React.useMemo(() => debounce(
    (value: string) => {
      setSearchTerm(value);
    },
    500,
  ), []);

  useEffect(() => {
    return handleSearch.cancel;
  }, [handleSearch.cancel]);

  return (
    <div className="p-8">
      <Header name="Search" />
      <div>
        <input
          type="text"
          placeholder="Search..."
          className="w-1/2 rounded border p-3 shadow dark:border-dark-secondary dark:bg-dark-secondary dark:text-white"
          onChange={(e) => {
            setSearchInput(e.target.value);
            handleSearch(e.target.value);
          }}
          value={searchInput}
        />
      </div>
      <div className="p-5">
        {isLoading && <p>Loading...</p>}
        {isError && <p>Error occurred while fetching search results.</p>}
        {!isLoading && !isError && searchResults && (
          <div>
            {(!searchResults.tasks || searchResults.tasks.length === 0) &&
            (!searchResults.projects || searchResults.projects.length === 0) &&
            (!searchResults.users || searchResults.users.length === 0) ? (
              <div className="mt-8">
                <EmptyState
                  title="No results found"
                  description="We couldn't find any tasks, projects, or users matching your search term."
                />
              </div>
            ) : (
              <>
                {searchResults.tasks && searchResults.tasks?.length > 0 && (
                  <h2 className="text-lg font-semibold mb-3 dark:text-white">Tasks</h2>
                )}
                <div className="flex flex-col gap-3 mb-6">
                  {searchResults.tasks?.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>

                {searchResults.projects && searchResults.projects?.length > 0 && (
                  <h2 className="text-lg font-semibold mb-3 dark:text-white">Projects</h2>
                )}
                <div className="flex flex-col gap-3 mb-6">
                  {searchResults.projects?.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>

                {searchResults.users && searchResults.users?.length > 0 && (
                  <h2 className="text-lg font-semibold mb-3 dark:text-white">Users</h2>
                )}
                <div className="flex flex-col gap-3">
                  {searchResults.users?.map((user) => (
                    <UserCard key={user.userId} user={user} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Search = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
};

export default Search;
