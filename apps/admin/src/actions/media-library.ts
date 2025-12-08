"use server";

import { getMediaLibrary, requestMediaUpload } from "../lib/api";
import type { MediaUploadRequest } from "../lib/api";

export async function requestMediaUploadAction(input: MediaUploadRequest) {
  return requestMediaUpload(input);
}

export async function refreshMediaLibraryAction() {
  return getMediaLibrary();
}
