# 13 — Deployment Notes

Deploying TaskMatrix involves setting up infrastructure on AWS for the backend, database, and frontend.

## 1. Database Setup (AWS RDS)

- Create a PostgreSQL database instance in AWS RDS.
- Ensure the database is accessible from your backend EC2 instance (configure security groups appropriately).
- Copy the connection string and update the `DATABASE_URL` in the backend's `.env` file.
- Run `npx prisma migrate deploy` followed by `npm run seed` to initialize the production database schema and initial data.

## 2. Backend Deployment (AWS EC2)

The backend is deployed to an AWS EC2 instance. Detailed instructions are available in `server/aws-ec2-instructions.md`.

**High-Level Steps:**
1. Provision an EC2 instance (Amazon Linux or Ubuntu).
2. Install Node.js (via NVM) and Git.
3. Clone the repository and install backend dependencies (`npm i`).
4. Set up the `.env` file with required production variables:
   - `PORT=80` (or setup a reverse proxy like Nginx mapping 80/443 to your Node port).
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - AWS specific variables (`AWS_REGION`, `AWS_S3_BUCKET`). *Note: It is recommended to use EC2 IAM instance roles rather than hardcoding AWS Access Keys.*
5. Build the TypeScript code (`npm run build`).
6. Use **PM2** to manage the Node process:
   - Configure using `ecosystem.config.js`.
   - Start the server: `pm2 start ecosystem.config.js`.
   - Configure PM2 to start on system boot.

## 3. Frontend Deployment (AWS Amplify or Vercel)

The Next.js frontend can be deployed easily using platforms optimized for Next.js.

**If using AWS Amplify:**
1. Connect your repository to AWS Amplify Hosting.
2. Configure build settings to point to the `client/` directory.
3. Add environment variables in the Amplify console:
   - `NEXT_PUBLIC_API_BASE_URL` (pointing to your EC2 instance's IP or domain).
   - `NEXT_PUBLIC_COGNITO_USER_POOL_ID`
   - `NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID`
4. Deploy the application.

## 4. Other AWS Services

- **AWS Cognito**: Set up a User Pool and App Client for authentication. Do not generate a client secret if used in a web application.
- **AWS S3**: Create a bucket for image/file uploads. Ensure CORS settings allow PUT requests from your frontend domain. Ensure the bucket is public-read or configure CloudFront for secure asset delivery.
