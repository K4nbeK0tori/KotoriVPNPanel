import { Outlet } from 'react-router';

import { useWebSocketBridge } from '@/api/websocketBridge';
import { usePageTitle } from '@/hooks/usePageTitle';
import panelMascotUrl from '@/assets/panel-mascot.png';

export default function PanelLayout() {
  useWebSocketBridge();
  usePageTitle();
  return (
    <>
      <div
        className="panel-bg-mascot"
        style={{ backgroundImage: `url(${panelMascotUrl})` }}
        aria-hidden="true"
      />
      <Outlet />
    </>
  );
}
