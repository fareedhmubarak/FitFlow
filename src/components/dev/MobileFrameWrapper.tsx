import { useState, type ReactNode } from 'react';

// Device configurations
const devices = {
  'iPhone 16 Pro Max': {
    width: 430,
    height: 932,
    screenRadius: 55,
    frameRadius: 60,
    notchWidth: 126,
    notchHeight: 37,
    hasDynamicIsland: true,
  },
  'iPhone 16 Pro': {
    width: 393,
    height: 852,
    screenRadius: 50,
    frameRadius: 55,
    notchWidth: 120,
    notchHeight: 35,
    hasDynamicIsland: true,
  },
  'iPhone SE': {
    width: 375,
    height: 667,
    screenRadius: 0,
    frameRadius: 40,
    notchWidth: 0,
    notchHeight: 0,
    hasDynamicIsland: false,
    hasHomeButton: true,
  },
  'Samsung Galaxy S24': {
    width: 360,
    height: 780,
    screenRadius: 30,
    frameRadius: 35,
    notchWidth: 80,
    notchHeight: 25,
    hasDynamicIsland: false,
    hasPunchHole: true,
  },
};

type DeviceType = keyof typeof devices;

interface MobileFrameWrapperProps {
  children: ReactNode;
}

export function MobileFrameWrapper({ children }: MobileFrameWrapperProps) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('iPhone 16 Pro Max');
  const [showFrame, setShowFrame] = useState(true);
  const device = devices[selectedDevice];
  
  // Scale factor to fit the device in viewport
  const [scale, setScale] = useState(0.85);

  // If frame is disabled, just show the app at mobile width
  if (!showFrame) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Toggle bar */}
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-gray-800 text-white px-4 py-2 flex items-center justify-between text-sm">
          <span className="font-medium">📱 Mobile Preview Mode</span>
          <button
            onClick={() => setShowFrame(true)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium transition-colors"
          >
            Show Device Frame
          </button>
        </div>
        <div 
          className="mx-auto bg-white mt-12"
          style={{ 
            width: device.width, 
            minHeight: '100vh',
            maxWidth: '100%',
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-start py-4 overflow-auto">
      {/* Control Bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 text-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-lg">📱 FitFlow Mobile Preview</span>
            <span className="text-gray-400 text-sm hidden sm:block">Development Mode</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Device Selector */}
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value as DeviceType)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.keys(devices).map((deviceName) => (
                <option key={deviceName} value={deviceName}>
                  {deviceName}
                </option>
              ))}
            </select>
            
            {/* Scale Control */}
            <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-1">
              <button 
                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                className="text-lg hover:text-blue-400 transition-colors"
              >
                −
              </button>
              <span className="text-sm min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
              <button 
                onClick={() => setScale(s => Math.min(1.2, s + 0.1))}
                className="text-lg hover:text-blue-400 transition-colors"
              >
                +
              </button>
            </div>
            
            {/* Hide Frame Button */}
            <button
              onClick={() => setShowFrame(false)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors"
            >
              Hide Frame
            </button>
          </div>
        </div>
      </div>
      
      {/* Device Frame */}
      <div 
        className="mt-20 mb-8 relative"
        style={{ 
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {/* Phone Frame (Black border) */}
        <div
          className="relative bg-black shadow-2xl"
          style={{
            width: device.width + 16,
            height: device.height + 16,
            borderRadius: device.frameRadius,
            padding: 8,
          }}
        >
          {/* Side Buttons */}
          {/* Power Button */}
          <div 
            className="absolute bg-gray-800 rounded-sm"
            style={{
              right: -3,
              top: 180,
              width: 3,
              height: 80,
            }}
          />
          {/* Volume Up */}
          <div 
            className="absolute bg-gray-800 rounded-sm"
            style={{
              left: -3,
              top: 150,
              width: 3,
              height: 40,
            }}
          />
          {/* Volume Down */}
          <div 
            className="absolute bg-gray-800 rounded-sm"
            style={{
              left: -3,
              top: 200,
              width: 3,
              height: 40,
            }}
          />
          {/* Silent Switch */}
          <div 
            className="absolute bg-gray-800 rounded-sm"
            style={{
              left: -3,
              top: 100,
              width: 3,
              height: 25,
            }}
          />
          
          {/* Screen */}
          <div
            className="relative bg-white overflow-hidden"
            style={{
              width: device.width,
              height: device.height,
              borderRadius: device.screenRadius,
            }}
          >
            {/* Dynamic Island / Notch */}
            {device.hasDynamicIsland && (
              <div 
                className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-black z-50 flex items-center justify-center"
                style={{
                  width: device.notchWidth,
                  height: device.notchHeight,
                  borderRadius: '0 0 20px 20px',
                  top: 10,
                }}
              >
                {/* Camera dot */}
                <div className="w-3 h-3 rounded-full bg-gray-800 mr-6" />
              </div>
            )}
            
            {/* Home Indicator (for modern iPhones) */}
            {!('hasHomeButton' in device) && (
              <div 
                className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/30 rounded-full z-50"
                style={{
                  width: 134,
                  height: 5,
                }}
              />
            )}
            
            {/* App Content */}
            <div 
              className="w-full h-full overflow-auto"
              style={{
                paddingTop: device.hasDynamicIsland ? 0 : 0,
              }}
            >
              {children}
            </div>
          </div>
        </div>
        
        {/* Device Name Label */}
        <div className="text-center mt-4">
          <span className="text-gray-400 text-sm">{selectedDevice}</span>
          <span className="text-gray-600 text-xs ml-2">
            {device.width} × {device.height}
          </span>
        </div>
      </div>
      
      {/* Quick Tips */}
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-gray-800/90 backdrop-blur rounded-xl p-3 text-xs text-gray-400 text-center">
        💡 Tip: Use the controls above to switch devices or adjust zoom. The app renders exactly as it would on a real device.
      </div>
    </div>
  );
}

export default MobileFrameWrapper;
