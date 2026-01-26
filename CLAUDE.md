# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Simple Carrier is a container-based platform for deploying and managing application repositories or binaries through a web interface. It runs as a self-contained Docker container.

## Technical Stack

- **Backend**: NestJS with TypeScript
- **Build Tool**: Vite
- **Testing**: Vitest
- **Linter**: oxlint
- **Frontend**: Web Components API (native browser APIs, no framework)
- **Authentication**: Email/password + OAuth (Google, GitHub, GitLab, Apple) with JWT sessions
- **Container**: Docker using `node:24-alpine` base image

## Commands

- `npm run lint` - Run oxlint on the entire project

## Architecture

- Applications can have multiple environments/stages, each with their own environment variables
- Webhook system for CI/CD integration
- Supports both Git repositories and pre-compiled binaries as deployment sources
