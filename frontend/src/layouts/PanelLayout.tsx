import { Outlet } from 'react-router';

import { useWebSocketBridge } from '@/api/websocketBridge';
import { usePageTitle } from '@/hooks/usePageTitle';
import SakuraLayer from '@/components/SakuraLayer';
import panelBgUrl from '@/assets/panel-bg.png';

export default function PanelLayout() {
  useWebSocketBridge();
  usePageTitle();
  return (
    <>
      <div
        className="panel-bg-mascot"
        style={{ backgroundImage: `url(${panelBgUrl})` }}
        aria-hidden="true"
      />
      <SakuraLayer />
      <Outlet />
    </>
  );
}
