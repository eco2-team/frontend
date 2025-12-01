export type ScanClassifyRequest = {
  image_url: string;
  user_input?: string;
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
    received: string;
    already_owned: boolean;
    name: string;
    dialog: string;
    match_reason: string;
  };
  error?: string;
};

export type ScanCategoryResponse = {
  id: string;
  name: string;
  display_name: string;
  instructions: string[];
}[];
