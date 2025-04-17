# Nanomachine Scripts

This directory contains utility scripts for managing the Nanomachine environment and its components.

## VM Scripts

The `vm` directory contains scripts for managing the virtual machine environment used by Nanomachine:

### License

This component is licensed under the [MIT License](../LICENSE.md) unless otherwise specified. Some dependencies may have different licensing terms.

© 2025-present Reindent LLC <contact@reindent.com>

### Installation Scripts

- `install` - Main installation script for setting up the entire environment
- `install-bridge` - Installs and configures the bridge component
- `install-nanobrowser` - Installs and configures the Nanobrowser extension
- `reinstall` - Reinstalls the environment from scratch

### Runtime Scripts

- `run` - Runs the main Nanomachine application
- `run-bridge` - Runs only the bridge component
- `run-nanobrowser` - Runs only the Nanobrowser extension
- `start` - Starts all Nanomachine components
- `restart` - Restarts all Nanomachine components
- `stop` - Stops all running Nanomachine components

### Utility Scripts

- `precheck` - Performs pre-installation checks to ensure system compatibility
- `wait` - Utility script for waiting for services to be ready
- `uninstall` - Removes the Nanomachine environment

## Usage

Most scripts can be run directly from the command line:

```bash
# Install the environment
./scripts/vm/install

# Start all components
./scripts/vm/start

# Stop all components
./scripts/vm/stop
```

Make sure to make the scripts executable before running them:

```bash
chmod +x scripts/vm/*
```

## Script Dependencies

These scripts may require the following dependencies:

- Bash shell
- Docker
- Node.js
- npm

Please ensure these dependencies are installed on your system before running the scripts.

## Notes

- Some scripts may require root/administrator privileges to run correctly
- Always check the script contents before running to understand what actions will be performed
- These scripts are primarily designed for development and testing environments
