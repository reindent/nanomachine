# Nanomachine - Minimal Linux with GUI and Chromium

A ready-to-use Docker container with a minimal Linux environment, GUI, and a Chromium browser with the Nanobrowser extension accessible via VNC.

## Quick Start

Run the container with:

```bash
docker run -d -p 5900:5900 -p 6080:6080 --name nanomachine-browser -e VNC_PASSWORD="password" mrcolorrain/vnc-browser:debian
```

## Accessing the Container

You can access the container in two ways:

### 1. Using a VNC client

- Connect to: `localhost:5900`
- Password: `password`

### 2. Using a web browser (noVNC)

- Open: `http://localhost:6080` in your browser
- Password: `password`

## Features

This container includes:

- Debian Linux (lightweight)
- Chromium browser (pre-installed)
- VNC server (already configured)
- noVNC for browser-based access

## Installing Nanobrowser Extension

This repository includes a script to install the nanobrowser extension in the Chromium browser inside the container.

### Automated Installation

Run the setup script to automatically install the extension:

```bash
chmod +x setup-nanobrowser.sh
./setup-nanobrowser.sh
```

This script will:
1. Start the container if not already running
2. Install necessary tools (wget, unzip)
3. Download and extract the nanobrowser extension
4. Set up the extension in the container
5. Create a launch script for Chromium with the extension loaded

### Manual Installation

If you prefer to install the extension manually, follow these steps:

1. Connect to the container via VNC
2. Open a terminal in the container
3. Run the following commands:

```bash
# Download and extract the extension
cd /tmp
wget https://github.com/nanobrowser/nanobrowser/releases/download/v0.1.4/nanobrowser.zip
unzip nanobrowser.zip -d nanobrowser

# Set up the extension directory
mkdir -p /home/nova/extensions
cp -r /tmp/nanobrowser /home/nova/extensions/

# Launch Chromium with the extension
/usr/bin/chromium \
  --disable-extensions-except=/home/nova/extensions/nanobrowser \
  --load-extension=/home/nova/extensions/nanobrowser \
  --enable-features=ExtensionsToolbarMenu \
  "chrome://extensions/"
```
- Minimal resource usage

## Managing the Container

```bash
# Stop the container
docker stop nanomachine-browser

# Start the container again
docker start nanomachine-browser

# Remove the container
docker rm nanomachine-browser

# View container logs
docker logs nanomachine-browser
```

## Customization

You can customize the container by setting environment variables:

```bash
docker run -d -p 5900:5900 -p 6080:6080 \
  --name nanomachine-browser \
  -e VNC_PASSWORD="your_password" \
  -e VNC_RESOLUTION="1280x720" \
  mrcolorrain/vnc-browser:debian
```

## Credits

This setup uses the `mrcolorrain/vnc-browser:debian` Docker image, which is a minimal, customizable, Linux-based Docker image designed to provide a lightweight environment for browsing the web via VNC.

For more information, visit: [https://github.com/MRColorR/vnc-browser](https://github.com/MRColorR/vnc-browser)
