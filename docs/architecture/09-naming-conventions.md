# 09 — Naming Conventions

Consistency in naming helps maintain a readable and predictable codebase.

## Files and Directories

### Frontend
- **React Components**: Use PascalCase for filenames and directory names (e.g., `TaskCard.tsx`, `Sidebar/index.tsx`).
- **Next.js Routes**: Use lowercase, kebab-case for route directories (e.g., `app/projects/`, `app/timeline/`). Dynamic routes use brackets (e.g., `[id]`).
- **Hooks**: Use camelCase starting with `use` (e.g., `useS3Upload.ts`).
- **Utilities/Lib**: Use camelCase (e.g., `utils.ts`, `api.ts`).

### Backend
- **Controllers**: Use camelCase ending in `Controller` (e.g., `taskController.ts`).
- **Routes**: Use camelCase ending in `Routes` (e.g., `taskRoutes.ts`).
- **Services**: Use camelCase ending in `Service` (e.g., `s3Service.ts`).

## Code Elements

### TypeScript / JavaScript
- **Variables & Functions**: Use camelCase (e.g., `fetchTasks`, `isSidebarCollapsed`).
- **Interfaces & Types**: Use PascalCase (e.g., `Project`, `TaskAssignment`). Do not prefix with `I` (e.g., use `User`, not `IUser`).
- **Enums**: Use PascalCase for the enum name, and UPPER_SNAKE_CASE for the values (e.g., `UploadType.PROFILE_PICTURE`).
- **Constants**: Use UPPER_SNAKE_CASE for global constants (e.g., `MAX_FILE_SIZE_BYTES`, `DEFAULT_ALLOWED_MIME_TYPES`).
- **Components**: Use PascalCase for React component function names (e.g., `const TaskCard = () => { ... }`).

### Database (Prisma)
- **Models**: Use PascalCase (e.g., `model User`, `model ProjectTeam`).
- **Fields**: Use camelCase (e.g., `userId`, `teamName`, `createdAt`).
- **Foreign Keys**: Typically use the related model name followed by `Id` (e.g., `projectId`, `authorUserId`).

### API Endpoints
- Use lowercase, plural nouns for resource paths (e.g., `/projects`, `/tasks`).
- Use kebab-case for multi-word path segments (e.g., `/me/profile-picture`).
- HTTP verbs should map to actions: `GET` (read), `POST` (create), `PATCH` (update partial), `DELETE` (remove).
