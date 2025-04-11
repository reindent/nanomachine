import React from 'react';
import VMCanvas from '../common/VMCanvas';

interface NanomachineCanvasProps {
  width: number;
  height: number;
}

const NanomachineCanvas: React.FC<NanomachineCanvasProps> = ({ width, height }) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm uppercase tracking-wider text-gray-500 font-medium">Your Nanomachine</h2>
      </div>
      <div className="bg-white p-3">
        <VMCanvas width={width} height={height} />
      </div>
    </div>
  );
};

export default NanomachineCanvas;
