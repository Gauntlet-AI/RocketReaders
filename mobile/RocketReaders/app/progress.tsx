import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';

// Dummy data
const progressData = {
  totalMinutesRead: 120,
  totalBooksRead: 15,
  totalWordsRead: 5800,
  averageWcpm: 85,
  currentLevel: 3,
  streakDays: 7,
};

const readingHistory = [
  { id: 1, date: '2023-03-01', title: 'The Cat in the Hat', wcpm: 62, accuracy: 89 },
  { id: 2, date: '2023-03-02', title: 'Green Eggs and Ham', wcpm: 68, accuracy: 91 },
  { id: 3, date: '2023-03-03', title: 'Where the Wild Things Are', wcpm: 65, accuracy: 90 },
  { id: 4, date: '2023-03-04', title: 'The Very Hungry Caterpillar', wcpm: 72, accuracy: 93 },
  { id: 5, date: '2023-03-05', title: 'Goodnight Moon', wcpm: 76, accuracy: 94 },
  { id: 6, date: '2023-03-06', title: 'Charlotte\'s Web', wcpm: 78, accuracy: 95 },
  { id: 7, date: '2023-03-07', title: 'The Lost Puppy', wcpm: 82, accuracy: 95 },
];

const wcpmData = {
  labels: readingHistory.map((_, index) => `Day ${index + 1}`),
  datasets: [
    {
      data: readingHistory.map(session => session.wcpm),
      color: (opacity = 1) => `rgba(255, 92, 0, ${opacity})`,
      strokeWidth: 2
    }
  ],
  legend: ["Words Correct Per Minute"]
};

export default function ProgressScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('stats');
  
  const renderStatContent = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCards}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="time-outline" size={24} color="#FF5C00" />
          </View>
          <Text style={styles.statValue}>{progressData.totalMinutesRead}</Text>
          <Text style={styles.statLabel}>Total Minutes</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="book-outline" size={24} color="#FF5C00" />
          </View>
          <Text style={styles.statValue}>{progressData.totalBooksRead}</Text>
          <Text style={styles.statLabel}>Books Read</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="text-outline" size={24} color="#FF5C00" />
          </View>
          <Text style={styles.statValue}>{progressData.totalWordsRead}</Text>
          <Text style={styles.statLabel}>Words Read</Text>
        </View>
      </View>
      
      <View style={styles.averageContainer}>
        <Text style={styles.sectionTitle}>Reading Speed</Text>
        <View style={styles.averageBox}>
          <Text style={styles.bigStat}>{progressData.averageWcpm}</Text>
          <Text style={styles.statType}>Average Words Correct Per Minute</Text>
          <View style={styles.levelIndicator}>
            <Text style={styles.levelText}>Current Level: {progressData.currentLevel}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(progressData.currentLevel / 10) * 100}%` }]} />
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>WCPM Progress</Text>
        <LineChart
          data={wcpmData}
          width={Dimensions.get('window').width - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#ffa726',
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>
      
      <View style={styles.streakContainer}>
        <Ionicons name="flame" size={24} color="#FF5C00" />
        <Text style={styles.streakText}>{progressData.streakDays} day streak! Keep it up!</Text>
      </View>
    </View>
  );
  
  const renderHistoryContent = () => (
    <View style={styles.historyContainer}>
      <Text style={styles.sectionTitle}>Reading History</Text>
      {readingHistory.map((session) => (
        <View key={session.id} style={styles.historyItem}>
          <View style={styles.historyItemLeft}>
            <Text style={styles.historyDate}>
              {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
            <Text style={styles.historyTitle}>{session.title}</Text>
          </View>
          <View style={styles.historyStats}>
            <View style={styles.historyStat}>
              <Text style={styles.historyStatValue}>{session.wcpm}</Text>
              <Text style={styles.historyStatLabel}>WCPM</Text>
            </View>
            <View style={styles.historyStat}>
              <Text style={styles.historyStatValue}>{session.accuracy}%</Text>
              <Text style={styles.historyStatLabel}>Accuracy</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
  
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]} 
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Stats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]} 
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        {activeTab === 'stats' ? renderStatContent() : renderHistoryContent()}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginTop: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF5C00',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#FF5C00',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    padding: 16,
  },
  statCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    width: '31%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    backgroundColor: '#FFF8E1',
    padding: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  averageContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  averageBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bigStat: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FF5C00',
  },
  statType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  levelIndicator: {
    width: '100%',
  },
  levelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF5C00',
  },
  chartContainer: {
    marginBottom: 16,
  },
  chart: {
    borderRadius: 12,
    padding: 8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
  },
  streakText: {
    marginLeft: 8,
    fontWeight: '500',
    color: '#FF5C00',
    fontSize: 16,
  },
  historyContainer: {
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyItemLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  historyStats: {
    flexDirection: 'row',
  },
  historyStat: {
    alignItems: 'center',
    marginLeft: 16,
    minWidth: 60,
  },
  historyStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  historyStatLabel: {
    fontSize: 12,
    color: '#666',
  },
}); 