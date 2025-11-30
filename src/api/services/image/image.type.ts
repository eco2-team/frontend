export type CHANNEL_TYPE = 'chat' | 'scan' | 'my';

export type ImageUpload = {
  channel: CHANNEL_TYPE;
  fileMeta: ImageUploadRequest;
};

export type ImageUploadRequest = {
  filename: string;
  content_type: string;
  uploader_id?: string;
  metadata?: object;
};

export type ImageUploadResponse = {
  key: string;
  upload_url: string;
  cdn_url: string;
  expires_in: number;
  required_headers: {
    additionalProp1: string;
    additionalProp2: string;
    additionalProp3: string;
  };
};
