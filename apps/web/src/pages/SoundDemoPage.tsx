import { BottomNav } from '../components/BottomNav';
import { SoundDemoPanel } from '../components/SoundDemoPanel';

export default function SoundDemoPage() {
  return (
    <div className="app-shell">
      <div className="page sound-demo-page">
        <SoundDemoPanel />
      </div>
      <BottomNav />
    </div>
  );
}
