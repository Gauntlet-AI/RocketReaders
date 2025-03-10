import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { OpenAI } from 'openai';

// Dummy reading material
const sampleReadingMaterial = {
  id: 1,
  title: "The Lost Puppy",
  content: "Max was a little brown puppy who loved to play. One day, Max saw an open gate. He ran outside to explore. Max ran down the street. He saw many new things. Soon, Max did not know where he was. He was lost! Max felt scared. A girl named Lily found Max. She saw his collar. Lily called the number on the collar. Max's family was happy to find him. They gave Lily a big thank you. Max was happy to be home.",
  difficulty_level: 2,
  word_count: 78,
  grade_level: 1
};

// Define OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY, // Add your API key in .env file or app.config.js
  dangerouslyAllowBrowser: true
});

// Define a type for reading errors
type ReadingError = {
  id: number;
  word: string;
  position_in_text: number;
  error_type: 'mispronunciation' | 'hesitation' | 'omission';
  actual?: string;
  similarity?: string;
};

// Empty array to be filled with actual detected errors
const mockErrors: ReadingError[] = [
  { id: 1, word: "explore", position_in_text: 57, error_type: "hesitation" as 'hesitation' },
  { id: 2, word: "collar", position_in_text: 127, error_type: "mispronunciation" as 'mispronunciation' }
];

// Define types for our word position tracking
type WordPosition = {
  word: string;
  position: number;
  endPosition: number;
};

export default function ReadingScreen() {
  const router = useRouter();
  const [readingPhase, setReadingPhase] = useState<'intro' | 'reading' | 'results' | 'review' | 'retry'>('intro');
  const [timer, setTimer] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [wcpm, setWcpm] = useState<number | null>(null);
  const [currentReview, setCurrentReview] = useState<number>(0);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  
  // Audio recording states
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errors, setErrors] = useState<ReadingError[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Highlighted content with errors using green for correct words and red for errors
  const highlightedContent = () => {
    const result: JSX.Element[] = [];
    
    // Use actual errors if available, otherwise fallback to mockErrors
    const errorsToUse = errors.length > 0 ? errors : mockErrors;
    
    // Create a map of positions to error objects for faster lookup
    const errorMap = new Map();
    errorsToUse.forEach(error => {
      errorMap.set(error.position_in_text, error);
    });
    
    // Split the content into words with their positions
    const words: WordPosition[] = [];
    let position = 0;
    
    sampleReadingMaterial.content.split(' ').forEach(word => {
      words.push({
        word,
        position,
        endPosition: position + word.length
      });
      // Move position past this word and the space after it
      position += word.length + 1;
    });
    
    // Render each word with appropriate color
    words.forEach((wordObj, index) => {
      // Check if this word position is in our errors
      const error = errorMap.get(wordObj.position);
      
      if (error) {
        // This word had an error - show in red
        result.push(
          <Text 
            key={`word-${index}`} 
            style={[styles.readingText, styles.errorWord]}
          >
            {wordObj.word}{' '}
          </Text>
        );
      } else {
        // This word was correct - show in green
        result.push(
          <Text 
            key={`word-${index}`} 
            style={[styles.readingText, styles.correctWord]}
          >
            {wordObj.word}{' '}
          </Text>
        );
      }
    });
    
    return result;
  };
  
  useEffect(() => {
    if (isTimerRunning && timer > 0) {
      timerRef.current = setTimeout(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerRunning(false);
      completeReading();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timer, isTimerRunning]);
  
  // Function to start recording audio
  const startRecording = async () => {
    try {
      // Request permissions
      const permissionResponse = await Audio.requestPermissionsAsync();
      if (permissionResponse.status !== 'granted') {
        alert('Permission to record audio is required!');
        return;
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };
  
  // Function to stop recording
  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      // Save the recording URI for later playback
      setRecordingUri(uri);
      console.log('Recording stopped and stored at', uri);
      
      // Reset recording
      setRecording(null);
      
      return uri;
    } catch (err) {
      console.error('Failed to stop recording', err);
      return null;
    }
  };
  
  // Function to play the recorded audio
  const playRecording = async () => {
    try {
      if (isPlaying) {
        // Stop current playback
        if (sound) {
          await sound.stopAsync();
          await sound.unloadAsync();
          setSound(null);
        }
        setIsPlaying(false);
        return;
      }
      
      if (!recordingUri) {
        console.error('No recording to play');
        return;
      }
      
      console.log('Loading sound from', recordingUri);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      
      // Handle playback completion
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (err) {
      console.error('Failed to play recording', err);
      setIsPlaying(false);
    }
  };
  
  // Clean up sound when component unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);
  
  // Function to analyze the recording with OpenAI Whisper
  const analyzeRecording = async (uri: string) => {
    setIsProcessing(true);
    
    try {
      console.log('Creating transcription file from', uri);
      
      // Create a form data object to send the audio file
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'audio/m4a',
        name: 'recording.m4a'
      } as any);
      formData.append('model', 'whisper-1');
      
      // Call OpenAI Whisper API to transcribe the audio
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!data.text) {
        throw new Error('No transcription returned');
      }
      
      console.log('Transcription received:', data.text);
      
      // Compare the transcription with the original text
      const detectedErrors = compareTranscriptionWithOriginal(data.text, sampleReadingMaterial.content);
      
      setErrors(detectedErrors);
      return detectedErrors;
    } catch (err) {
      console.error('Error analyzing recording', err);
      return [];
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Longest Common Subsequence algorithm to find the best alignment between transcription and original text
  const findLCS = (text1: string[], text2: string[]): number[][] => {
    const m = text1.length;
    const n = text2.length;
    
    // Create DP table
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
    
    // Fill the DP table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        // If words match (ignoring case and punctuation)
        if (text1[i - 1].replace(/[.,!?;'"-]/g, '').toLowerCase() === 
            text2[j - 1].replace(/[.,!?;'"-]/g, '').toLowerCase()) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    return dp;
  };
  
  // Function to backtrack and get the alignment
  const backtrackLCS = (
    dp: number[][], 
    text1: string[], 
    text2: string[], 
    i: number, 
    j: number,
    alignment: {originalIndex: number, transcribedIndex: number}[] = []
  ): {originalIndex: number, transcribedIndex: number}[] => {
    if (i === 0 || j === 0) {
      return alignment;
    }
    
    // If words match
    if (text1[i - 1].replace(/[.,!?;'"-]/g, '').toLowerCase() === 
        text2[j - 1].replace(/[.,!?;'"-]/g, '').toLowerCase()) {
      // Add to alignment (convert to 0-indexed)
      alignment.unshift({originalIndex: i - 1, transcribedIndex: j - 1});
      return backtrackLCS(dp, text1, text2, i - 1, j - 1, alignment);
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      return backtrackLCS(dp, text1, text2, i - 1, j, alignment);
    } else {
      return backtrackLCS(dp, text1, text2, i, j - 1, alignment);
    }
  };

  // Compare the transcription with the original text to find errors using LCS
  const compareTranscriptionWithOriginal = (transcription: string, original: string): ReadingError[] => {
    console.log('Comparing transcription:', transcription);
    console.log('With original:', original);
    
    // Normalize both texts (lowercase, remove extra whitespace)
    const normalizedTranscription = transcription.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedOriginal = original.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Split into words
    const originalWords = normalizedOriginal.split(' ');
    const transcribedWords = normalizedTranscription.split(' ');
    
    console.log('Original word count:', originalWords.length);
    console.log('Transcribed word count:', transcribedWords.length);
    
    // Find LCS and alignment
    const dp = findLCS(originalWords, transcribedWords);
    const alignment = backtrackLCS(
      dp, 
      originalWords, 
      transcribedWords, 
      originalWords.length, 
      transcribedWords.length
    );
    
    console.log('Alignment found:', alignment);
    
    const errors: ReadingError[] = [];
    let positionInText = 0;
    
    // Track which words in original were aligned
    const alignedOriginalIndices = new Set(alignment.map(a => a.originalIndex));
    
    // Process each word in original text
    for (let i = 0; i < originalWords.length; i++) {
      // Calculate position in original text
      if (i > 0) {
        positionInText += originalWords[i-1].length + 1; // +1 for space
      }
      
      const originalWord = originalWords[i];
      
      // If this original word was not aligned (omission)
      if (!alignedOriginalIndices.has(i)) {
        errors.push({
          id: errors.length + 1,
          word: originalWord,
          position_in_text: positionInText,
          error_type: 'omission',
          actual: '',
          similarity: '0.00'
        });
        console.log(`Omission detected: "${originalWord}"`);
        continue;
      }
      
      // Find this word's alignment
      const alignmentEntry = alignment.find(a => a.originalIndex === i);
      if (alignmentEntry) {
        const transcribedWord = transcribedWords[alignmentEntry.transcribedIndex];
        
        // Clean words for comparison
        const cleanOriginal = originalWord.replace(/[.,!?;'"-]/g, '').toLowerCase();
        const cleanTranscribed = transcribedWord.replace(/[.,!?;'"-]/g, '').toLowerCase();
        
        // Even if aligned by LCS, check if there are minor mispronunciations
        if (cleanOriginal !== cleanTranscribed) {
          // Calculate similarity
          const similarity = 1 - (levenshteinDistance(cleanTranscribed, cleanOriginal) / 
                              Math.max(cleanTranscribed.length, cleanOriginal.length));
          
          let errorType: 'mispronunciation' | 'hesitation' | 'omission' = 'mispronunciation';
          
          // Determine error type based on similarity
          if (similarity > 0.7) {
            errorType = 'hesitation';
          }
          
          errors.push({
            id: errors.length + 1,
            word: originalWord,
            position_in_text: positionInText,
            error_type: errorType,
            actual: transcribedWord,
            similarity: similarity.toFixed(2)
          });
          
          console.log(`Error detected: "${originalWord}" vs "${transcribedWord}" (${errorType})`);
        }
      }
    }
    
    // Check for additional words in transcription (insertions)
    // These aren't marked as errors but could be logged
    const alignedTranscribedIndices = new Set(alignment.map(a => a.transcribedIndex));
    const insertions = transcribedWords.filter((_, i) => !alignedTranscribedIndices.has(i));
    
    if (insertions.length > 0) {
      console.log(`Insertions detected: ${insertions.join(', ')}`);
    }
    
    console.log(`Total errors detected: ${errors.length}`);
    return errors;
  };
  
  // Levenshtein distance to determine similarity between words
  const levenshteinDistance = (a: string, b: string) => {
    const matrix = [];
    
    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  };
  
  const startReading = async () => {
    setReadingPhase('reading');
    setIsTimerRunning(true);
    setAttempts(prev => prev + 1);
    
    // Start recording audio
    await startRecording();
  };
  
  const completeReading = async () => {
    setIsTimerRunning(false);
    
    // Stop recording and get the uri
    const uri = await stopRecording();
    
    if (uri) {
      setIsProcessing(true);
      // Analyze the recording with Whisper
      const detectedErrors = await analyzeRecording(uri);
      
      // Calculate WCPM more accurately
      const totalWords = sampleReadingMaterial.word_count;
      const errorCount = detectedErrors.length;
      const correctWords = totalWords - errorCount;
      
      // WCPM = (total words read - errors) / time in minutes
      // Where time is measured in the actual time spent reading
      const timeInMinutes = (60 - timer) / 60; // Convert seconds to minutes
      const calculatedWcpm = Math.round(correctWords / Math.max(0.1, timeInMinutes)); // Avoid division by zero
      
      console.log(`WCPM Calculation: (${totalWords} - ${errorCount}) / ${timeInMinutes.toFixed(2)} = ${calculatedWcpm}`);
      
      setWcpm(calculatedWcpm);
      
      if (prevScore) {
        setPrevScore(prev => prev);
      } else {
        setPrevScore(calculatedWcpm);
      }
      
      setReadingPhase('results');
      
      // Show celebration if there's an improvement
      if (prevScore && calculatedWcpm > prevScore) {
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
        }, 3000);
      }
    } else {
      // Handle case where recording failed
      alert('Recording failed. Please try again.');
      setReadingPhase('intro');
    }
  };
  
  const reviewErrors = () => {
    setReadingPhase('review');
    setCurrentReview(0);
  };
  
  const handleNextReview = () => {
    // Use actual errors if available, otherwise fallback to mockErrors
    const errorsToUse = errors.length > 0 ? errors : mockErrors;
    
    if (currentReview < errorsToUse.length - 1) {
      setCurrentReview(prev => prev + 1);
    } else {
      // If this was the last review, go to results
      setReadingPhase('results');
    }
  };
  
  const retryReading = () => {
    setTimer(60);
    setReadingPhase('reading');
    setIsTimerRunning(true);
    setAttempts(prev => prev + 1);
  };
  
  const renderPhaseContent = () => {
    // Use actual errors if available, otherwise fallback to mockErrors
    const errorsToUse: ReadingError[] = errors.length > 0 ? errors : mockErrors;
    
    switch (readingPhase) {
      case 'intro':
        return (
          <View style={styles.phaseContainer}>
            <Text style={styles.title}>{sampleReadingMaterial.title}</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Level</Text>
                <Text style={styles.infoValue}>{sampleReadingMaterial.difficulty_level}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Words</Text>
                <Text style={styles.infoValue}>{sampleReadingMaterial.word_count}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Grade</Text>
                <Text style={styles.infoValue}>{sampleReadingMaterial.grade_level}</Text>
              </View>
            </View>
            <Text style={styles.instructions}>
              You'll have 1 minute to read this story out loud. Try to read as clearly and quickly as you can!
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={startReading}>
              <Text style={styles.buttonText}>Start Reading</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'reading':
        return (
          <View style={styles.readingContainer}>
            <View style={styles.timerContainer}>
              <Text style={styles.timer}>{timer}</Text>
              <Text style={styles.timerLabel}>seconds left</Text>
            </View>
            
            <ScrollView style={styles.readingContent}>
              <Text style={styles.readingText}>{sampleReadingMaterial.content}</Text>
            </ScrollView>
            
            <TouchableOpacity 
              style={[styles.button, styles.stopButton]} 
              onPress={completeReading}
            >
              <Text style={styles.buttonText}>I'm Done</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'results':
        // Show loading indicator while processing
        if (isProcessing) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4f8ef7" />
              <Text style={styles.loadingText}>Analyzing your reading...</Text>
            </View>
          );
        }
        
        return (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Great Job!</Text>
            
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Your reading speed:</Text>
              <Text style={styles.scoreValue}>{wcpm ?? 0} WCPM</Text>
              
              {prevScore && wcpm !== null && prevScore !== wcpm && (
                <Text style={[styles.prevScore, wcpm > prevScore ? styles.improved : styles.decreased]}>
                  {wcpm > prevScore ? '+' : ''}{wcpm - prevScore} from last time
                </Text>
              )}
            </View>
            
            {recordingUri && (
              <TouchableOpacity 
                style={styles.playButton} 
                onPress={playRecording}
              >
                <Ionicons 
                  name={isPlaying ? "pause-circle" : "play-circle"} 
                  size={24} 
                  color="white" 
                />
                <Text style={styles.playButtonText}>
                  {isPlaying ? "Stop Playback" : "Play Your Reading"}
                </Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.readingResultsContainer}>
              <Text style={styles.readingResultsTitle}>Your Reading:</Text>
              <ScrollView style={styles.readingResultsScroll}>
                <View style={styles.readingResultsContent}>
                  {highlightedContent()}
                </View>
              </ScrollView>
            </View>
            
            {errorsToUse.length > 0 ? (
              <TouchableOpacity 
                style={[styles.button, styles.reviewButton]} 
                onPress={reviewErrors}
              >
                <Text style={styles.buttonText}>
                  You had {errorsToUse.length} words that were difficult. Let's review them.
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.perfectScore}>Perfect score! No errors detected.</Text>
            )}
            
            <TouchableOpacity 
              style={[styles.button, styles.retryButton]} 
              onPress={retryReading}
            >
              <Text style={styles.buttonText}>Read Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.exitButton]} 
              onPress={() => router.back()}
            >
              <Text style={styles.buttonText}>Back to Library</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'review':
        const currentError = errorsToUse[currentReview];
        return (
          <View style={styles.reviewContainer}>
            <Text style={styles.reviewTitle}>Let's Review</Text>
            
            <View style={styles.wordContainer}>
              <Text style={styles.errorType}>
                {currentError.error_type === 'mispronunciation' && 'You mispronounced:'}
                {currentError.error_type === 'hesitation' && 'You hesitated on:'}
                {currentError.error_type === 'omission' && 'You skipped:'}
              </Text>
              <Text style={styles.errorReviewWord}>{currentError.word}</Text>
              
              {currentError.actual && (
                <View style={styles.actualWordContainer}>
                  <Text style={styles.actualWordLabel}>You said:</Text>
                  <Text style={styles.actualWord}>{currentError.actual || '(nothing)'}</Text>
                  {currentError.similarity && (
                    <Text style={styles.similarityScore}>
                      Similarity: {(parseFloat(currentError.similarity) * 100).toFixed(0)}%
                    </Text>
                  )}
                </View>
              )}
              
              <Text style={styles.contextLabel}>Context:</Text>
              <Text style={styles.errorContextText}>
                {sampleReadingMaterial.content.substring(
                  Math.max(0, currentError.position_in_text - 30), 
                  Math.min(sampleReadingMaterial.content.length, currentError.position_in_text + 30)
                )}
              </Text>
              
              <Text style={styles.practicePrompt}>Try reading this word again:</Text>
            </View>
            
            <View style={styles.progressIndicator}>
              <Text style={styles.progressText}>
                Word {currentReview + 1} of {errorsToUse.length}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.button, styles.nextButton]} 
              onPress={handleNextReview}
            >
              <Text style={styles.buttonText}>
                {currentReview < errorsToUse.length - 1 ? "Next Word" : "Done Reviewing"}
              </Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'retry':
        return (
          <View style={styles.phaseContainer}>
            <Text style={styles.title}>Ready to Try Again?</Text>
            <View style={styles.retryBox}>
              <Text style={styles.retryText}>
                Let's see if you can beat your previous score of {prevScore} WCPM!
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={retryReading}>
                <Text style={styles.buttonText}>Start Second Attempt</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.contentPreview}>
              <Text style={styles.contentPreviewTitle}>Your Reading Material:</Text>
              <View style={styles.contentWithHighlights}>
                {highlightedContent()}
              </View>
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.container}>
      {renderPhaseContent()}
      
      <Modal visible={showCelebration} transparent animationType="fade">
        <View style={styles.celebrationModal}>
          <View style={styles.celebrationContent}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.celebrationTitle}>Amazing!</Text>
            <Text style={styles.celebrationText}>
              You improved by {wcpm !== null && prevScore !== null ? wcpm - prevScore : 0} words per minute!
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    marginTop: 0,
  },
  phaseContainer: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  instructions: {
    fontSize: 16,
    color: '#333',
    marginVertical: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: '#FF5C00',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#FF5C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5C00',
    marginLeft: 8,
  },
  contentScrollView: {
    flex: 1,
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
  readingText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#333',
  },
  errorText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#F44336',
    fontWeight: 'bold',
    backgroundColor: '#FFEBEE',
  },
  pauseButton: {
    backgroundColor: '#666',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultItem: {
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
  },
  resultValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF5C00',
    marginTop: 8,
  },
  improvementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#F9FFF9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  improvementText: {
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorSummary: {
    alignItems: 'center',
  },
  errorSummaryText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  perfectReading: {
    alignItems: 'center',
  },
  perfectReadingText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  reviewBox: {
    flex: 1,
    padding: 16,
  },
  reviewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  wordContainer: {
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
  errorType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  errorReviewWord: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF5C00',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorContextText: {
    fontSize: 14,
    color: '#666',
  },
  retryBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  retryText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  contentPreview: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contentPreviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  contentWithHighlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  celebrationModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  celebrationContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    width: '80%',
  },
  celebrationEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF5C00',
    marginBottom: 8,
  },
  celebrationText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
  },
  readingContainer: {
    flex: 1,
    padding: 16,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF5C00',
  },
  timerLabel: {
    fontSize: 16,
    color: '#666',
  },
  readingContent: {
    flex: 1,
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
  button: {
    backgroundColor: '#FF5C00',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#FF5C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  stopButton: {
    backgroundColor: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  scoreContainer: {
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
  scoreLabel: {
    fontSize: 14,
    color: '#666',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF5C00',
    marginTop: 8,
  },
  prevScore: {
    fontSize: 16,
    color: '#333',
  },
  improved: {
    color: '#4CAF50',
  },
  decreased: {
    color: '#F44336',
  },
  perfectScore: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  reviewContainer: {
    flex: 1,
    padding: 16,
  },
  actualWordContainer: {
    marginTop: 8,
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF5C00',
  },
  actualWordLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  actualWord: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  similarityScore: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  practicePrompt: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginTop: 16,
    textAlign: 'center',
  },
  progressIndicator: {
    marginVertical: 16,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  nextButton: {
    backgroundColor: '#007AFF',
  },
  reviewButton: {
    backgroundColor: '#007AFF',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
  },
  exitButton: {
    backgroundColor: '#666',
  },
  contextLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  correctWord: {
    color: '#4CAF50', // Green color for correctly read words
  },
  errorWord: {
    color: '#F44336', // Red color for words with errors
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginVertical: 12,
  },
  playButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  readingResultsContainer: {
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
  readingResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  readingResultsScroll: {
    maxHeight: 150,
  },
  readingResultsContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
}); 