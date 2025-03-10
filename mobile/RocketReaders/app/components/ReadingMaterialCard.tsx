import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ReadingMaterialCardProps {
  id: number;
  title: string;
  description?: string;
  wordCount: number;
  difficultyLevel: number;
  gradeLevel: number | string;
  dueDate?: Date;
  isAssignment?: boolean;
  onPress?: () => void;
}

const ReadingMaterialCard: React.FC<ReadingMaterialCardProps> = ({
  id,
  title,
  description,
  wordCount,
  difficultyLevel,
  gradeLevel,
  dueDate,
  isAssignment = false,
  onPress
}) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Default behavior: navigate to reading screen with the book ID
      router.push({
        pathname: 'reading',
        params: { id }
      } as any);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.contentContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {description && (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          )}
        </View>
        
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}>
            <Ionicons name="text-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{wordCount} words</Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="school-outline" size={14} color="#666" />
            <Text style={styles.metaText}>Level {difficultyLevel}</Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="bookmark-outline" size={14} color="#666" />
            <Text style={styles.metaText}>Grade {gradeLevel}</Text>
          </View>
        </View>
        
        {isAssignment && dueDate && (
          <View style={styles.dueContainer}>
            <Ionicons name="calendar" size={14} color="#FF5C00" />
            <Text style={styles.dueText}>Due: {formatDate(dueDate)}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.actionContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="book" size={20} color="#FFF" />
        </View>
        <Text style={styles.actionText}>Read</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contentContainer: {
    flex: 1,
  },
  titleContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  dueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  dueText: {
    fontSize: 12,
    color: '#FF5C00',
    marginLeft: 4,
    fontWeight: '500',
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: '#FF5C00',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
});

export default ReadingMaterialCard; 