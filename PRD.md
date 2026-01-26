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

## 12. Appendix

### 12.1 Glossary
- **Container**: Isolated runtime environment for applications
- **OAuth**: Open standard for access delegation
- **NestJS**: Progressive Node.js framework for server-side applications
- **Vite**: Next-generation frontend build tool
- **Vitest**: Vite-native unit testing framework
