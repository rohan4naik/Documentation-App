import { create } from 'zustand';
import type { Document, User, ChatMessage, SearchResult, Workspace } from '../models/types';
import { MOCK_INITIAL_CHAT } from '../constants/mockData';

interface AppState {
  user: User | null;
  documents: Document[];
  chatMessages: ChatMessage[];
  searchResults: SearchResult[];
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  isChatbotOpen: boolean;
  favoriteDocumentIds: string[];
  
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  deleteDocument: (id: string) => void;
  renameDocument: (id: string, newTitle: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChatMessages: () => void;
  setSearchState: (results: SearchResult[]) => void;
  toggleChatbot: () => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (ws: Workspace) => void;
  setSelectedWorkspaceId: (id: string | null) => void;
  toggleFavoriteDocument: (id: string) => void;
  setUser: (user: User | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  documents: [],
  chatMessages: MOCK_INITIAL_CHAT,
  searchResults: [],
  workspaces: [],
  selectedWorkspaceId: null,
  isChatbotOpen: false,
  favoriteDocumentIds: [],

  setDocuments: (docs) => set({ documents: docs }),
  addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),
  deleteDocument: (id) => set((state) => ({ 
    documents: state.documents.filter(doc => doc.id !== id),
    favoriteDocumentIds: state.favoriteDocumentIds.filter(favId => favId !== id)
  })),
  renameDocument: (id, newTitle) => set((state) => ({
    documents: state.documents.map(doc => doc.id === id ? { ...doc, title: newTitle } : doc)
  })),
  addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  clearChatMessages: () => set({ chatMessages: MOCK_INITIAL_CHAT }),
  setSearchState: (results) => set({ searchResults: results }),
  toggleChatbot: () => set((state) => ({ isChatbotOpen: !state.isChatbotOpen })),
  setWorkspaces: (workspaces) => set({ workspaces }),
  addWorkspace: (ws) => set((state) => ({ workspaces: [...state.workspaces, ws] })),
  setSelectedWorkspaceId: (id) => set({ selectedWorkspaceId: id }),
  toggleFavoriteDocument: (id) => set((state) => {
    const isFav = state.favoriteDocumentIds.includes(id);
    const favoriteDocumentIds = isFav
      ? state.favoriteDocumentIds.filter(favId => favId !== id)
      : [...state.favoriteDocumentIds, id];
    return { favoriteDocumentIds };
  }),
  setUser: (user) => set((state) => {
    if (!user) {
      return {
        user: null,
        documents: [],
        workspaces: [],
        selectedWorkspaceId: null,
        favoriteDocumentIds: [],
      };
    }
    return { user };
  }),
}));
