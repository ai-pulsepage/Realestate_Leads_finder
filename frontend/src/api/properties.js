import apiClient from './client';

/**
 * Properties API endpoints
 */
export const propertiesApi = {
  /**
   * Get properties with optional filters
   * @param {Object} filters - Query parameters
   * @param {string} filters.zip_code - Filter by zip code
   * @param {string} filters.county - Filter by county
   * @param {number} filters.distressed_score_min - Minimum distress score
   * @param {string} filters.property_type - Property type filter
   * @param {number} filters.minEquity - Minimum equity percentage (0-1)
   * @param {number} filters.maxYearBuilt - Maximum year built (older homes)
   * @param {string} filters.distressType - Distress type filter
   * @returns {Promise<Array>} Array of properties
   */
  getProperties: async (filters = {}) => {
    try {
      const response = await apiClient.get('/properties', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  },

  /**
   * Get single property by ID
   * @param {string} propertyId - Property ID
   * @returns {Promise<Object>} Property object
   */
  getProperty: async (propertyId) => {
    try {
      const response = await apiClient.get(`/properties/${propertyId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching property:', error);
      throw error;
    }
  },

  /**
   * Create new property
   * @param {Object} propertyData - Property data
   * @returns {Promise<Object>} Created property
   */
  createProperty: async (propertyData) => {
    try {
      const response = await apiClient.post('/properties', propertyData);
      return response.data;
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  },

  /**
   * Update property
   * @param {string} propertyId - Property ID
   * @param {Object} propertyData - Updated property data
   * @returns {Promise<Object>} Updated property
   */
  updateProperty: async (propertyId, propertyData) => {
    try {
      const response = await apiClient.put(`/properties/${propertyId}`, propertyData);
      return response.data;
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  },

  /**
   * Get properties for investor search with common filters
   * @param {Object} options - Search options
   * @param {number} options.minEquity - Minimum equity (0-1)
   * Get recent sales for service providers (new homeowners)
   * @param {number} monthsSinceSale - Months since sale (default: 6)
   * @returns {Promise<Array>} Recent sales
   */
  getRecentSales: async (monthsSinceSale = 6) => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsSinceSale);

    // Format date as YYYY-MM-DD
    const minDateStr = cutoffDate.toISOString().split('T')[0];

    try {
      // Use the new backend filter
      const response = await apiClient.get('/properties', {
        params: { min_last_sale_date: minDateStr }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching recent sales:', error);
      throw error;
    }
  }
};

export default propertiesApi;