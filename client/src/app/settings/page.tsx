"use client";

import Header from "@/components/Header";
import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setIsCompactMode } from "@/state";
import {
  Bell,
  Moon,
  Sun,
  Palette,
  ShieldCheck,
  MonitorSmartphone,
  MessageSquare,
  Mail,
  Slack,
  Github,
  Zap,
  CheckCircle2,
} from "lucide-react";

const Settings = () => {
  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const isCompactMode = useAppSelector((state) => state.global.isCompactMode);
  const [activeTab, setActiveTab] = useState("appearance");

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [taskAssignments, setTaskAssignments] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const tabs = [
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: ShieldCheck },
    { id: "integrations", label: "Integrations", icon: Zap },
  ];

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      type="button"
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
      }`}
      onClick={onChange}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <Header name="Application Settings" />

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-gray-900 px-5 py-3.5 text-sm font-medium text-white shadow-2xl dark:bg-gray-700">
          <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
          {toast}
        </div>
      )}

      <div className="mt-8 flex flex-col md:flex-row gap-8">
        {/* Left Sub-Navigation */}
        <div className="w-full md:w-64 shrink-0">
          <div className="flex flex-col gap-2 rounded-xl bg-white/50 p-3 shadow-sm backdrop-blur-md ring-1 ring-gray-200 dark:bg-black/50 dark:ring-gray-800">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/30 dark:text-blue-400"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-white"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 rounded-2xl bg-white/60 shadow-lg backdrop-blur-xl ring-1 ring-gray-200 dark:bg-gray-900/60 dark:ring-gray-800 transition-all duration-300">

          {/* APPEARANCE TAB */}
          {activeTab === "appearance" && (
            <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Appearance</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customize how the application looks and feels.</p>
              </div>
              <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-gray-100 pb-6 dark:border-gray-800">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Theme Preference</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark mode.</p>
                  </div>
                  <div className="flex bg-gray-100 p-1 rounded-lg dark:bg-gray-800">
                    <button
                      onClick={() => dispatch(setIsDarkMode(false))}
                      className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                        !isDarkMode ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      <Sun className="h-4 w-4" /> Light
                    </button>
                    <button
                      onClick={() => dispatch(setIsDarkMode(true))}
                      className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                        isDarkMode ? "bg-gray-900 text-white shadow-sm dark:bg-gray-600" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      <Moon className="h-4 w-4" /> Dark
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-6 dark:border-gray-800">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Compact Mode</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Reduce whitespace to fit more content on screen.
                      {isCompactMode && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          Active
                        </span>
                      )}
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={isCompactMode}
                    onChange={() => {
                      dispatch(setIsCompactMode(!isCompactMode));
                      showToast(isCompactMode ? "Compact mode disabled." : "Compact mode enabled — layout is now denser.");
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Notifications</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage how you receive alerts and updates.</p>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                      <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Email Notifications</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Receive daily summaries and critical alerts via email.</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={emailNotifs} onChange={() => {
                    setEmailNotifs(!emailNotifs);
                    showToast(`Email notifications ${!emailNotifs ? "enabled" : "disabled"}.`);
                  }} />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                      <MonitorSmartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Push Notifications</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Get instant alerts directly in your browser.</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={pushNotifs} onChange={() => {
                    setPushNotifs(!pushNotifs);
                    showToast(`Push notifications ${!pushNotifs ? "enabled" : "disabled"}.`);
                  }} />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                      <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Task Assignments</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Notify me immediately when I am assigned to a new task.</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={taskAssignments} onChange={() => {
                    setTaskAssignments(!taskAssignments);
                    showToast(`Task assignment notifications ${!taskAssignments ? "enabled" : "disabled"}.`);
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === "security" && (
            <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Security &amp; Access</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Managed securely through AWS Cognito.</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-6 dark:border-blue-900/30 dark:bg-blue-900/10">
                <ShieldCheck className="h-8 w-8 text-blue-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AWS Identity Provider</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Your password, two-factor authentication, and active sessions are managed securely by your organization&apos;s AWS Cognito provider. Please contact your IT administrator to update credentials.
                </p>
              </div>
            </div>
          )}

          {/* INTEGRATIONS TAB */}
          {activeTab === "integrations" && (
            <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Integrations</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Connect your favorite tools to streamline your workflow.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500">
                  <div className="flex items-center gap-3 mb-4">
                    <Slack className="h-8 w-8 text-[#E01E5A]" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Slack</h3>
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Coming Soon</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Send task updates and alerts directly to your Slack channels.</p>
                  <button
                    onClick={() => showToast("Slack integration is coming soon! We will notify you when it is ready.")}
                    className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-900 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-gray-700 dark:text-white dark:group-hover:bg-blue-500"
                  >
                    Notify Me
                  </button>
                </div>

                <div className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500">
                  <div className="flex items-center gap-3 mb-4">
                    <Github className="h-8 w-8 text-gray-900 dark:text-white" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">GitHub</h3>
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Coming Soon</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Link pull requests to tasks and auto-update statuses.</p>
                  <button
                    onClick={() => showToast("GitHub integration is coming soon! We will notify you when it is ready.")}
                    className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-900 transition-colors group-hover:bg-blue-600 group-hover:text-white dark:bg-gray-700 dark:text-white dark:group-hover:bg-blue-500"
                  >
                    Notify Me
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
