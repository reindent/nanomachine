# Contributing to Nanomachine

Thank you for your interest in contributing to Nanomachine! We welcome contributions from the community to help make this project better.

## How to Contribute

Contributions are managed through GitHub. Here's how you can contribute:

1. **Fork the Repository**: Create your own fork of the project on GitHub.

2. **Create a Branch**: Create a branch in your fork for your contribution.

3. **Make Your Changes**: Implement your changes, following our code style and guidelines.

4. **Test Your Changes**: Ensure your changes work as expected and don't break existing functionality.

5. **Submit a Pull Request**: Open a pull request from your branch to our main repository.

## Development Setup

### Requirements

- Node.js 18+
- npm
- Docker
- MongoDB 4.4+

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/nanomachine.git
cd nanomachine

# Install dependencies for all components
npm run install:all

# Configure environment variables
# Copy .env.template to .env in each component directory and update as needed
cp client/.env.template client/.env
cp server/.env.template server/.env

# Start the development environment
npm run dev
```

### Environment Configuration

Each component has its own set of environment variables that control its behavior:

#### Server Configuration

Key environment variables for the server component:

```
# Server Configuration
PORT=3100
MONGODB_URI=mongodb://localhost:27017/nanomachine

# Bridge Configuration
BRIDGE_URL=http://localhost:8787

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key

# Agent Configuration
AGENT_PLANNER_MODEL=gpt-4.1
AGENT_NAVIGATOR_MODEL=gpt-4.1
AGENT_VALIDATOR_MODEL=gpt-4.1
```

See the server's `.env.template` for the complete list of configuration options.

#### Client Configuration

Key environment variables for the client component:

```
VITE_API_URL=http://localhost:3100
VITE_SOCKET_URL=http://localhost:3100
VITE_VNC_URL=http://localhost:3100/vnc
```

#### Bridge Configuration

Key environment variables for the bridge component:

```
PORT=8787
```

## Pull Request Guidelines

- Keep pull requests focused on a single feature or bug fix
- Follow the existing code style
- Include tests for new functionality
- Update documentation as needed
- Ensure all tests pass before submitting

## Code Structure

Nanomachine consists of three main components:

- **client**: React frontend application
- **server**: Node.js backend server
- **bridge**: Communication layer between the server and Nanobrowser

Each component has its own README with specific development guidelines.

## Signed-off-by

All commits must include a `Signed-off-by` line in the commit message. This certifies that you agree to the statement below.

By adding the `Signed-off-by` trailer, you agree the MIT License applies to your contribution **and** you have the right to submit it.

To add this automatically, commit with the `-s` flag:

```bash
git commit -s -m "Your commit message"
```

This will add a line like:

```
Signed-off-by: Your Name <your.email@example.com>
```

## Questions?

If you have any questions about contributing, please open an issue on GitHub and we'll be happy to help.

---

Thank you for contributing to Nanomachine!