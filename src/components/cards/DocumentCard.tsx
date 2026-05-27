import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { Document } from '../../models/types';
import { FileText, Clock, Hash, Star } from 'lucide-react-native';

interface DocumentCardProps {
  document: Document;
  onPress?: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  compact?: boolean;
}

const getCategoryTheme = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'engineering':
      return {
        bg: 'rgba(14, 165, 233, 0.08)', // sky-500
        border: 'rgba(14, 165, 233, 0.2)',
        icon: '#38bdf8', // sky-400
        text: '#38bdf8',
      };
    case 'product':
      return {
        bg: 'rgba(168, 85, 247, 0.08)', // purple-500
        border: 'rgba(168, 85, 247, 0.2)',
        icon: '#c084fc', // purple-400
        text: '#c084fc',
      };
    case 'marketing':
      return {
        bg: 'rgba(244, 63, 94, 0.08)', // rose-500
        border: 'rgba(244, 63, 94, 0.2)',
        icon: '#fb7185', // rose-400
        text: '#fb7185',
      };
    default:
      return {
        bg: 'rgba(16, 185, 129, 0.08)', // emerald-500
        border: 'rgba(16, 185, 129, 0.2)',
        icon: '#34d399', // emerald-400
        text: '#34d399',
      };
  }
};

export function DocumentCard({ document, onPress, isFavorite, onToggleFavorite, compact }: DocumentCardProps) {
  const theme = getCategoryTheme(document.metadata.category);
  const maxTags = compact ? 1 : 2;
  const displayTags = document.metadata.tags.slice(0, maxTags);
  const remainingTags = document.metadata.tags.length - maxTags;

  return (
    <Pressable 
      onPress={() => onPress?.(document.id)}
      style={({ pressed }: { pressed: boolean }) => [
        styles.card,
        pressed && styles.cardPressed
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <FileText color={theme.icon} size={22} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{document.title}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <Text style={[styles.categoryText, { color: theme.text }]}>
              {document.metadata.category}
            </Text>
          </View>
        </View>
        {onToggleFavorite && (
          <Pressable 
            onPress={() => {
              onToggleFavorite(document.id);
            }}
            style={[
              styles.favoriteButton,
              isFavorite && styles.favoriteButtonActive
            ]}
            hitSlop={12}
          >
            <Star 
              color={isFavorite ? '#eab308' : '#94a3b8'} 
              fill={isFavorite ? '#eab308' : 'transparent'} 
              size={15} 
            />
          </Pressable>
        )}
      </View>
      
      <Text style={styles.excerpt} numberOfLines={2}>
        {document.excerpt}
      </Text>

      <View style={styles.footer}>
        <View style={styles.tagsContainer}>
          {displayTags.map(tag => (
            <View key={tag} style={styles.badge}>
              <Hash color="#94a3b8" size={10} style={{ marginRight: 2 }} />
              <Text style={styles.badgeText}>{tag}</Text>
            </View>
          ))}
          {remainingTags > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>+{remainingTags}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.dateContainer}>
          <Clock color="#64748b" size={12} style={{ marginRight: 4 }} />
          <Text style={styles.dateText}>
            {new Date(document.updatedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff', // pure white
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)', // subtle border
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: '#f8fafc',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    transform: [{ scale: 0.985 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  titleContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b', // slate-800
    letterSpacing: -0.1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9', // slate-100
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  excerpt: {
    fontSize: 14,
    color: '#475569', // slate-600
    lineHeight: 22,
    marginBottom: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9', // slate-100
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
    marginRight: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9', // slate-100
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569', // slate-600
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
});
