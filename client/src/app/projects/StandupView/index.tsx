import React, { useState } from "react";
import { 
  useGetTodayStandupQuery, 
  useRegenerateStandupMutation,
  useGetStandupByDateQuery,
  useCompareStandupsQuery
} from "@/state/api";
import {
  Users, Calendar, AlertTriangle, CheckCircle, Clock, Lightbulb,
  RefreshCw, AlertCircle, Download, Copy, FileText, FileDown,
  Eye, EyeOff, Sparkles, Database, AlertOctagon, Filter
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import StandupFilterBar from "./StandupFilterBar";
import StandupHistoryPanel from "./StandupHistoryPanel";
import StandupComparisonView from "./StandupComparisonView";
import { AnalysisFilters, AIStandupResponse } from "@/types";

type Props = {
  id: string;
};

const StandupView = ({ id }: Props) => {
  const projectId = Number(id);
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  const [compareDates, setCompareDates] = useState<{ dateA: string; dateB: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Queries
  const { data: todayData, isLoading: isLoadingToday, isError: isErrorToday, error: errorToday, refetch: refetchToday, isFetching: isFetchingToday } = useGetTodayStandupQuery({ projectId });
  const { data: dateData, isLoading: isLoadingDate, isError: isErrorDate, error: errorDate, isFetching: isFetchingDate } = useGetStandupByDateQuery({ projectId, date: selectedDate! }, { skip: !selectedDate });
  
  const [regenerate, { isLoading: isRegenerating }] = useRegenerateStandupMutation();
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [customData, setCustomData] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<AnalysisFilters>({});

  const handleRegenerate = async (filters?: AnalysisFilters) => {
    try {
      const result = await regenerate({ 
        projectId, 
        date: activeTab === "history" && selectedDate ? selectedDate : undefined,
        filters: filters || activeFilters 
      }).unwrap();
      
      const hasFilters = (filters || activeFilters) && Object.keys(filters || activeFilters).length > 0;
      if (hasFilters) {
        // If we used filters, we don't refetch the default data, we just store it locally
        // We simulate the DB result structure so the rest of the component works
        setCustomData({
          date: new Date().toISOString(),
          summary: {
            yesterday: result.yesterday,
            today: result.today,
            blockers: result.blockers,
            teamSummary: result.teamSummary
          },
          generatedStandup: `Yesterday: ${result.yesterday}\nToday: ${result.today}\nBlockers: ${result.blockers}\nTeam Summary: ${result.teamSummary}`,
          aiRecommendations: result.aiRecommendations,
          isRegenerated: true,
          generatedAt: new Date().toISOString()
        });
      } else {
        setCustomData(null);
        if (activeTab === "today") refetchToday();
      }
    } catch (e) {
      console.error("Failed to generate/regenerate standup:", e);
    }
  };

  const handleApplyFilters = (filters: AnalysisFilters) => {
    setActiveFilters(filters);
    const hasFilters = Object.keys(filters).length > 0;
    if (hasFilters) {
      handleRegenerate(filters);
    } else {
      setCustomData(null);
    }
  };

  const isLoading = activeTab === "today" ? isLoadingToday : (selectedDate ? isLoadingDate : false);
  const isFetching = activeTab === "today" ? isFetchingToday : (selectedDate ? isFetchingDate : false);
  const isError = activeTab === "today" ? isErrorToday : (selectedDate ? isErrorDate : false);
  const error = activeTab === "today" ? errorToday : (selectedDate ? errorDate : false);
  
  let data = customData;
  if (!data) {
    if (activeTab === "today") data = todayData;
    else if (selectedDate) data = dateData;
  }

  // ---------------------------------------------------------------------------
  // Loading / Error / Empty states
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
        <p className="mt-4 text-sm text-gray-500 dark:text-neutral-400">Analyzing project activity and generating standup...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center p-8">
        <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Error Generating Standup</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
          {(error as any)?.data?.message || "An unexpected error occurred while generating the standup report."}
        </p>
        <button
          onClick={() => {
            if (activeTab === "today") refetchToday();
          }}
          className="mt-6 flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          <RefreshCw className="h-4 w-4" /> Try Again
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // View Routing
  // ---------------------------------------------------------------------------
  if (compareDates) {
    return (
      <div className="mx-4 mb-4 mt-6 xl:mx-6">
        <StandupComparisonView 
          projectId={projectId} 
          dateA={compareDates.dateA} 
          dateB={compareDates.dateB} 
          onClose={() => setCompareDates(null)} 
        />
      </div>
    );
  }

  if (activeTab === "history" && !selectedDate) {
    return (
      <div className="mx-4 mb-4 mt-6 xl:mx-6">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-dark-tertiary">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("today")}
              className="whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
            >
              Today&apos;s Standup
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className="whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
            >
              Standup History
            </button>
          </nav>
        </div>

        <StandupHistoryPanel 
          projectId={projectId} 
          onSelectDate={(date) => setSelectedDate(date)}
          onCompare={(dateA, dateB) => setCompareDates({ dateA, dateB })}
        />
      </div>
    );
  }

  const isWorking = isLoading || isFetching || isRegenerating;

  if (!data) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center p-8">
        <Users className="mb-4 h-12 w-12 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">No Standup Data Available</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-neutral-400">
          We couldn&apos;t generate a standup for this project.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Data extraction
  // ---------------------------------------------------------------------------
  const { date, summary, generatedStandup, aiRecommendations, isRegenerated, generatedAt } = data;

  const generatedDate = generatedAt ? new Date(generatedAt) : null;
  const minutesSinceGeneration = generatedDate
    ? Math.round((Date.now() - generatedDate.getTime()) / 60000)
    : null;
  const isStale = minutesSinceGeneration !== null && minutesSinceGeneration > 120; // 2 hours

  // ---------------------------------------------------------------------------
  // Export helpers
  // ---------------------------------------------------------------------------
  const getMarkdown = () => {
    return `# Daily Standup Report - ${date ? formatDate(date) : "Today"}

## What was accomplished (Yesterday)
${summary?.yesterday || "No accomplishments reported."}

## What we are doing (Today)
${summary?.today || "No active work reported."}

## Blockers & Risks
${summary?.blockers || "No blockers reported."}

## Team Summary
${summary?.teamSummary || "No team summary available."}

## AI Recommendations
${aiRecommendations?.map((r: string) => `- ${r}`).join("\n") || "None"}
`;
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(getMarkdown());
    setCopySuccess(true);
    setIsExportMenuOpen(false);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([getMarkdown()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `standup-${date?.split("T")[0] || "today"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Standup Report - ${date?.split("T")[0] || "Today"}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1f2937; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            h1 { border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 32px; color: #111827; }
            h2 { color: #374151; margin-top: 32px; margin-bottom: 16px; font-size: 1.25rem; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; }
            .blockers h2 { color: #b91c1c; border-bottom-color: #fee2e2; }
            .blockers p { color: #991b1b; }
            p { margin-bottom: 16px; white-space: pre-wrap; }
            ul { margin-top: 8px; margin-bottom: 16px; padding-left: 24px; }
            li { margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <h1>Daily Standup Report - ${date ? formatDate(date) : "Today"}</h1>

          <h2>What was accomplished (Yesterday)</h2>
          <p>${summary?.yesterday || "None"}</p>

          <h2>What we are doing (Today)</h2>
          <p>${summary?.today || "None"}</p>

          <div class="blockers">
            <h2>Blockers & Risks</h2>
            <p>${summary?.blockers || "None"}</p>
          </div>

          <h2>Team Summary</h2>
          <p>${summary?.teamSummary || "None"}</p>

          <h2>AI Recommendations</h2>
          <ul>
            ${aiRecommendations?.map((r: string) => `<li>${r}</li>`).join("") || "<li>None</li>"}
          </ul>

          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    setIsExportMenuOpen(false);
  };

  // ---------------------------------------------------------------------------
  // Render (Single Standup View)
  // ---------------------------------------------------------------------------
  return (
    <div className="mx-4 mb-4 mt-6 space-y-6 xl:mx-6">
      
      {/* Tabs (only show if not viewing a specific historical date deeply) */}
      {!selectedDate && (
        <div className="border-b border-gray-200 dark:border-dark-tertiary">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("today")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === "today"
                  ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
              }`}
            >
              Today&apos;s Standup
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === "history"
                  ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
              }`}
            >
              Standup History
            </button>
          </nav>
        </div>
      )}

      {selectedDate && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedDate(null)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:hover:bg-gray-800"
          >
            ← Back to History
          </button>
        </div>
      )}

      <StandupFilterBar onApplyFilters={handleApplyFilters} isGenerating={isRegenerating} />

      {/* ── Header Card ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-dark-secondary dark:bg-dark-secondary">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
              <Users className="h-5 w-5 text-blue-500" />
              Daily Standup Report
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-neutral-400">
              <Calendar className="h-4 w-4" />
              <span>{date ? formatDate(date) : "Today"}</span>
              <span className="mx-1">•</span>
              <Clock className="h-4 w-4" />
              <span>Generated {generatedDate?.toLocaleTimeString() ?? "—"}</span>
              {isRegenerated && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Regenerated
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 relative">
            {/* Preview toggle */}
            <button
              onClick={() => setIsPreviewOpen(!isPreviewOpen)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
                isPreviewOpen
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-400"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:hover:bg-gray-800"
              }`}
            >
              {isPreviewOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isPreviewOpen ? "Close Preview" : "Preview"}
            </button>

            {/* Regenerate */}
            <button
              onClick={() => handleRegenerate()}
              disabled={isWorking}
              className={`flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:hover:bg-gray-800 ${
                isWorking ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${isWorking ? "animate-spin" : ""}`} />
              {isWorking ? "Regenerating…" : "Regenerate"}
            </button>

            {/* Export dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:hover:bg-gray-800"
              >
                <Download className="h-4 w-4" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-dark-secondary dark:ring-white dark:ring-opacity-10 z-10">
                  <div className="py-1">
                    <button
                      onClick={handleCopyClipboard}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-tertiary"
                    >
                      <Copy className="h-4 w-4" /> Copy to Clipboard
                    </button>
                    <button
                      onClick={handleDownloadMarkdown}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-tertiary"
                    >
                      <FileText className="h-4 w-4" /> Download Markdown
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-tertiary"
                    >
                      <FileDown className="h-4 w-4" /> Download as PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Copy success toast */}
        {copySuccess && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle className="h-4 w-4" /> Copied to clipboard
          </div>
        )}

        {/* Stale data banner */}
        {isStale && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <AlertOctagon className="h-4 w-4 shrink-0" />
              <span>This standup was generated {minutesSinceGeneration} minutes ago. Project activity may have changed.</span>
            </div>
            <button
              onClick={() => handleRegenerate()}
              disabled={isWorking}
              className="ml-4 shrink-0 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              Refresh Now
            </button>
          </div>
        )}
      </div>

      {/* ── Preview Panel (collapsible) ──────────────────────────────────── */}
      {isPreviewOpen && (
        <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-6 dark:border-blue-800 dark:bg-blue-900/10">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-blue-800 dark:text-blue-300">
              <Eye className="h-5 w-5" />
              Standup Preview — Ready for Sharing
            </h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                <Database className="h-3 w-3" /> Structured Data
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                <Sparkles className="h-3 w-3" /> AI Generated
              </span>
            </div>
          </div>

          {/* Preview content */}
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 dark:border-dark-tertiary dark:bg-dark-secondary">
            <div>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-neutral-500">
                Date
              </h4>
              <p className="text-gray-800 dark:text-white">{date ? formatDate(date) : "Today"}</p>
            </div>

            <hr className="border-gray-100 dark:border-dark-tertiary" />

            {/* Structured sections */}
            <SectionLabel icon={<Database className="h-3 w-3" />} label="Structured Data" variant="structured" />
            <PreviewSection title="Yesterday" content={summary?.yesterday} fallback="No accomplishments reported." />
            <PreviewSection title="Today" content={summary?.today} fallback="No active work reported." />
            <PreviewSection title="Blockers & Risks" content={summary?.blockers} fallback="No blockers reported." isBlocker />
            <PreviewSection title="Team Summary" content={summary?.teamSummary} fallback="No team summary available." />

            <hr className="border-gray-100 dark:border-dark-tertiary" />

            {/* AI sections */}
            <SectionLabel icon={<Sparkles className="h-3 w-3" />} label="AI Generated" variant="ai" />

            {aiRecommendations && aiRecommendations.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-violet-700 dark:text-violet-400">Recommendations</h4>
                <ul className="space-y-1.5 pl-1">
                  {aiRecommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {generatedStandup && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-violet-700 dark:text-violet-400">AI Narrative</h4>
                <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-4 text-sm text-gray-700 whitespace-pre-wrap dark:border-violet-900/30 dark:bg-violet-900/10 dark:text-gray-300">
                  {generatedStandup}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main Content Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Structured Data */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          <div className="mb-1 flex items-center gap-2">
            <Database className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-500">
              Structured Project Data
            </span>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-dark-tertiary dark:bg-dark-tertiary">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-neutral-300">
              <CheckCircle className="h-5 w-5 text-green-500" />
              What was accomplished (Yesterday)
            </h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{summary?.yesterday || "No accomplishments reported."}</p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-dark-tertiary dark:bg-dark-tertiary">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-neutral-300">
              <ActivityIcon />
              What we are doing (Today)
            </h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{summary?.today || "No active work reported."}</p>
          </div>

          <div className="rounded-xl border border-red-100 bg-red-50 p-5 dark:border-red-900/30 dark:bg-red-900/10">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Blockers & Risks
            </h3>
            <p className="text-red-800 dark:text-red-300 whitespace-pre-wrap">{summary?.blockers || "No blockers reported."}</p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-dark-tertiary dark:bg-dark-tertiary">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-neutral-300">
              Team Summary
            </h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{summary?.teamSummary || "No team summary available."}</p>
          </div>
        </div>

        {/* Right Column: AI-Generated Content */}
        <div className="col-span-1 flex flex-col gap-6">
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400 dark:text-violet-500">
              AI-Generated Insights
            </span>
          </div>

          {aiRecommendations && aiRecommendations.length > 0 && (
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-5 dark:border-violet-900/30 dark:bg-violet-900/10">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">
                <Lightbulb className="h-5 w-5" />
                AI Recommendations
              </h3>
              <ul className="flex flex-col gap-3">
                {aiRecommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-violet-900 dark:text-violet-300">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm dark:border-violet-900/30 dark:bg-dark-secondary">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
              <Sparkles className="h-4 w-4" />
              AI Narrative
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
              {generatedStandup ? (
                <div className="whitespace-pre-wrap">{generatedStandup}</div>
              ) : (
                <p>No AI narrative available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Helper Components ──────────────────────────────────────────────────────

const SectionLabel = ({ icon, label, variant }: { icon: React.ReactNode; label: string; variant: "structured" | "ai" }) => {
  const colors = variant === "ai"
    ? "text-violet-600 dark:text-violet-400"
    : "text-gray-500 dark:text-neutral-400";
  return (
    <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${colors}`}>
      {icon} {label}
    </div>
  );
};

const PreviewSection = ({ title, content, fallback, isBlocker }: { title: string; content?: string; fallback: string; isBlocker?: boolean }) => (
  <div>
    <h4 className={`mb-1 text-sm font-semibold ${isBlocker ? "text-red-700 dark:text-red-400" : "text-gray-800 dark:text-white"}`}>{title}</h4>
    <p className={`text-sm whitespace-pre-wrap ${isBlocker ? "text-red-600 dark:text-red-300" : "text-gray-600 dark:text-gray-400"}`}>
      {content || fallback}
    </p>
  </div>
);

const ActivityIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-blue-500"
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

export default StandupView;
