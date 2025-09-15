# Overview

This is a full-stack SEO AI tools application built with a React frontend and Express.js backend. The application provides a comprehensive suite of AI-powered SEO tools including topical mapping, search intent analysis, content writing, and indexing services. The system is designed to help users optimize various aspects of their SEO strategy through intelligent automation and analysis.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The frontend is built with React and TypeScript, using Vite as the build tool. It employs a modern component-based architecture with:

- **UI Framework**: Radix UI components with shadcn/ui styling system for consistent, accessible design
- **Styling**: Tailwind CSS with CSS variables for theming and dark mode support
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React for consistent iconography

The frontend follows a clean separation of concerns with organized directories for components, pages, hooks, and utilities. Components are built using the compound component pattern with proper TypeScript interfaces.

## Backend Architecture
The backend uses Express.js with TypeScript in ESM format, structured around:

- **API Layer**: RESTful endpoints for SEO tool management and activation
- **Storage Layer**: Abstracted storage interface with in-memory implementation for development
- **Route Organization**: Centralized route registration with proper error handling middleware
- **Request Logging**: Built-in request/response logging for API endpoints

The server implements a clean architecture pattern with interfaces for storage operations, making it easy to swap implementations.

## Database Design
The application uses Drizzle ORM with PostgreSQL as the primary database:

- **Schema Management**: Type-safe database schema with Drizzle ORM
- **Connection**: Neon Database serverless PostgreSQL connection
- **Migrations**: Drizzle Kit for schema migrations and management
- **Validation**: Zod schemas for runtime type checking and validation

Key entities include Users and SEO Tools with proper relationships and constraints.

## Development Tooling
The project uses modern development tools for type safety and code quality:

- **Build System**: Vite for frontend bundling with React plugin support
- **Type Checking**: Strict TypeScript configuration with proper path mapping
- **Development Server**: Hot module replacement and error overlay in development
- **Package Management**: NPM with lockfile for consistent dependency resolution

## External Integration Architecture
The system is designed to integrate with external services:

- **n8n Integration**: SEO tools connect to n8n workflows for automation
- **API Endpoints**: Configurable endpoints for different tool functionalities
- **Error Handling**: Proper error boundaries and user feedback mechanisms

# External Dependencies

## Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless database connection
- **drizzle-orm & drizzle-kit**: Type-safe ORM and migration toolkit
- **express**: Web application framework for the backend API
- **react & react-dom**: Frontend UI library and DOM renderer
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight client-side routing

## UI and Styling Dependencies
- **@radix-ui/***: Comprehensive set of accessible UI primitive components
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe CSS class variants
- **clsx & tailwind-merge**: CSS class name utilities
- **lucide-react**: Icon library for consistent iconography

## Development and Build Dependencies
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **@vitejs/plugin-react**: React plugin for Vite
- **esbuild**: Fast JavaScript bundler for production builds
- **tsx**: TypeScript execution engine for development

## Form and Validation Dependencies
- **react-hook-form**: Performant form library
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Runtime type validation and schema definition
- **drizzle-zod**: Integration between Drizzle ORM and Zod schemas

## Additional Utilities
- **date-fns**: Date manipulation and formatting
- **embla-carousel-react**: Carousel component for UI
- **cmdk**: Command palette component
- **nanoid**: URL-safe unique ID generator