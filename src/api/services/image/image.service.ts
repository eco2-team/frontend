import axios from 'axios';
import api from '@/api/axiosInstance';
import type { ImageUpload, ImageUploadResponse } from './image.type';

const BASE_URL = '/api/v1/images';

export class ImageService {
  static async postUploadImage({ channel, fileMeta }: ImageUpload) {
    return api
      .post<ImageUploadResponse>(`${BASE_URL}/${channel}`, fileMeta, {
        headers: { 'Content-Type': 'application/json' },
      })
      .then((res) => res.data);
  }

  static async putUploadImageUDN(udn_url: string, imageFile: File) {
    return axios
      .put<ImageUploadResponse>(udn_url, imageFile, {
        headers: { 'Content-Type': imageFile.type },
      })
      .then((res) => res.data);
  }
}
