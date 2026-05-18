"use client";

import React from "react";
import {
  Users,
  PlusSquare,
  Layout,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";

const WelcomePage = () => {
  const steps = [
    {
      title: "Create your first Team",
      description: "Teams are the heart of collaboration. Start by giving yours a name.",
      icon: <Users className="h-8 w-8 text-blue-500" />,
      link: "/teams",
      cta: "Go to Teams",
    },
    {
      title: "Invite your Colleagues",
      description: "Search for existing users and add them to your team instantly.",
      icon: <Users className="h-8 w-8 text-green-500" />,
      link: "/teams", // Adjust if there's a specific invite route
      cta: "Invite Members",
    },
    {
      title: "Start a Project",
      description: "Organize your work into projects and set clear deadlines.",
      icon: <Layout className="h-8 w-8 text-purple-500" />,
      link: "/projects",
      cta: "Create Project",
    },
    {
      title: "Assign Tasks",
      description: "Break down projects into actionable tasks and track progress.",
      icon: <CheckCircle2 className="h-8 w-8 text-orange-500" />,
      link: "/tasks",
      cta: "Add Tasks",
    },
  ];

  return (
    <div className="flex w-full flex-col p-8">
      <Header name="Welcome to TaskMatrix" />
      <p className="mb-10 text-lg text-gray-600 dark:text-gray-400">
        Let&apos;s get you set up with your new project management workspace.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
          >
            <div>
              <div className="mb-4 rounded-full bg-gray-50 p-3 inline-block dark:bg-gray-800">
                {step.icon}
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                {step.title}
              </h3>
              <p className="mb-6 text-gray-500 dark:text-gray-400">
                {step.description}
              </p>
            </div>
            <Link
              href={step.link}
              className="flex items-center font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {step.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-10 text-white shadow-xl">
        <h2 className="mb-4 text-3xl font-bold">Need help getting started?</h2>
        <p className="mb-8 text-lg text-blue-100 max-w-2xl">
          Check out our documentation or reach out to your team administrator for a quick walkthrough of the dashboard features.
        </p>
        <button className="rounded-lg bg-white px-6 py-3 font-bold text-blue-600 shadow-lg transition-transform hover:scale-105">
          View Quick Start Guide
        </button>
      </div>
    </div>
  );
};

export default WelcomePage;
