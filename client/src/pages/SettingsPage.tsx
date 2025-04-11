import { useState } from 'react';

interface SettingsOption {
  id: string;
  label: string;
  description: string;
  value: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsOption[]>([
    {
      id: 'auto-connect',
      label: 'Auto Connect',
      description: 'Automatically connect to NoVNC when dashboard loads',
      value: false,
    },
    {
      id: 'debug-mode',
      label: 'Debug Mode',
      description: 'Enable detailed logging for debugging purposes',
      value: true,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      description: 'Show browser notifications for task updates',
      value: true,
    },
    {
      id: 'dark-mode',
      label: 'Dark Mode',
      description: 'Use dark theme for the dashboard',
      value: false,
    },
  ]);

  const handleToggleSetting = (id: string) => {
    setSettings(
      settings.map((setting) =>
        setting.id === id ? { ...setting, value: !setting.value } : setting
      )
    );
  };

  const [serverUrl, setServerUrl] = useState('ws://localhost:8787');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSaveSettings = () => {
    setSaveStatus('saving');
    // Simulate saving settings
    setTimeout(() => {
      setSaveStatus('saved');
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Dashboard Settings</h2>
        
        <div className="space-y-6">
          {/* Connection Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Connection</h3>
            <div className="mb-4">
              <label htmlFor="server-url" className="block text-sm font-medium text-gray-700 mb-1">
                WebSocket Server URL
              </label>
              <input
                type="text"
                id="server-url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                The WebSocket server URL for connecting to the nanomachine server
              </p>
            </div>
          </div>

          {/* Feature Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Features</h3>
            <div className="space-y-4">
              {settings.map((setting) => (
                <div key={setting.id} className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id={setting.id}
                      type="checkbox"
                      checked={setting.value}
                      onChange={() => handleToggleSetting(setting.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={setting.id} className="font-medium text-gray-700">
                      {setting.label}
                    </label>
                    <p className="text-gray-500">{setting.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saveStatus === 'saving'}
              className={`px-4 py-2 rounded-md font-medium ${
                saveStatus === 'saving'
                  ? 'bg-gray-400 cursor-wait'
                  : saveStatus === 'saved'
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'saved'
                ? 'Saved!'
                : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-500">Nanomachine Version</h3>
            <p className="mt-1 text-lg font-semibold text-gray-800">1.0.0</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-500">Nanobrowser Extension</h3>
            <p className="mt-1 text-lg font-semibold text-gray-800">0.1.4</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-500">WebSocket Status</h3>
            <p className="mt-1 text-lg font-semibold text-green-600">Connected</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-500">Last Connection</h3>
            <p className="mt-1 text-lg font-semibold text-gray-800">
              {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
