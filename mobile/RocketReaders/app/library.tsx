import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ReadingMaterialCard from './components/ReadingMaterialCard';

// Mock reading materials data
const readingMaterials = [
  {
    id: 1,
    title: "The Cat in the Hat",
    description: "Sally and her brother are alone on a rainy day when a cat in a tall striped hat appears and brings chaos and fun.",
    wordCount: 1621,
    difficultyLevel: 2,
    gradeLevel: "K",
    category: "Fiction"
  },
  {
    id: 2,
    title: "Green Eggs and Ham",
    description: "Sam-I-am tries to convince a character to try green eggs and ham in various locations and with different companions.",
    wordCount: 783,
    difficultyLevel: 1,
    gradeLevel: "K",
    category: "Fiction"
  },
  {
    id: 3,
    title: "Where the Wild Things Are",
    description: "Max sails to an island where he becomes king of the Wild Things, but eventually decides to return home.",
    wordCount: 338,
    difficultyLevel: 3,
    gradeLevel: "1",
    category: "Fiction"
  },
  {
    id: 4,
    title: "The Very Hungry Caterpillar",
    description: "A caterpillar eats through various foods before transforming into a beautiful butterfly.",
    wordCount: 224,
    difficultyLevel: 1,
    gradeLevel: "K",
    category: "Non-fiction"
  },
  {
    id: 5,
    title: "Charlotte's Web",
    description: "A pig named Wilbur befriends a spider named Charlotte who helps save him from being slaughtered.",
    wordCount: 1158,
    difficultyLevel: 4,
    gradeLevel: "2",
    category: "Fiction"
  },
  {
    id: 6,
    title: "Goodnight Moon",
    description: "A bedtime story that describes a bunny saying goodnight to everything in its room.",
    wordCount: 130,
    difficultyLevel: 1,
    gradeLevel: "K",
    category: "Fiction"
  },
  {
    id: 7,
    title: "The Lost Puppy",
    description: "Max the puppy gets lost and finds his way back home with the help of a kind child.",
    wordCount: 78,
    difficultyLevel: 2,
    gradeLevel: "1",
    category: "Fiction"
  },
  {
    id: 8,
    title: "Amazing Animals: Dolphins",
    description: "Learn about dolphins, their habitat, and how they communicate with each other.",
    wordCount: 215,
    difficultyLevel: 3,
    gradeLevel: "2",
    category: "Non-fiction"
  }
];

const categories = ["All", "Fiction", "Non-fiction"];
const grades = ["All", "K", "1", "2", "3"];
const levels = ["All", "1", "2", "3", "4"];

export default function LibraryScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  
  const filteredMaterials = readingMaterials.filter(material => {
    // Search filter
    if (searchQuery && !material.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Category filter
    if (selectedCategory !== 'All' && material.category !== selectedCategory) {
      return false;
    }
    
    // Grade filter
    if (selectedGrade !== 'All' && material.gradeLevel !== selectedGrade) {
      return false;
    }
    
    // Level filter
    if (selectedLevel !== 'All' && material.difficultyLevel !== parseInt(selectedLevel)) {
      return false;
    }
    
    return true;
  });
  
  const renderFilterChips = (
    options: string[], 
    selectedOption: string, 
    setSelectedOption: React.Dispatch<React.SetStateAction<string>>
  ) => {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsContainer}
      >
        {options.map((option: string) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.filterChip,
              selectedOption === option && styles.selectedFilterChip
            ]}
            onPress={() => setSelectedOption(option)}
          >
            <Text 
              style={[
                styles.filterChipText,
                selectedOption === option && styles.selectedFilterChipText
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };
  
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for books..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Category</Text>
        {renderFilterChips(categories, selectedCategory, setSelectedCategory)}
        
        <Text style={styles.filterLabel}>Grade Level</Text>
        {renderFilterChips(grades, selectedGrade, setSelectedGrade)}
        
        <Text style={styles.filterLabel}>Difficulty</Text>
        {renderFilterChips(levels, selectedLevel, setSelectedLevel)}
      </View>
      
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsCount}>
          {filteredMaterials.length} {filteredMaterials.length === 1 ? 'book' : 'books'} found
        </Text>
        
        <FlatList
          data={filteredMaterials}
          renderItem={({ item }) => (
            <ReadingMaterialCard
              id={item.id}
              title={item.title}
              description={item.description}
              wordCount={item.wordCount}
              difficultyLevel={item.difficultyLevel}
              gradeLevel={item.gradeLevel}
            />
          )}
          keyExtractor={item => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.materialsListContainer}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    marginTop: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 4,
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  filterChipsContainer: {
    paddingBottom: 8,
  },
  filterChip: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedFilterChip: {
    backgroundColor: '#FF5C00',
    borderColor: '#FF5C00',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  selectedFilterChipText: {
    color: 'white',
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  materialsListContainer: {
    paddingBottom: 16,
  },
}); 