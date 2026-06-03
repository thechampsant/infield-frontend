import { LineChart } from "lucide-react";
import { ComingSoonPanel } from "@/components/shell/coming-soon-panel";

export default function WorkspaceReportsPage() {
  return (
    <div className="stage">
      <ComingSoonPanel
        moduleName="Reports"
        icon={LineChart}
        description="Comprehensive reporting — standard templates, custom builder, filters, exports, and scheduled delivery in client-specific formats."
      />
    </div>
  );
}
