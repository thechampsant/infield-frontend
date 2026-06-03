import { LayoutDashboard } from "lucide-react";
import { ComingSoonPanel } from "@/components/shell/coming-soon-panel";

export default function WorkspaceOverviewPage() {
  return (
    <div className="stage">
      <ComingSoonPanel
        moduleName="Overview"
        icon={LayoutDashboard}
        description="Your personalized dashboard — field team metrics, daily KPIs, live agent activity, and quick-access cards for your account, all in one glance."
      />
    </div>
  );
}
