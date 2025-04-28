# Node Environment Rules

## Development Server

- Always use `pnpm dev` to start the development server
- Never use `pkill` to terminate processes; use proper shutdown methods instead
- Always look up the port in the `.env` file for browser requests
- Use `Ctrl+C` to gracefully stop the development server

## Environment Variables

- Store all configuration in the `.env` file
- Reference the `.env` file for ports, API keys, and other configuration
- Never hardcode ports or configuration values in code
- Use environment variables for different environments (development, staging, production)

## Package Management

- Use `pnpm` as the package manager for all operations
- Run `pnpm install` after pulling new changes
- Use `pnpm add <package>` to add new dependencies
- Use `pnpm add -D <package>` for development dependencies

## Process Management

- One development server instance per project
- Check for running processes before starting new ones
- Use proper shutdown signals to terminate processes
- Monitor the terminal output for errors and warnings

## HTTP Requests

- Never rely on node-fetch for HTTP requests
- Use native fetch API or other modern HTTP clients
- Ensure proper error handling for all network requests
