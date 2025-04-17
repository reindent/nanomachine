// Using JSX requires the React import in some configurations
import VMCanvas from '../common/VMCanvas';
import VMIFrame from '../common/VMIFrame';
import { USE_KASMVNC_IFRAME } from '../../config';

const NanomachineCanvas = () => {
  return (
    <div className="mb-6 w-full">
      <div className="bg-white rounded-md shadow-sm overflow-hidden w-full h-[800px]">
        {USE_KASMVNC_IFRAME ? (
          <VMIFrame />
        ) : (
          <VMCanvas />
        )}
      </div>
    </div>
  );
};

export default NanomachineCanvas;
