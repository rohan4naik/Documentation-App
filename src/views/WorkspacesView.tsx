import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Platform, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useWorkspacesViewModel } from '../viewmodels/useWorkspacesViewModel';
import { ChevronLeft, Plus, Share2, Hash, Folder, Check, Users, Trash2, LogOut, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import type { WorkspaceMember } from '../models/types';

export function WorkspacesView() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { workspaces, createNewWorkspace, joinWorkspaceByCode, deleteWorkspace, shareByCode, shareByLink, getMembers } = useWorkspacesViewModel();
  const { selectedWorkspaceId, setSelectedWorkspaceId } = useAppStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [newWsName, setNewWsName] = useState('');

  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // Track expanded members panels per workspace
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});
  const [membersData, setMembersData] = useState<Record<string, WorkspaceMember[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<Record<string, boolean>>({});

  const handleCreate = () => {
    if (newWsName.trim()) {
      createNewWorkspace(newWsName);
      setNewWsName('');
      setModalVisible(false);
    }
  };

  const handleJoin = async () => {
    if (joinCode.trim()) {
      const success = await joinWorkspaceByCode(joinCode);
      if (success) {
        setJoinCode('');
        setJoinModalVisible(false);
      }
    }
  };

  const toggleMembers = async (wsId: string) => {
    const isExpanded = expandedMembers[wsId];
    if (!isExpanded && !membersData[wsId]) {
      setLoadingMembers(prev => ({ ...prev, [wsId]: true }));
      const members = await getMembers(wsId);
      setMembersData(prev => ({ ...prev, [wsId]: members }));
      setLoadingMembers(prev => ({ ...prev, [wsId]: false }));
    }
    setExpandedMembers(prev => ({ ...prev, [wsId]: !isExpanded }));
  };

  const handleDelete = (ws: { id: string; name: string; isOwner?: boolean }) => {
    const isOwner = ws.isOwner ?? false;
    Alert.alert(
      isOwner ? 'Delete Workspace' : 'Leave Workspace',
      isOwner
        ? `Delete "${ws.name}"? This will permanently remove all its documents and members.`
        : `Leave "${ws.name}"? You will lose access to its documents.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isOwner ? 'Delete' : 'Leave',
          style: 'destructive',
          onPress: () => deleteWorkspace(ws.id),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.iconButtonPressed]}
          onPress={() => router.back()}
        >
          <ChevronLeft color="#3b82f6" size={28} />
        </Pressable>
        <Text style={styles.navTitle}>Workspaces</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>
        {/* Action Buttons */}
        <View style={styles.topActionsRow}>
          <Pressable
            style={({ pressed }) => [styles.topActionBtn, pressed && styles.topActionBtnPressed]}
            onPress={() => setModalVisible(true)}
          >
            <Plus color="#2563eb" size={18} />
            <Text style={styles.topActionBtnText}>Create Workspace</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.topActionBtn, pressed && styles.topActionBtnPressed]}
            onPress={() => setJoinModalVisible(true)}
          >
            <Users color="#2563eb" size={18} />
            <Text style={styles.topActionBtnText}>Join by Code</Text>
          </Pressable>
        </View>

        {/* Workspace Cards */}
        <View style={styles.list}>
          {workspaces.map((ws) => {
            const isOwner = (ws as any).isOwner ?? false;
            const isExpanded = expandedMembers[ws.id] ?? false;
            const members = membersData[ws.id] ?? [];
            const isLoadingM = loadingMembers[ws.id] ?? false;

            return (
              <View
                key={ws.id}
                style={[styles.wsCard, selectedWorkspaceId === ws.id && styles.wsCardSelected]}
              >
                {/* Workspace Info Row */}
                <Pressable
                  style={({ pressed }) => [styles.cardInfoPressable, pressed && styles.cardInfoPressed]}
                  onPress={() => {
                    setSelectedWorkspaceId(ws.id);
                    router.push(`/workspace/${ws.id}`);
                  }}
                >
                  <View style={[styles.iconWrapper, selectedWorkspaceId === ws.id && styles.iconWrapperSelected]}>
                    <Folder color={selectedWorkspaceId === ws.id ? '#2563eb' : '#60a5fa'} size={24} />
                  </View>
                  <View style={styles.metaWrapper}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={[styles.wsName, selectedWorkspaceId === ws.id && styles.wsNameSelected]}>
                        {ws.name}
                      </Text>
                      {isOwner ? (
                        <View style={styles.ownerBadge}>
                          <Text style={styles.ownerBadgeText}>Owner</Text>
                        </View>
                      ) : (
                        <View style={styles.memberBadge}>
                          <Text style={styles.memberBadgeText}>Joined</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.wsCount}>{ws.documentCount} documents</Text>
                    <Text style={styles.wsCode}>Code: {ws.code}</Text>
                  </View>
                  {selectedWorkspaceId === ws.id && (
                    <View style={styles.activeCheckWrapper}>
                      <Check color="#2563eb" size={18} />
                      <Text style={styles.activeText}>Active</Text>
                    </View>
                  )}
                </Pressable>

                {/* Members Panel — only visible to owner */}
                {isOwner && (
                  <Pressable
                    style={({ pressed }) => [styles.membersToggle, pressed && styles.membersTogglePressed]}
                    onPress={() => toggleMembers(ws.id)}
                  >
                    <Users color="#8b5cf6" size={14} />
                    <Text style={styles.membersToggleText}>
                      {isExpanded ? 'Hide Members' : 'View Members'}
                    </Text>
                    {isExpanded
                      ? <ChevronUp color="#8b5cf6" size={14} />
                      : <ChevronDown color="#8b5cf6" size={14} />}
                  </Pressable>
                )}

                {isOwner && isExpanded && (
                  <View style={styles.membersPanel}>
                    {isLoadingM ? (
                      <ActivityIndicator size="small" color="#8b5cf6" style={{ marginVertical: 8 }} />
                    ) : members.length === 0 ? (
                      <Text style={styles.noMembersText}>No members have joined yet.</Text>
                    ) : (
                      members.map((m, idx) => (
                        <View key={m.userId} style={styles.memberRow}>
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>
                              {String(idx + 1)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.memberEmail} numberOfLines={1}>
                              {m.email === m.userId ? `Member ${idx + 1}` : m.email}
                            </Text>
                            <Text style={styles.memberJoined}>
                              Joined {new Date(m.joinedAt).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {/* Action Row */}
                <View style={styles.shareRow}>
                  <Pressable
                    style={({ pressed }) => [styles.shareAction, pressed && styles.shareActionPressed]}
                    onPress={() => shareByCode(ws)}
                  >
                    <Hash color="#8b5cf6" size={16} />
                    <Text style={styles.shareActionText}>Access Code</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.shareAction, pressed && styles.shareActionPressed]}
                    onPress={() => shareByLink(ws)}
                  >
                    <Share2 color="#3b82f6" size={16} />
                    <Text style={styles.shareActionText}>Share Link</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.deleteAction, pressed && styles.deleteActionPressed]}
                    onPress={() => handleDelete({ id: ws.id, name: ws.name, isOwner })}
                  >
                    {isOwner
                      ? <Trash2 color="#ef4444" size={16} />
                      : <LogOut color="#f97316" size={16} />}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Create Workspace Modal */}
      <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Workspace</Text>
            <Text style={styles.modalSubtitle}>Create a shared space for your team's documentation.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Workspace Name (e.g. Sales Team)"
              placeholderTextColor="#64748b"
              value={newWsName}
              onChangeText={setNewWsName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => { setNewWsName(''); setModalVisible(false); }}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnCreate]} onPress={handleCreate}>
                <Text style={styles.modalBtnCreateText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join Workspace Modal */}
      <Modal animationType="fade" transparent visible={joinModalVisible} onRequestClose={() => setJoinModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Workspace</Text>
            <Text style={styles.modalSubtitle}>Enter the access code shared by your teammate.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Workspace Code (e.g. WS-481-MAIN)"
              placeholderTextColor="#64748b"
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => { setJoinCode(''); setJoinModalVisible(false); }}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnCreate]} onPress={handleJoin}>
                <Text style={styles.modalBtnCreateText}>Join</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  topNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 44,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start', marginLeft: -8 },
  iconButtonPressed: { opacity: 0.5 },
  navTitle: { fontSize: 17, fontWeight: '600', color: '#1e293b', textAlign: 'center' },
  scrollContent: { padding: 16, paddingTop: 20 },
  topActionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  topActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1',
    borderRadius: 12, paddingVertical: 12, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  topActionBtnPressed: { backgroundColor: '#f8fafc', borderColor: '#94a3b8' },
  topActionBtnText: { color: '#1e293b', fontSize: 14, fontWeight: '600' },
  list: { gap: 16 },
  wsCard: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  wsCardSelected: { borderColor: '#2563eb', borderWidth: 1.5, backgroundColor: '#f8fafc' },
  cardInfoPressable: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardInfoPressed: { opacity: 0.7 },
  iconWrapper: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(96,165,250,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  iconWrapperSelected: { backgroundColor: 'rgba(37,99,235,0.15)' },
  metaWrapper: { flex: 1 },
  nameBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  wsName: { color: '#1e293b', fontSize: 17, fontWeight: '600' },
  wsNameSelected: { color: '#2563eb' },
  ownerBadge: {
    backgroundColor: 'rgba(37,99,235,0.1)', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  ownerBadgeText: { color: '#2563eb', fontSize: 11, fontWeight: '700' },
  memberBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  memberBadgeText: { color: '#059669', fontSize: 11, fontWeight: '700' },
  wsCount: { color: '#64748b', fontSize: 13, marginBottom: 4 },
  wsCode: { color: '#94a3b8', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  activeCheckWrapper: { alignItems: 'center', justifyContent: 'center', paddingLeft: 8 },
  activeText: { color: '#2563eb', fontSize: 11, fontWeight: '700', marginTop: 2 },
  // Members toggle
  membersToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8,
    alignSelf: 'flex-start',
  },
  membersTogglePressed: { backgroundColor: 'rgba(139,92,246,0.15)' },
  membersToggleText: { color: '#7c3aed', fontSize: 13, fontWeight: '600' },
  // Members panel
  membersPanel: {
    backgroundColor: '#faf7ff', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
    padding: 12, marginBottom: 12, gap: 8,
  },
  noMembersText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingVertical: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  memberEmail: { color: '#1e293b', fontSize: 13, fontWeight: '500' },
  memberJoined: { color: '#94a3b8', fontSize: 11, marginTop: 1 },
  // Share row
  shareRow: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, gap: 10,
  },
  shareAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
    paddingVertical: 10, borderRadius: 12, gap: 6,
  },
  shareActionPressed: { backgroundColor: '#e2e8f0', borderColor: '#cbd5e1' },
  shareActionText: { color: '#475569', fontSize: 13, fontWeight: '500' },
  deleteAction: {
    width: 44, height: 40, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 12,
  },
  deleteActionPressed: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalContent: {
    width: '100%', maxWidth: 400, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#64748b', marginBottom: 20, lineHeight: 20 },
  modalInput: {
    width: '100%', height: 48, backgroundColor: '#f1f5f9',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 16, fontSize: 16, color: '#1e293b', marginBottom: 24,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnCancel: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  modalBtnCancelText: { color: '#475569', fontSize: 15, fontWeight: '600' },
  modalBtnCreate: { backgroundColor: '#2563eb' },
  modalBtnCreateText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
