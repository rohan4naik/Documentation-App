import { useLocalSearchParams } from 'expo-router';
import { WorkspaceDetailView } from '../../views/WorkspaceDetailView';

export default function WorkspaceDetailScreen() {
  const { id } = useLocalSearchParams();
  return <WorkspaceDetailView id={id as string} />;
}
