# Product Requirements Document (PRD)

## Simple Carrier

---

## 1. Overview

### 1.1 Product Name
Simple Carrier

### 1.2 Product Summary
Simple Carrier is a container-based platform that enables administrators to deploy and manage application repositories or binaries within Docker containers through a web-based interface.

### 1.3 Problem Statement
Managing and deploying applications across different environments requires significant infrastructure setup and maintenance. Administrators need a streamlined way to define, deploy, and monitor applications running in containers without complex orchestration tools.

### 1.4 Solution
A self-contained web server running inside a Docker container that provides:
- A centralized dashboard for managing applications
- Every application has different environments/stages
- Every environment/stage has its own environment variables
- Support for deploying app repositories or binaries
- Secure authentication via email and OAuth

---

## 2. Goals and Objectives

### 2.1 Primary Goals
- Provide a simple, containerized solution for running and managing applications
- Provide a webhook system to simplify the CI/CD process of an application
- Enable administrators to easily define and deploy application, their environnments variables and the repositories or binaries
- Offer secure access through multiple authentication methods

### 2.2 Success Metrics
- Successful deployment of applications through the dashboard
- User authentication success rate
- Container stability and uptime
- Time to deploy new applications

---

## 3. User Personas

### 3.1 System Administrator
- **Role**: Manages infrastructure and deployments
- **Needs**: Easy-to-use interface for deploying and monitoring applications
- **Pain Points**: Complex orchestration tools, manual deployment processes

### 3.2 Developer
- **Role**: Builds and deploys applications
- **Needs**: Quick deployment of repositories for testing and staging
- **Pain Points**: Environment inconsistencies, slow deployment cycles

---

## 4. Features and Requirements

### 4.1 Core Features

#### 4.1.1 Docker Container Infrastructure
- **Description**: Dockerfile that builds the complete application image
- **Priority**: High
- **Requirements**:
  - Self-contained Docker image with all dependencies
  - The docker image must use `node:22-alpine` as base image
  - Configurable environment variables
  - Lightweight and optimized for performance

#### 4.1.2 Web Server Application
- **Description**: Server application built with modern TypeScript stack
- **Priority**: High
- **Technical Stack**:
  - TypeScript (type-safe development)
  - NestJS (backend framework)
  - Vite (build tooling)
  - Vitest (testing framework)
  - Web-Components API (https://developer.mozilla.org/en-US/docs/Web/API/Web_components) for the application Front-End.
  - Check https://css-tricks.com/web-components-demystified/ for more Web COmponents information.

#### 4.1.3 Authentication System
- **Description**: Secure user authentication with multiple options
- **Priority**: High
- **Requirements**:
  - Email-based login (username/password)
  - OAuth integration for third-party authentication, allowing Google, Github, Gitlab and Apple
  - Secure session management based on JWT
  - Password reset functionality

#### 4.1.4 Applications Dashboard
- **Description**: Central interface for managing deployed applications
- **Priority**: High
- **Requirements**:
  - List all configured applications
  - List all environment/stages inside every configured application
  - Add new application repositories or binaries
  - Start/stop/restart applications
  - View application status and logs
  - Configure application settings

### 4.2 Application Management

#### 4.2.1 Repository Support
- **Description**: Ability to define and deploy applications from source repositories
- **Priority**: High
- **Requirements**:
  - Support for Git repositories
  - Configuration of build commands
  - Environment variable management

#### 4.2.2 Binary Support
- **Description**: Ability to run pre-compiled binaries
- **Priority**: High
- **Requirements**:
  - Upload and store binary files
  - Configure execution parameters
  - Manage binary versions

---

## 5. Technical Requirements

### 5.1 Infrastructure
- Docker-compatible environment
- Sufficient resources for container runtime
- Network access for OAuth providers (if used)

### 5.2 Security
- HTTPS support for secure communication
- Secure credential storage
- OAuth 2.0 compliance
- JWT compatibility for final user auth if is necessary
- Input validation and sanitization

### 5.3 Performance
- Fast container startup time
- Responsive web interface
- Efficient resource utilization

---

## 6. Non-Functional Requirements

### 6.1 Scalability
- Support multiple concurrent users
- Handle multiple running applications

### 6.2 Reliability
- Graceful error handling
- Application state persistence
- Recovery from container restarts

### 6.3 Usability
- Intuitive dashboard interface
- Clear feedback on operations
- Documentation for setup and usage

---

## 7. Out of Scope

- Multi-node container orchestration (Kubernetes-level features)
- Multi-tenant architecture
- High-availability clustering

---

## 8. Future Considerations

- Integration with external monitoring tools
- API for programmatic access
- Plugin system for extensibility
- Support for additional authentication providers
- Resource usage monitoring and limits

---

## 9. Dependencies

- Docker runtime environment
- Network connectivity for OAuth providers
- Compatible host operating system

---

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Security vulnerabilities in deployed apps | High | Implement container isolation, regular security updates |
| Resource exhaustion from applications | Medium | Implement resource limits and monitoring |
| OAuth provider downtime | Low | Provide email login as fallback |

---

## 11. Timeline

*To be determined based on team capacity and priorities.*

---

## 12. Implemented Features (2026-03-19)

This section documents the features built and shipped during the 2026-03-19 development session.

### 12.1 User Roles

A `role` field has been added to the `users` table with two possible values: `admin` and `deployer` (default).

- The `UserRole` enum (`admin` | `deployer`) is defined in the `User` entity.
- Roles are embedded in the JWT payload (`{ sub, email, role }`) and returned by `/api/auth/me` and login responses.
- A `@Roles()` decorator and `RolesGuard` enforce role-based access at the route level.

### 12.2 Administration Dashboard

A new `#/admin` route is available exclusively to users with the `admin` role. Non-admins are redirected to `#/dashboard`.

The dashboard renders a user management table with the following capabilities:

#### User listing
All registered users are shown with: display name, email, authentication provider, active status, and role.

#### Activate / Deactivate
Each non-protected user row has a toggle button to activate or deactivate the account. Inactive users cannot log in.

#### Role change
An inline `<select>` allows changing a user's role between `admin` and `deployer`. Changes are applied immediately via `PATCH /api/users/:id/role`.

#### Delete user
Each non-protected row has a Delete button. A confirmation dialog is shown before the request is sent. The user is removed from the table on success via `DELETE /api/users/:id`.

#### API endpoints (all require `admin` role)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users` | List all users (includes `protected` flag) |
| `PATCH` | `/api/users/:id/active` | Activate or deactivate a user |
| `PATCH` | `/api/users/:id/role` | Change a user's role |
| `DELETE` | `/api/users/:id` | Hard-delete a user |

### 12.3 Primary Admin Protection

The seeded primary admin account is locked against modifications from the admin dashboard:

- Cannot be deactivated, have its role changed, or be deleted.
- Protection is enforced at the **service layer** (`assertNotPrimaryAdmin`) in addition to the UI, so it applies regardless of how the API is called.
- The frontend marks the row with a `primary` badge and renders "Protected" in the action column; the role selector is disabled.
- The `protected: boolean` flag is included in the `GET /api/users` response; no separate endpoint is needed.

### 12.4 Database Bootstrap (Admin Seed)

`DatabaseSeedService` runs via the `OnApplicationBootstrap` lifecycle hook on every startup:

1. Reads `ADMIN_PASSWORD` from the environment. Skips with a warning if absent.
2. Checks whether the email `ADMIN_EMAIL` (default `admin@local.host`) already exists.
3. Creates the user with `role = admin` and `active = true` if not found.
4. Idempotent — safe to run on every restart.

**Seed environment variables:**

| Variable | Default | Required |
|---|---|---|
| `ADMIN_PASSWORD` | — | Yes (seed skipped if absent) |
| `ADMIN_EMAIL` | `admin@local.host` | No |
| `ADMIN_NAME` | `Administrator` | No |

### 12.5 Error Handling

#### Backend — `HttpExceptionFilter` (global)
A NestJS `ExceptionFilter` catches all `HttpException` instances. On a 401 it redirects the browser to `/#/unauthorized-401`; other error codes redirect to `/#/unauthorized-<statusCode>`.

#### Frontend — fetch interceptor (`/js/utils/auth-interceptor.js`)
Loaded as the first module script in `index.html`. Wraps `window.fetch` globally (no changes required in individual components):

- Only acts on `/api/` calls.
- On a 401 response: clears `token` and `user` from `localStorage`, then dispatches the `auth:unauthorized` custom event.

#### Frontend — unauthorised views (`app-shell`)
`AppShell` handles both the `auth:unauthorized` event and hash routes matching `#/unauthorized-*`:

- `#/unauthorized-401` — **"Invalid account"**: account is inactive; user is directed to contact an administrator.
- Any other `unauthorized-*` — **"Session expired"**: session is no longer valid; user is prompted to log in again.

Both views render a "Go to Login" link.

---

## 13. Implemented Features (2026-03-25)

This section documents the features built and shipped during the 2026-03-25 development session.

### 13.1 Application — `dependenciesInstall` field

A `dependenciesInstall` nullable text field was added to the `Application` entity, `CreateApplicationDto`, and `UpdateApplicationDto`. It stores the command used to install dependencies before building (e.g. `npm install`).

### 13.2 Application — Docker type

A new `docker` application type was introduced alongside the existing `repository` and `binary` types.

#### Entity changes

| Field | Type | Description |
|---|---|---|
| `dockerImage` | `string \| null` | Docker image name and tag (e.g. `nginx:latest`) |
| `dockerRestartPolicy` | `'no' \| 'unless-stopped' \| 'always' \| 'on-failure' \| null` | Container restart policy |
| `dockerMaxRetries` | `number \| null` | Max restart attempts; only relevant when policy is `on-failure`, minimum value 1 |

#### Create / Update DTOs

- `type` now accepts `'docker'` in the `@IsIn` validator.
- `dockerImage`, `dockerRestartPolicy`, and `dockerMaxRetries` are optional fields with appropriate validators (`@IsIn`, `@IsInt`, `@Min(1)`).

#### Create application form

The "New Application" modal adapts its visible fields based on the selected type:

| Field | repository | binary | docker |
|---|---|---|---|
| Repository URL | ✓ | — | — |
| Public SSH Key | ✓ | — | — |
| Install Dependencies | ✓ | — | — |
| Build Command | ✓ | — | — |
| Start Command | ✓ | ✓ | — |
| Docker Image | — | — | ✓ |
| Restart Policy | — | — | ✓ |
| Max Retries | — | — | on-failure only |

### 13.3 Application — Edit settings

The application detail page (`#/applications/:id`) now allows editing all application fields:

- The **Edit** button in the page header activates the Settings tab.
- The Settings tab renders a fully editable form pre-populated with current values.
- Field visibility follows the same type-based rules as the create form.
- Submitting calls `PATCH /api/applications/:id`; errors are shown inline and the submit button is disabled during the request.

---

## 14. Appendix

### 14.1 Glossary
- **Container**: Isolated runtime environment for applications
- **OAuth**: Open standard for access delegation
- **NestJS**: Progressive Node.js framework for server-side applications
- **Vite**: Next-generation frontend build tool
- **Vitest**: Vite-native unit testing framework
