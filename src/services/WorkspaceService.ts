import { supabase } from './supabaseClient';
import type { Workspace, WorkspaceMember } from '../models/types';

// Helper to map DB row to our frontend Workspace type
const mapToFrontendWorkspace = (row: any): Workspace => ({
  id: row.id,
  name: row.name,
  code: row.code,
  shareLink: row.share_link || `https://docapp.com/share/${row.id}`,
  documentCount: row.document_count || 0,
  ownerId: row.owner_id,
});

export class WorkspaceService {
  async getWorkspaces(userId: string): Promise<Workspace[]> {
    // RLS handles filtering: only owned + joined workspaces are returned
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching workspaces:', error);
      return [];
    }

    return (data || []).map(mapToFrontendWorkspace);
  }

  async createWorkspace(name: string, userId: string): Promise<Workspace | null> {
    const randomCodeNum = Math.floor(100 + Math.random() * 900);
    const suffix = name.substring(0, 4).toUpperCase();
    const code = `WS-${randomCodeNum}-${suffix}`;

    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        name: name.trim(),
        code,
        share_link: `https://docapp.com/share/${code}`,
        owner_id: userId,
        document_count: 0
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating workspace:', error);
      return null;
    }

    return mapToFrontendWorkspace(data);
  }

  async joinWorkspace(code: string, userId: string): Promise<Workspace | null> {
    // Use the SECURITY DEFINER RPC to look up any workspace by code,
    // bypassing the restrictive RLS policy (user isn't a member yet)
    const { data, error } = await supabase
      .rpc('find_workspace_by_code', { p_code: code.trim().toUpperCase() });

    if (error) {
      console.error('Error looking up workspace code:', error);
      return null;
    }

    // RPC returns an array — take the first result
    const ws = data && data.length > 0 ? data[0] : null;

    if (!ws) {
      return null; // No workspace with that code
    }

    // If caller is the owner, just return the workspace (already a member)
    if (ws.owner_id === userId) {
      return mapToFrontendWorkspace(ws);
    }

    // Insert into workspace_members (upsert = safe if already joined)
    const { error: insertError } = await supabase
      .from('workspace_members')
      .upsert(
        { workspace_id: ws.id, user_id: userId },
        { onConflict: 'workspace_id,user_id', ignoreDuplicates: true }
      );

    if (insertError) {
      console.error('Error inserting workspace_member:', insertError);
    }

    return mapToFrontendWorkspace(ws);
  }

  // Fetch all members of a workspace — uses SECURITY DEFINER RPC, only works for owners
  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const { data, error } = await supabase
      .rpc('get_workspace_members_for_owner', { p_workspace_id: workspaceId });

    if (error || !data) {
      console.error('Error fetching workspace members:', error);
      return [];
    }

    const members: WorkspaceMember[] = (data as any[]).map((row: any) => ({
      userId: row.user_id,
      email: row.user_id, // fallback to userId; enrich with email if auth.users is exposed
      joinedAt: row.joined_at,
    }));

    return members;
  }

  async deleteWorkspace(id: string, userId?: string): Promise<boolean> {
    if (userId) {
      // Check if user is owner or just a member
      const { data: ws } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', id)
        .maybeSingle();

      if (ws && ws.owner_id !== userId) {
        // Member — just leave by removing membership row
        const { error: leaveError } = await supabase
          .from('workspace_members')
          .delete()
          .eq('workspace_id', id)
          .eq('user_id', userId);

        if (leaveError) {
          console.error('Error leaving workspace:', leaveError);
          return false;
        }
        return true;
      }
    }

    // Owner — delete the entire workspace (CASCADE removes member rows)
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting workspace:', error);
      return false;
    }

    return true;
  }

  async getJoinedWorkspaceIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId);

    if (error || !data) return [];
    return data.map((r: any) => r.workspace_id);
  }
}

export const workspaceService = new WorkspaceService();
