import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { documentService } from '../services/DocumentService';
import { supabase } from '../services/supabaseClient';

export function useDocumentsViewModel() {
  const { documents, setDocuments, addDocument, selectedWorkspaceId, user } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!user?.id) {
      setDocuments([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const docs = await documentService.getDocuments(user.id);
      setDocuments(docs);
    } catch (err) {
      setError('Failed to fetch documents.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [setDocuments, user?.id]);

  const uploadFile = async (fileName: string, fileUri: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const state = useAppStore.getState();
      const userId = state.user?.id;
      const workspaceId = state.selectedWorkspaceId ?? '';

      if (!userId) {
         throw new Error("Missing user");
      }

      const newDoc = await documentService.uploadDocument(fileName, fileUri, workspaceId, userId);
      // Don't call addDocument — the realtime INSERT handler in _layout.tsx
      // will do a full refetch, which avoids duplicate-key errors.
      // Trigger a manual refetch as fallback in case realtime is slow:
      const docs = await documentService.getDocuments(userId);
      setDocuments(docs);
      return newDoc;
    } catch (err) {
      setError('Failed to upload document.');
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFile = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const success = await documentService.deleteDocument(id);
      if (success) {
        const { deleteDocument } = useAppStore.getState();
        deleteDocument(id);
        return true;
      }
      return false;
    } catch (err) {
      setError('Failed to delete document.');
      console.error(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const renameFile = async (id: string, newTitle: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const success = await documentService.updateDocumentTitle(id, newTitle);
      if (success) {
        const { renameDocument } = useAppStore.getState();
        renameDocument(id, newTitle);
        return true;
      }
      return false;
    } catch (err) {
      setError('Failed to rename document.');
      console.error(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const convertFile = async (fileName: string, fileUri: string, targetFormat: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const localUri = await documentService.convertDocument(fileName, fileUri, targetFormat);
      return localUri;
    } catch (err) {
      setError('Failed to convert document.');
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && documents.length === 0) {
      fetchDocuments();
    }
  }, [user?.id, fetchDocuments, documents.length]);

  const filteredDocuments = useMemo(() => {
    return selectedWorkspaceId
      ? documents.filter((doc) => doc.workspaceId === selectedWorkspaceId)
      : documents.filter((doc) => !doc.workspaceId && doc.ownerId === user?.id);
  }, [documents, selectedWorkspaceId, user?.id]);

  return {
    documents: filteredDocuments,
    isLoading,
    error,
    uploadFile,
    deleteFile,
    renameFile,
    convertFile,
    refresh: fetchDocuments
  };
}
