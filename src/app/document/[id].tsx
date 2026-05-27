import { useLocalSearchParams } from 'expo-router';
import { DocumentDetailView } from '../../views/DocumentDetailView';

export default function DocumentViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DocumentDetailView id={id as string} />;
}
