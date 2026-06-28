# 02 — Folder Structure

The repository is structured as a monorepo containing two main directories: `client` and `server`.

## Root Directory

```text
/
├── client/                 # Next.js frontend application
├── server/                 # Node.js + Express backend application
├── docs/                   # Documentation (including this architecture guide)
└── README.md               # Main project setup guide
```

## Client Directory Structure (`/client`)

The frontend follows the Next.js App Router conventions with a Redux Toolkit state management setup.

```text
client/
├── public/                 # Static assets (images, icons)
├── src/
│   ├── app/                # Next.js App Router root
│   │   ├── home/           # Route: Home dashboard
│   │   ├── projects/       # Route: Projects list and details
│   │   ├── tasks/          # Route: Tasks management
│   │   ├── teams/          # Route: Teams management
│   │   ├── users/          # Route: Users list
│   │   ├── timeline/       # Route: Gantt timeline view
│   │   ├── authProvider.tsx # AWS Cognito authentication wrapper
│   │   ├── dashboardWrapper.tsx # Layout wrapper with sidebar and navbar
│   │   ├── globals.css     # Global styles (Tailwind, custom Gantt chart CSS)
│   │   ├── layout.tsx      # Root layout
│   │   └── redux.tsx       # Redux store provider and persistence setup
│   ├── components/         # Reusable UI components
│   │   ├── Header/         # Page header component
│   │   ├── Modal*/         # Various modal components (Task, Project edit/create)
│   │   ├── Navbar/         # Top navigation bar
│   │   ├── Sidebar/        # Side navigation menu
│   │   └── ...             # Other shared components (TaskCard, ProjectCard, etc.)
│   ├── hooks/              # Custom React hooks
│   │   └── useS3Upload.ts  # Hook for managing AWS S3 file uploads
│   ├── lib/                # Utility functions
│   │   └── utils.ts        # DataGrid styles, date formatting
│   └── state/              # Redux Toolkit state management
│       ├── api.ts          # RTK Query API slice (endpoints for all backend resources)
│       └── index.ts        # Global slice (UI state: sidebar, dark mode)
├── tailwind.config.ts      # Tailwind CSS configuration
├── next.config.mjs         # Next.js configuration (configured remote patterns for images)
└── package.json            # Frontend dependencies
```

## Server Directory Structure (`/server`)

The backend follows a standard Express MVC-like pattern (Routes -> Controllers -> Services).

```text
server/
├── prisma/                 # Database schema and seed data
│   ├── migrations/         # Prisma migration history
│   ├── seedData/           # JSON files for initial database seeding
│   ├── schema.prisma       # Prisma schema definition
│   └── seed.ts             # Script to populate the database
├── src/
│   ├── controllers/        # Request handlers (business logic)
│   │   ├── activityController.ts
│   │   ├── aiController.ts # Google Gemini AI integration
│   │   ├── projectController.ts
│   │   ├── searchController.ts
│   │   ├── taskController.ts
│   │   ├── teamController.ts
│   │   ├── uploadController.ts
│   │   └── userController.ts
│   ├── middleware/         # Express middleware
│   │   └── auth.ts         # JWT decoding and user lookup (Cognito integration)
│   ├── routes/             # Express route definitions
│   │   └── *Routes.ts      # Route mappings for each resource
│   ├── services/           # Shared business logic and external service integrations
│   │   └── s3Service.ts    # AWS S3 presigned URL generation and file deletion
│   └── index.ts            # Express server entry point and configuration
├── .env.example            # Example environment variables
├── aws-ec2-instructions.md # Deployment instructions for AWS EC2
├── ecosystem.config.js     # PM2 configuration for production process management
└── package.json            # Backend dependencies
```
