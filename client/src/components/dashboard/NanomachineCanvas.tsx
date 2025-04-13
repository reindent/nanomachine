import React from 'react';
import VMCanvas from '../common/VMCanvas';
import VMIFrame from '../common/VMIFrame';

const USE_IFRAME = true;
const KASM_VNC_URL = "http://localhost:3201/vnc/index.html?autoconnect=1&resize=remote&enable_perf_stats=0";

interface NanomachineCanvasProps {
  width: number;
  height: number;
}

const NanomachineCanvas: React.FC<NanomachineCanvasProps> = ({ width, height }) => {
  return (
    <div className="mb-6 w-full">
      <div className="bg-white rounded-md shadow-sm overflow-hidden w-full" style={{ height: `${height * 2}px` }}>
        {USE_IFRAME ? (
          <VMIFrame 
            iframeUrl={KASM_VNC_URL} 
          />
        ) : (
          <VMCanvas width={width} height={height} maxWidth={width} />
        )}
      </div>
    </div>
  );
};

export default NanomachineCanvas;
