import type { Document, SearchResult } from '../models/types';
import { supabase } from './supabaseClient';
import { File as FSFile, UploadType, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { getBackendUrl } from './apiConfig';

// Helper to map DB row to our frontend Document type
const mapToFrontendDocument = (row: any): Document => ({
  id: row.id,
  title: row.title,
  excerpt: row.excerpt,
  content: row.content,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  metadata: {
    tags: row.tags || [],
    category: row.category || 'Uncategorized',
    wordCount: row.word_count || 0,
  },
  workspaceId: row.workspace_id,
  ownerId: row.owner_id,
});

export class DocumentService {
  async getDocuments(userId?: string): Promise<Document[]> {
    if (!userId) {
      return [];
    }

    // 1. Get workspace IDs owned by the user
    const { data: ownedWorkspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId);

    const ownedIds = ownedWorkspaces ? ownedWorkspaces.map((ws: any) => ws.id) : [];

    // 2. Get workspace IDs the user has joined (from Supabase workspace_members table)
    const { data: memberRows } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId);

    const joinedIds = memberRows ? memberRows.map((r: any) => r.workspace_id) : [];

    // Combine all accessible workspace IDs
    const accessibleWorkspaceIds = Array.from(new Set([...ownedIds, ...joinedIds]));

    let query = supabase.from('documents').select('*');

    if (accessibleWorkspaceIds.length > 0) {
      // Fetch documents where owner_id = userId OR workspace_id is in accessibleWorkspaceIds
      const wsIdsString = accessibleWorkspaceIds.map((id: string) => `"${id}"`).join(',');
      query = query.or(`owner_id.eq.${userId},workspace_id.in.(${wsIdsString})`);
    } else {
      query = query.eq('owner_id', userId);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return [];
    }

    return data.map(mapToFrontendDocument);
  }

  async getDocumentById(id: string): Promise<Document | null> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error || !data) return null;
    return mapToFrontendDocument(data);
  }

  async searchDocuments(query: string, userId?: string): Promise<SearchResult[]> {
    if (!userId) return [];
    
    const docs = await this.getDocuments(userId);
    
    const lowercaseQuery = query.toLowerCase();
    const results = docs.filter((row: any) => 
      row.title.toLowerCase().includes(lowercaseQuery) || 
      (row.content && row.content.toLowerCase().includes(lowercaseQuery))
    ).map((row: any) => ({
      documentId: row.id,
      score: 1.0, // mock score
      snippet: row.content ? row.content.substring(0, 100) + '...' : ''
    }));

    return results;
  }

  async uploadDocument(fileName: string, fileUri: string, workspaceId: string, userId: string): Promise<Document> {
    try {
      const apiUrl = `${getBackendUrl()}/api/documents/upload`;

      // Use the new expo-file-system File class API (replaces deprecated uploadAsync)
      const file = new FSFile(fileUri);
      const isPdf = fileName.toLowerCase().endsWith('.pdf');
      const mimeType = isPdf ? 'application/pdf' : 'application/octet-stream';
      const result = await file.upload(apiUrl, {
        uploadType: UploadType.MULTIPART,
        fieldName: 'file',
        mimeType: mimeType,
        parameters: {
          workspace_id: workspaceId,
          user_id: userId,
        },
      });

      if (result.status !== 200) {
        throw new Error('Upload failed with status: ' + result.status);
      }

      const json = JSON.parse(result.body);
      return mapToFrontendDocument(json);
    } catch (e) {
      console.error('Upload Error:', e);
      throw e;
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      await supabase.storage.from('document_files').remove([`${id}.pdf`, id]);
    } catch (e) {
      console.warn('Could not delete storage file:', e);
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting document:', error);
      return false;
    }
    return true;
  }

  async updateDocumentTitle(id: string, title: string): Promise<boolean> {
    const { error } = await supabase
      .from('documents')
      .update({ title })
      .eq('id', id);
      
    if (error) {
      console.error('Error updating document title:', error);
      return false;
    }
    return true;
  }

  async convertDocument(fileName: string, fileUri: string, targetFormat: string): Promise<string> {
    const apiUrl = `${getBackendUrl()}/api/documents/convert`;
    
    // Use expo-file-system File class upload to bypass Android fetch/FormData limitations
    const file = new FSFile(fileUri);
    const result = await file.upload(apiUrl, {
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'application/octet-stream',
      parameters: {
        target_format: targetFormat
      }
    });

    if (result.status !== 200) {
      throw new Error('Conversion failed with status: ' + result.status);
    }

    const responseJson = JSON.parse(result.body);
    const base64 = responseJson.base64;
    const outFilename = responseJson.filename || (fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName) + '.' + targetFormat;

    const localUri = `${Paths.document.uri}${Paths.document.uri.endsWith('/') ? '' : '/'}${outFilename}`;
    
    // Write base64 to the local file
    await FileSystem.writeAsStringAsync(localUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    return localUri;
  }
}

export const documentService = new DocumentService();
