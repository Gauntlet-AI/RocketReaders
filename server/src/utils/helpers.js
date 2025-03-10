/**
 * Calculates words correct per minute (WCPM) based on total words and errors
 * @param {number} totalWords - Total words read
 * @param {number} errors - Number of errors made
 * @param {number} seconds - Time taken in seconds
 * @returns {number} - Words correct per minute
 */
const calculateWCPM = (totalWords, errors, seconds) => {
  const correctWords = Math.max(0, totalWords - errors);
  const minutes = seconds / 60;
  return Math.round(correctWords / minutes);
};

/**
 * Calculates reading improvement percentage between sessions
 * @param {number} previousWCPM - Previous words correct per minute
 * @param {number} currentWCPM - Current words correct per minute
 * @returns {number} - Improvement percentage
 */
const calculateImprovementPercentage = (previousWCPM, currentWCPM) => {
  if (previousWCPM === 0) return 100;
  return Math.round(((currentWCPM - previousWCPM) / previousWCPM) * 100);
};

/**
 * Determines if a user has achieved their daily goal
 * @param {number} targetWCPM - Target words correct per minute
 * @param {number} actualWCPM - Actual words correct per minute
 * @returns {boolean} - Whether the goal was achieved
 */
const isGoalAchieved = (targetWCPM, actualWCPM) => {
  return actualWCPM >= targetWCPM;
};

/**
 * Generates pagination metadata
 * @param {number} total - Total number of items
 * @param {number} limit - Items per page
 * @param {number} page - Current page number
 * @returns {Object} - Pagination metadata
 */
const getPaginationMetadata = (total, limit, page) => {
  const totalPages = Math.ceil(total / limit);
  return {
    totalItems: total,
    itemsPerPage: limit,
    currentPage: page,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
};

/**
 * Determines appropriate reading material difficulty based on user performance
 * @param {number} currentAccuracy - Current reading accuracy (percentage)
 * @param {number} currentWCPM - Current words correct per minute
 * @param {number} targetWCPM - Target words correct per minute
 * @returns {string} - Next difficulty level recommendation
 */
const determineDifficultyProgression = (currentAccuracy, currentWCPM, targetWCPM) => {
  if (currentAccuracy < 95) {
    return 'lower'; // Move to easier material
  } else if (currentAccuracy > 98 && currentWCPM > targetWCPM * 1.1) {
    return 'higher'; // Move to more challenging material
  } else {
    return 'same'; // Maintain current difficulty
  }
};

module.exports = {
  calculateWCPM,
  calculateImprovementPercentage,
  isGoalAchieved,
  getPaginationMetadata,
  determineDifficultyProgression,
}; 