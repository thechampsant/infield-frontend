"use client";

interface SectionPlaceholderProps {
  sectionNumber: number;
  title: string;
  description: string;
}

export function SectionPlaceholder({
  sectionNumber,
  title,
  description,
}: SectionPlaceholderProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 opacity-50 pointer-events-none select-none">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-500">
            {sectionNumber}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-600">{title}</h3>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
              Coming Soon
            </span>
          </div>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
    </div>
  );
}
