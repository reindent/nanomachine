#!/bin/bash
# Script to install nanobrowser extension in the Docker container

# Stop any existing container
docker stop nanomachine-browser || true
docker rm nanomachine-browser || true

# Start the container
docker run -d -p 5900:5900 -p 6080:6080 --name nanomachine-browser -e VNC_PASSWORD="password" mrcolorrain/vnc-browser:debian

# Wait for container to initialize
echo "Waiting for container to initialize..."
sleep 5

# Install necessary tools
echo "Installing necessary tools..."
docker exec nanomachine-browser bash -c "apt-get update && apt-get install -y wget unzip"

# Download nanobrowser extension
echo "Downloading nanobrowser extension..."
docker exec nanomachine-browser bash -c "cd /tmp && wget https://github.com/nanobrowser/nanobrowser/releases/download/v0.1.4/nanobrowser.zip"

# Extract the extension
echo "Extracting extension..."
docker exec nanomachine-browser bash -c "cd /tmp && unzip nanobrowser.zip -d nanobrowser"

# Set up extension directory
echo "Setting up extension directory..."
docker exec nanomachine-browser bash -c "mkdir -p /home/nova/extensions && cp -r /tmp/nanobrowser /home/nova/extensions/ && chown -R nova:nova /home/nova/extensions"

# Create a script to launch Chromium with the extension
echo "Creating launch script..."
# Create the script content locally first
cat > temp-launch-script.sh << 'EOF'
#!/bin/bash
pkill -f chromium || true

# Launch Chromium with the nanobrowser extension
/usr/bin/chromium \
  --disable-extensions-except=/home/nova/extensions/nanobrowser \
  --load-extension=/home/nova/extensions/nanobrowser \
  --enable-features=ExtensionsToolbarMenu \
  "chrome://extensions/" &
EOF

# Copy the script to the container
docker cp temp-launch-script.sh nanomachine-browser:/home/nova/launch-chrome.sh
rm temp-launch-script.sh

# Make the script executable
docker exec nanomachine-browser bash -c "chmod +x /home/nova/launch-chrome.sh && chown nova:nova /home/nova/launch-chrome.sh"

echo "Setup complete! Connect to the container via VNC at localhost:5900 or noVNC at http://localhost:6080"
echo "Password: password"
echo ""
echo "To launch Chromium with the nanobrowser extension, run the following command in the container's terminal:"
echo "  /home/nova/launch-chrome.sh"
