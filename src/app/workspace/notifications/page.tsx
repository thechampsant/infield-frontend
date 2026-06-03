import { Bell } from "lucide-react";
import { ComingSoonPanel } from "@/components/shell/coming-soon-panel";

export default function WorkspaceNotificationsPage() {
  return (
    <div className="stage">
      <ComingSoonPanel
        moduleName="Notifications"
        icon={Bell}
        description="Real-time push alerts — configurable per role so your team gets only what matters."
      />
    </div>
  );
}
