export interface UserFile {
  id: number;
  gcs_path: string;
  filename: string;
  display_name: string;
  file_size_bytes: number;
  content_type: string;
  created_at: string; // ISO 8601 date string
}

export interface SearchResult {
  gcs_path: string;
  display_name: string;
  content_type: string | null;
  snippet: string;
  score: number;
}

export interface SignedUploadUrlResponse {
  upload_url: string;
  gcs_path: string;
}


export async function getSignedUrl(
  fileName: string,
  fileType: string,
  token: string
): Promise<SignedUploadUrlResponse> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/generate-upload-url`);
  url.searchParams.append("filename", fileName);
  url.searchParams.append("filetype", fileType);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to get signed URL");

  const data: SignedUploadUrlResponse = await res.json();
  return data;
}

export async function fetchUserFiles(token: string): Promise<UserFile[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user files");
  }

  const data = await res.json();
  return data.files;
}


export interface SearchResult {
  docu_name: string;
  text: string;
}

export async function queryDocuments(
  query: string,
  token: string
): Promise<SearchResult[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`Query failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data || [];}

export async function generatePreviewUrl(
  gcs_path: string, 
  token: string
): Promise<{ preview_url: string }> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/generate-preview-url`);
  url.searchParams.append("gcs_path", gcs_path);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to get preview URL: ${errorText}`);
  }

  return res.json();
}

export async function checkDuplicateFile(
  fileHash: string,
  token: string
): Promise<boolean> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/check-duplicate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ file_hash: fileHash }),
  });

  if (!res.ok) {
    throw new Error("Failed to check for duplicate file");
  }

  const data = await res.json();
  return data.is_duplicate;
}