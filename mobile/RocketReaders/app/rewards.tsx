import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Define types for our data
interface Achievement {
  id: number;
  name: string;
  description: string;
  isEarned: boolean;
  date?: string;
  image: string;
}

interface Reward {
  id: number;
  name: string;
  description: string;
  pointCost: number;
  isPurchased: boolean;
  image: string;
}

// Dummy data
const achievements: Achievement[] = [
  {
    id: 1,
    name: 'First Book',
    description: 'Complete your first reading session',
    isEarned: true,
    date: '2023-03-01',
    image: '🏆'
  },
  {
    id: 2,
    name: 'Speed Reader',
    description: 'Read more than 80 words per minute',
    isEarned: true,
    date: '2023-03-03',
    image: '🚀'
  },
  {
    id: 3,
    name: 'Bookworm',
    description: 'Read for 7 days in a row',
    isEarned: true,
    date: '2023-03-07',
    image: '🐛'
  },
  {
    id: 4,
    name: 'Accuracy Master',
    description: 'Achieve 95% accuracy in a reading',
    isEarned: false,
    image: '🎯'
  },
  {
    id: 5,
    name: 'Word Explorer',
    description: 'Read 5000 words total',
    isEarned: false,
    image: '🔍'
  },
  {
    id: 6,
    name: 'Library Legend',
    description: 'Read 20 different books',
    isEarned: false,
    image: '📚'
  }
];

const rewards: Reward[] = [
  {
    id: 1,
    name: 'Rocket Ship Avatar',
    description: 'Unlock a special rocket ship avatar',
    pointCost: 100,
    isPurchased: true,
    image: '🚀'
  },
  {
    id: 2,
    name: 'Space Theme',
    description: 'Space theme for your reading dashboard',
    pointCost: 150,
    isPurchased: false,
    image: '🌠'
  },
  {
    id: 3,
    name: 'Animal Stickers',
    description: 'Fun animal stickers for your profile',
    pointCost: 200,
    isPurchased: false,
    image: '🐶'
  },
  {
    id: 4,
    name: 'Superhero Theme',
    description: 'Superhero theme for your reading dashboard',
    pointCost: 250,
    isPurchased: false,
    image: '🦸‍♂️'
  }
];

export default function RewardsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('achievements');
  const [userPoints, setUserPoints] = useState(320);
  
  const earnedAchievements = achievements.filter(item => item.isEarned);
  const lockedAchievements = achievements.filter(item => !item.isEarned);
  
  const purchaseReward = (reward: Reward) => {
    // In a real app, this would call an API to purchase the reward
    if (userPoints >= reward.pointCost) {
      setUserPoints(prev => prev - reward.pointCost);
      // Update the reward status
      // This is just a mock - in real app we would update the state correctly
      alert(`You've purchased ${reward.name}!`);
    } else {
      alert(`Not enough points! You need ${reward.pointCost - userPoints} more points.`);
    }
  };
  
  const renderAchievementsContent = () => (
    <View style={styles.achievementsContainer}>
      <View style={styles.pointsBadge}>
        <Ionicons name="star" size={24} color="#FFD700" />
        <Text style={styles.pointsText}>{userPoints} points</Text>
      </View>
      
      <Text style={styles.sectionTitle}>Earned Achievements</Text>
      <View style={styles.achievementsList}>
        {earnedAchievements.map((achievement) => (
          <View key={achievement.id} style={styles.achievementCard}>
            <Text style={styles.achievementIcon}>{achievement.image}</Text>
            <Text style={styles.achievementName}>{achievement.name}</Text>
            <Text style={styles.achievementDescription}>{achievement.description}</Text>
            <View style={styles.earnedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.earnedText}>
                Earned: {achievement.date && new Date(achievement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </View>
        ))}
      </View>
      
      <Text style={styles.sectionTitle}>Locked Achievements</Text>
      <View style={styles.achievementsList}>
        {lockedAchievements.map((achievement) => (
          <View key={achievement.id} style={[styles.achievementCard, styles.lockedAchievement]}>
            <Text style={[styles.achievementIcon, styles.lockedIcon]}>{achievement.image}</Text>
            <Text style={styles.achievementName}>{achievement.name}</Text>
            <Text style={styles.achievementDescription}>{achievement.description}</Text>
            <View style={styles.lockedBadge}>
              <Ionicons name="lock-closed" size={16} color="#757575" />
              <Text style={styles.lockedText}>Keep reading to unlock!</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
  
  const renderRewardsContent = () => (
    <View style={styles.rewardsContainer}>
      <View style={styles.pointsBadge}>
        <Ionicons name="star" size={24} color="#FFD700" />
        <Text style={styles.pointsText}>{userPoints} points</Text>
      </View>
      
      <Text style={styles.sectionTitle}>Rewards Shop</Text>
      <Text style={styles.shopIntro}>Use your points to unlock special rewards!</Text>
      
      <View style={styles.rewardsList}>
        {rewards.map((reward) => (
          <View key={reward.id} style={styles.rewardCard}>
            <Text style={styles.rewardIcon}>{reward.image}</Text>
            <Text style={styles.rewardName}>{reward.name}</Text>
            <Text style={styles.rewardDescription}>{reward.description}</Text>
            <View style={styles.rewardFooter}>
              <View style={styles.rewardCost}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.rewardCostText}>{reward.pointCost}</Text>
              </View>
              {reward.isPurchased ? (
                <View style={styles.ownedBadge}>
                  <Text style={styles.ownedText}>Owned</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.purchaseButton, 
                    userPoints < reward.pointCost && styles.disabledButton
                  ]}
                  onPress={() => purchaseReward(reward)}
                  disabled={userPoints < reward.pointCost}
                >
                  <Text style={styles.purchaseButtonText}>Purchase</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
  
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'achievements' && styles.activeTab]} 
          onPress={() => setActiveTab('achievements')}
        >
          <Text style={[styles.tabText, activeTab === 'achievements' && styles.activeTabText]}>
            Achievements
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'rewards' && styles.activeTab]} 
          onPress={() => setActiveTab('rewards')}
        >
          <Text style={[styles.tabText, activeTab === 'rewards' && styles.activeTabText]}>
            Rewards
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        {activeTab === 'achievements' ? renderAchievementsContent() : renderRewardsContent()}
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
  achievementsContainer: {
    padding: 16,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pointsText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  achievementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  lockedAchievement: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    borderWidth: 1,
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  lockedIcon: {
    opacity: 0.5,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    height: 32,
  },
  earnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  earnedText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lockedText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  rewardsContainer: {
    padding: 16,
  },
  shopIntro: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  rewardsList: {
    flexDirection: 'column',
  },
  rewardCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rewardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  rewardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardCost: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardCostText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  purchaseButton: {
    backgroundColor: '#FF5C00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: '#BDBDBD',
  },
  purchaseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  ownedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ownedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 14,
  },
}); 