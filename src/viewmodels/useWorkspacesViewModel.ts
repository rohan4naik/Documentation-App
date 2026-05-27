import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Workspace, WorkspaceMember } from '../models/types';
import { Share, Alert } from 'react-native';
import { workspaceService } from '../services/WorkspaceService';

export function useWorkspacesViewModel() {
  const { workspaces, setWorkspaces, addWorkspace, user, documents } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await workspaceService.getWorkspaces(user.id);
      setWorkspaces(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch workspaces.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, setWorkspaces]);

  const createNewWorkspace = async (name: string) => {
    if (!name.trim()) {
      Alert.alert("Error", "Workspace name cannot be empty.");
      return;
    }
    if (!user?.id) {
      Alert.alert("Error", "User not logged in.");
      return;
    }

    setIsLoading(true);
    try {
      const newWs = await workspaceService.createWorkspace(name, user.id);
      if (newWs) {
        addWorkspace(newWs);
        Alert.alert("Success", `Workspace "${newWs.name}" created successfully! Code: ${newWs.code}`);
      } else {
        Alert.alert("Error", "Failed to create workspace.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "An error occurred while creating workspace.");
    } finally {
      setIsLoading(false);
    }
  };

  const shareByCode = (workspace: Workspace) => {
    Alert.alert(
      "Share Code",
      `Workspace Access Code: ${workspace.code}\n\nTeammates can enter this code in the app to join the workspace.`,
      [{ text: "Copy Code", onPress: () => Alert.alert("Copied", "Workspace code copied to clipboard!") }, { text: "Done", style: "cancel" }]
    );
  };

  const shareByLink = async (workspace: Workspace) => {
    try {
      await Share.share({
        message: `Join my Documentation Workspace "${workspace.name}" via this link: ${workspace.shareLink} (Access Code: ${workspace.code})`,
      });
    } catch (error) {
      console.error("Failed to share link", error);
    }
  };

  const joinWorkspaceByCode = async (code: string) => {
    if (!code.trim()) {
      Alert.alert("Error", "Access code cannot be empty.");
      return false;
    }
    if (!user?.id) {
      Alert.alert("Error", "User not logged in.");
      return false;
    }

    setIsLoading(true);
    try {
      const ws = await workspaceService.joinWorkspace(code, user.id);
      if (ws) {
        // Add to workspaces in store if not already present
        const state = useAppStore.getState();
        if (!state.workspaces.some(w => w.id === ws.id)) {
          addWorkspace(ws);
        }
        Alert.alert("Success", `Successfully joined workspace "${ws.name}"!`);
        return true;
      } else {
        Alert.alert("Error", "Workspace not found. Please check the code.");
        return false;
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "An error occurred while joining workspace.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getMembers = async (workspaceId: string): Promise<WorkspaceMember[]> => {
    try {
      return await workspaceService.getWorkspaceMembers(workspaceId);
    } catch (err) {
      console.error('Failed to fetch members:', err);
      return [];
    }
  };

  const deleteWorkspace = async (id: string) => {
    setIsLoading(true);
    try {
      const success = await workspaceService.deleteWorkspace(id, user?.id);
      if (success) {
        const state = useAppStore.getState();
        state.setWorkspaces(state.workspaces.filter(ws => ws.id !== id));
        if (state.selectedWorkspaceId === id) {
          state.setSelectedWorkspaceId(null);
        }
        Alert.alert("Success", "Workspace deleted successfully.");
        return true;
      } else {
        Alert.alert("Error", "Failed to delete workspace.");
        return false;
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "An error occurred while deleting workspace.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && workspaces.length === 0) {
      fetchWorkspaces();
    }
  }, [user?.id, fetchWorkspaces, workspaces.length]);

  // Tag each workspace with isOwner so the UI knows what to show
  const workspacesWithMeta = workspaces.map(ws => ({
    ...ws,
    documentCount: documents.filter(doc => doc.workspaceId === ws.id).length,
    isOwner: ws.ownerId === user?.id,
  }));

  return {
    workspaces: workspacesWithMeta,
    isLoading,
    error,
    createNewWorkspace,
    joinWorkspaceByCode,
    deleteWorkspace,
    shareByCode,
    shareByLink,
    getMembers,
    refresh: fetchWorkspaces
  };
}
