import { Bell } from "lucide-react";
import { ComingSoonPanel } from "@/components/shell/coming-soon-panel";

export default function AccountAdminNotificationsPage() {
  return (
    <div className="stage">
      <ComingSoonPanel
        moduleName="Notifications"
        icon={Bell}
        description="Real-time push alerts for attendance misses, claim approvals, scheme launches, and task deadlines — configurable per role so your team gets only what matters."
      />
    </div>
  );
}
