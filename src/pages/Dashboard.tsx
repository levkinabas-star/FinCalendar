import { useIsDesktop } from '../hooks/useIsDesktop';
import DashboardMobile from './DashboardMobile';
import DashboardDesktop from './DashboardDesktop';

export default function Dashboard() {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DashboardDesktop /> : <DashboardMobile />;
}
