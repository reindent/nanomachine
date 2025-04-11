import React from 'react';
import VMCanvas from '../common/VMCanvas';

interface NanomachineCanvasProps {
  width: number;
  height: number;
}

const NanomachineCanvas: React.FC<NanomachineCanvasProps> = ({ width, height }) => {
  return (
    <div className="mb-6 w-full">
      <div className="bg-white rounded-md shadow-sm overflow-hidden w-full">
        <VMCanvas width={width} height={height} maxWidth={width} />
      </div>
    </div>
  );
};

export default NanomachineCanvas;
