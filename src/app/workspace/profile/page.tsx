import { User } from "lucide-react";
import { ComingSoonPanel } from "@/components/shell/coming-soon-panel";

export default function WorkspaceProfilePage() {
  return (
    <div className="stage">
      <ComingSoonPanel
        moduleName="Profile"
        icon={User}
        description="Employee details, work information, designation, tenure, and account settings."
      />
    </div>
  );
}
