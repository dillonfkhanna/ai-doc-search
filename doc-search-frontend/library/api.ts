
export interface Document {
  // Core document properties
  id: number;
  gcs_path: string;
  display_name: string;
  filename: string;
  created_at: string; 

  // Optional properties that may not always be present
  content_type?: string;
  file_size_bytes?: number;

  // Properties that only appear in search results
  snippet?: string;
  score?: number;
}

export interface UserStats {
  document_count: number;
  total_storage_bytes: number;
}


export async function fetchUserFiles(token: string): Promise<Document[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user files");
  }

  // The API now returns the array directly.
  return res.json();
}

export async function queryDocuments(
  query: string,
  token: string
): Promise<Document[]> {
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
  
  return res.json();
}

export async function generatePreviewUrl(
  doc_id: number, 
  token: string
): Promise<{ preview_url: string }> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/generate-preview-url`);
  // The backend now expects 'doc_id' as the parameter.
  url.searchParams.append("doc_id", doc_id.toString());

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

export async function fetchUserStats(token: string): Promise<UserStats> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user-stats`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user stats");
  }

  return res.json();
}

interface InitiateUploadResponse {
  upload_url: string;
  doc_id: number;
}


export async function initiateUpload(fileName: string, fileType: string, fileHash: string, token: string): Promise<InitiateUploadResponse> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/documents/initiate-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ filename: fileName, filetype: fileType, file_hash: fileHash }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Failed to initiate upload");
  }
  
  return res.json();
}

export async function fetchDocumentStatus(doc_id: number, token: string): Promise<{status: string}> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/document-status`);
  // The backend now looks for 'doc_id' instead of 'hash'.
  url.searchParams.append("doc_id", doc_id.toString());

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to fetch document status");
  
  return res.json();
}

export async function deleteDocument(
  doc_id: number,
  token: string
): Promise<{ status: string; message: string }> {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/documents/${doc_id}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Failed to delete the document.");
    } catch {
      throw new Error(`Failed to delete the document. Server responded with status ${res.status}.`);
    }
  }

  return res.json();
}