import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// Dummy data based on the provided types
const student = {
  first_name: "Alex",
  last_name: "Johnson",
  grade_level: 2,
  avatar: "https://i.pravatar.cc/150?img=12"
};

const progress = {
  total_minutes_read: 120,
  total_words_read: 5800,
  average_wcpm: 85,
  current_level: 3,
  total_points: 450,
  streak_days: 7
};

const assignments = [
  {
    id: 1,
    title: "Frog and Toad Are Friends",
    due_by: new Date(Date.now() + 24 * 60 * 60 * 1000),
    is_completed: false
  },
  {
    id: 2,
    title: "Green Eggs and Ham",
    due_by: new Date(Date.now() + 48 * 60 * 60 * 1000),
    is_completed: false
  }
];

const recentReadings = [
  {
    id: 1,
    title: "The Cat in the Hat",
    words_correct_per_minute: 82,
    accuracy_percentage: 95,
    date: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    id: 2,
    title: "Where the Wild Things Are",
    words_correct_per_minute: 78,
    accuracy_percentage: 92,
    date: new Date(Date.now() - 48 * 60 * 60 * 1000)
  }
];

const achievements = [
  {
    id: 1,
    name: "Speed Reader",
    description: "Read more than 80 words per minute!",
    badge_image_url: "🏆"
  },
  {
    id: 2,
    name: "Bookworm",
    description: "Read for 7 days in a row!",
    badge_image_url: "🐛"
  }
];

export default function Home() {
  const router = useRouter();
  
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <ScrollView>
        {/* Header with avatar and welcome message */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: student.avatar }} 
              style={styles.avatar} 
            />
          </View>
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>
              Hi, {student.first_name}!
            </Text>
            <Text style={styles.gradeText}>
              Grade {student.grade_level}
            </Text>
          </View>
          <View style={styles.pointsBadge}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.pointsText}>{progress.total_points}</Text>
          </View>
        </View>

        {/* Today's target */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Goal</Text>
          <View style={styles.goalContainer}>
            <View style={styles.goalItem}>
              <Ionicons name="time-outline" size={24} color="#FF5C00" />
              <Text style={styles.goalValue}>15 min</Text>
              <Text style={styles.goalLabel}>Reading Time</Text>
            </View>
            <View style={styles.goalItem}>
              <Ionicons name="book-outline" size={24} color="#FF5C00" />
              <Text style={styles.goalValue}>2</Text>
              <Text style={styles.goalLabel}>Books</Text>
            </View>
            <View style={styles.goalItem}>
              <Ionicons name="trending-up-outline" size={24} color="#FF5C00" />
              <Text style={styles.goalValue}>{progress.average_wcpm + 5}</Text>
              <Text style={styles.goalLabel}>Target WCPM</Text>
            </View>
          </View>
          <View style={styles.streakContainer}>
            <Ionicons name="flame" size={24} color="#FF5C00" />
            <Text style={styles.streakText}>{progress.streak_days} day streak! Keep it up!</Text>
          </View>
        </View>

        {/* Reading Assignments */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Assignments</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {assignments.map((assignment) => (
            <TouchableOpacity 
              key={assignment.id} 
              style={styles.assignmentItem}
              onPress={() => router.push('reading' as any)}
            >
              <View style={styles.assignmentInfo}>
                <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                <Text style={styles.assignmentDue}>
                  Due: {formatDate(assignment.due_by)}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.startButton}
                onPress={() => router.push('reading' as any)}
              >
                <Text style={styles.startButtonText}>Start</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Reading Sessions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Readings</Text>
            <TouchableOpacity onPress={() => router.push('progress' as any)}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentReadings.map((session) => (
            <View key={session.id} style={styles.sessionItem}>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
              </View>
              <View style={styles.sessionStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{session.words_correct_per_minute}</Text>
                  <Text style={styles.statLabel}>WCPM</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{session.accuracy_percentage}%</Text>
                  <Text style={styles.statLabel}>Accuracy</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Achievements */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Achievements</Text>
            <TouchableOpacity onPress={() => router.push('rewards' as any)}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
            {achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementItem}>
                <Text style={styles.achievementEmoji}>{achievement.badge_image_url}</Text>
                <Text style={styles.achievementName}>{achievement.name}</Text>
                <Text style={styles.achievementDesc}>{achievement.description}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.achievementItem}>
              <Text style={[styles.achievementEmoji, styles.lockedAchievement]}>🔒</Text>
              <Text style={styles.achievementName}>???</Text>
              <Text style={styles.achievementDesc}>Keep reading to unlock!</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('reading' as any)}
          >
            <Ionicons name="book" size={24} color="white" />
            <Text style={styles.actionButtonText}>Start Reading</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    marginTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF8E1',
    marginTop: 0,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF5C00',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  welcomeContainer: {
    marginLeft: 12,
    flex: 1,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  gradeText: {
    fontSize: 14,
    color: '#666',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFECB3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pointsText: {
    marginLeft: 4,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF5C00',
  },
  goalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  goalItem: {
    alignItems: 'center',
    flex: 1,
  },
  goalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#333',
  },
  goalLabel: {
    fontSize: 12,
    color: '#666',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  streakText: {
    marginLeft: 8,
    fontWeight: '500',
    color: '#FF5C00',
  },
  assignmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  assignmentDue: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  startButton: {
    backgroundColor: '#FF5C00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  startButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  sessionDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sessionStats: {
    flexDirection: 'row',
  },
  statItem: {
    alignItems: 'center',
    marginLeft: 16,
    minWidth: 60,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  achievementsScroll: {
    marginTop: 8,
  },
  achievementItem: {
    alignItems: 'center',
    width: 100,
    marginRight: 12,
  },
  achievementEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  lockedAchievement: {
    opacity: 0.6,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  quickActions: {
    padding: 16,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5C00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#FF5C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});
