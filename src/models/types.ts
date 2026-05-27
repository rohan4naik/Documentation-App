export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface DocumentMetadata {
  tags: string[];
  category: string;
  wordCount: number;
}

export interface Document {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  metadata: DocumentMetadata;
  workspaceId?: string;
  ownerId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface SearchResult {
  documentId: string;
  score: number;
  snippet: string;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  joinedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  code: string;
  shareLink: string;
  documentCount: number;
  ownerId?: string;
  members?: WorkspaceMember[];
}
