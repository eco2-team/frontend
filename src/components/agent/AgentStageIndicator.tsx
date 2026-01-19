/**
 * Agent Stage Indicator
 * - 진행 상태 표시
 */

import type { CurrentStage } from '@/api/services/agent';

interface AgentStageIndicatorProps {
  stage: CurrentStage;
}

export const AgentStageIndicator = ({ stage }: AgentStageIndicatorProps) => {
  return (
    <div className="flex items-center gap-3">
      {/* 스피너 */}
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />

      {/* 메시지 */}
      <span className="text-text-secondary text-sm">
        {stage.message}
      </span>
    </div>
  );
};
