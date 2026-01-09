export type ScanClassifyRequest = {
  image_url: string;
  user_input?: string;
};

// POST /api/v1/scan 요청/응답
export type ScanSubmitRequest = {
  image_url: string;
  user_input?: string;
  model?: string;
};

export type ScanSubmitResponse = {
  job_id: string;
  stream_url: string;
  result_url: string;
  status: string;
};

// SSE 이벤트 타입
export type ScanSSEStage =
  | 'queued'
  | 'vision'
  | 'rule'
  | 'answer'
  | 'reward'
  | 'done';

export type ScanSSEEvent = {
  job_id: string;
  stage: ScanSSEStage;
  status: 'started' | 'completed' | 'failed';
  progress: number;
  result?: ScanClassifyResponse;
};

export type ScanClassificationResult = {
  major_category: string;
  middle_category: string;
  minor_category: string;
};

export type ScanClassifyResponse = {
  task_id: string;
  status: string;
  message: string;
  pipeline_result?: {
    classification_result: {
      classification: {
        major_category: string;
        middle_category: string;
        minor_category: string;
      };
    };
    disposal_rules: {
      key: string;
      category: string;
    };
    final_answer: {
      disposal_steps: Record<string, string>;
      insufficiencies: string[];
      user_answer: string;
    };
  };
  reward?: {
    name: string;
    dialog: string;
    match_reason: string;
    type: string;
  };
  error?: string;
};

export type ScanCategoryResponse = {
  id: string;
  name: string;
  display_name: string;
  instructions: string[];
}[];
