const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// Get API details from environment variables with fallbacks
const BASE_URL = 'https://waziper.com/api';
const ACCESS_TOKEN = '685334261fcbe';

/**
 * Waziper API Client
 */
class WaziperClient {
  constructor(accessToken = ACCESS_TOKEN) {
    this.accessToken = accessToken;
    this.axios = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
          // Increase timeout and body limits to handle slow API responses and large payloads
    timeout: 30000, // Reduced from 90 seconds to 30 seconds
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    });
    
    // Add request interceptor for logging
    this.axios.interceptors.request.use(request => {
      console.log(`Waziper API Request: ${request.method.toUpperCase()} ${request.baseURL}${request.url}`);
      return request;
    });
    
    // Add response interceptor for logging
    this.axios.interceptors.response.use(
      response => {
        console.log(`Waziper API Response: Status ${response.status}`);
        return response;
      },
      error => {
        console.error('Waziper API Error:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Normalize phone numbers to the format expected by Waziper
   * - Strips WhatsApp suffixes like @c.us/@g.us
   * - Removes any non-digit characters
   * - Returns only digits (e.g., 201234567890)
   */
  normalizeNumber(number) {
    if (number == null) return '';
    const asString = String(number);
    const withoutSuffix = asString.replace(/@(c|g)\.us$/i, '');
    const digitsOnly = withoutSuffix.replace(/\D/g, '');
    return digitsOnly;
  }

  /**
   * Create a new WhatsApp instance
   * @returns {Promise} API response
   */
  async createInstance() {
    try {
      console.log('Creating new WhatsApp instance');
      return await this.axios.post(`/create_instance?access_token=${this.accessToken}`);
    } catch (error) {
      console.error('Error creating instance:', error.message);
      throw error;
    }
  }

  /**
   * Get QR code for an instance
   * @param {string} instanceId - The instance ID
   * @returns {Promise} API response with QR code
   */
  async getQRCode(instanceId) {
    try {
      console.log(`Getting QR code for instance: ${instanceId}`);
      const response = await this.axios.post(`/get_qrcode?instance_id=${instanceId}&access_token=${this.accessToken}`);
      
      // Enhanced debugging
      if (response.data) {
        console.log('QR code API response status:', response.data.status);
        
        // Check where the QR code is in the response
        if (response.data.qrcode) {
          console.log('QR code found in response.data.qrcode');
        } else if (response.data.data && response.data.data.qrcode) {
          console.log('QR code found in response.data.data.qrcode');
          // Move QR code to top level for consistent access
          response.data.qrcode = response.data.data.qrcode;
        } else {
          console.log('No QR code found in response');
          console.log('Response structure:', JSON.stringify(response.data));
        }
      }
      
      return response;
    } catch (error) {
      console.error(`Error getting QR code for instance ${instanceId}:`, error.message);
      throw error;
    }
  }

  /**
   * Set webhook URL for receiving updates
   * @param {string} instanceId - The instance ID
   * @param {string} webhookUrl - The webhook URL
   * @param {boolean} enable - Whether to enable the webhook
   * @returns {Promise} API response
   */
  async setWebhook(instanceId, webhookUrl, enable = true) {
    try {
      console.log(`Setting webhook for instance ${instanceId} to ${webhookUrl}`);
      return await this.axios.post(
        `/set_webhook?webhook_url=${encodeURIComponent(webhookUrl)}&enable=${enable}&instance_id=${instanceId}&access_token=${this.accessToken}`
      );
    } catch (error) {
      console.error(`Error setting webhook for instance ${instanceId}:`, error.message);
      throw error;
    }
  }

  /**
   * Reboot an instance
   * @param {string} instanceId - The instance ID
   * @returns {Promise} API response
   */
  async rebootInstance(instanceId) {
    try {
      console.log(`Rebooting instance ${instanceId}`);
      return await this.axios.post(`/reboot?instance_id=${instanceId}&access_token=${this.accessToken}`);
    } catch (error) {
      console.error(`Error rebooting instance ${instanceId}:`, error.message);
      throw error;
    }
  }

  /**
   * Reset an instance
   * @param {string} instanceId - The instance ID
   * @returns {Promise} API response
   */
  async resetInstance(instanceId) {
    try {
      console.log(`Resetting instance ${instanceId}`);
      return await this.axios.post(`/reset_instance?instance_id=${instanceId}&access_token=${this.accessToken}`);
    } catch (error) {
      console.error(`Error resetting instance ${instanceId}:`, error.message);
      throw error;
    }
  }

  /**
   * Reconnect an instance
   * @param {string} instanceId - The instance ID
   * @returns {Promise} API response
   */
  async reconnectInstance(instanceId) {
    try {
      console.log(`Reconnecting instance ${instanceId}`);
      return await this.axios.post(`/reconnect?instance_id=${instanceId}&access_token=${this.accessToken}`);
    } catch (error) {
      console.error(`Error reconnecting instance ${instanceId}:`, error.message);
      throw error;
    }
  }



  /**
   * Send a text message
   * @param {string} instanceId - The instance ID
   * @param {string} number - The recipient's phone number
   * @param {string} message - The message text
   * @returns {Promise} API response
   */
  async sendTextMessage(instanceId, number, message) {
    try {
      const normalizedNumber = this.normalizeNumber(number);
      console.log(`Sending text message to ${normalizedNumber} using instance ${instanceId}`);
      
      // Validate inputs
      if (!normalizedNumber || normalizedNumber.length < 10) {
        throw new Error('Invalid phone number');
      }
      
      if (!message || message.trim().length === 0) {
        throw new Error('Message cannot be empty');
      }
      
      const response = await this.axios.post('/send', {
        number: normalizedNumber,
        type: 'text',
        message: message.trim(),
        instance_id: instanceId,
        access_token: this.accessToken,
      });
      
      // Log successful response
      console.log(`Message sent successfully to ${normalizedNumber}`);
      return response;
      
    } catch (error) {
      console.error(`Error sending text message to ${this.normalizeNumber(number)}:`, error.message);
      
      // Enhanced error logging
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received - request timeout or network issue');
      }
      
      throw error;
    }
  }

  /**
   * Generate a public QR code URL from text
   * @param {string} text - The text to encode in the QR code
   * @returns {string} The QR code URL
   */
  generatePublicQRUrl(text) {
    // Use a public QR code generation service
    return `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`;
  }

  /**
   * Send a media message
   * @param {string} instanceId - The instance ID
   * @param {string} number - The recipient's phone number
   * @param {string} message - The message text
   * @param {string} mediaUrl - The URL of the media to send
   * @param {string} [filename] - Optional filename for documents
   * @returns {Promise} API response
   */
  async sendMediaMessage(instanceId, number, message, mediaUrl, filename) {
    try {
      const normalizedNumber = this.normalizeNumber(number);
      // Check if mediaUrl is a data URL (starts with "data:")
      if (typeof mediaUrl === 'string' && mediaUrl.startsWith('data:')) {
        console.log('Converting data URL to a publicly accessible URL');
        
        // Send the base64 data URL directly as media
        const payload = {
          number: normalizedNumber,
          type: 'media',
          message,
          media_url: mediaUrl,
          instance_id: instanceId,
          access_token: this.accessToken,
        };

        if (filename) {
          payload.filename = filename;
        }

        return await this.axios.post('/send', payload);
      }
      
      console.log(`Sending media message to ${normalizedNumber} using instance ${instanceId}`);
      
      const payload = {
        number: normalizedNumber,
        type: 'media',
        message,
        media_url: mediaUrl,
        instance_id: instanceId,
        access_token: this.accessToken,
      };
      
      if (filename) {
        payload.filename = filename;
      }
      
      return await this.axios.post('/send', payload);
    } catch (error) {
      console.error(`Error sending media message to ${number}:`, error.message);
      throw error;
    }
  }

  /**
   * Send a text message to a group
   * @param {string} instanceId - The instance ID
   * @param {string} groupId - The group ID
   * @param {string} message - The message text
   * @returns {Promise} API response
   */
  async sendGroupTextMessage(instanceId, groupId, message) {
    try {
      console.log(`Sending text message to group ${groupId} using instance ${instanceId}`);
      return await this.axios.post('/send_group', {
        group_id: groupId,
        type: 'text',
        message,
        instance_id: instanceId,
        access_token: this.accessToken,
      });
    } catch (error) {
      console.error(`Error sending text message to group ${groupId}:`, error.message);
      throw error;
    }
  }

  /**
   * Send a media message to a group
   * @param {string} instanceId - The instance ID
   * @param {string} groupId - The group ID
   * @param {string} message - The message text
   * @param {string} mediaUrl - The URL of the media to send
   * @param {string} [filename] - Optional filename for documents
   * @returns {Promise} API response
   */
  async sendGroupMediaMessage(instanceId, groupId, message, mediaUrl, filename) {
    try {
      console.log(`Sending media message to group ${groupId} using instance ${instanceId}`);
      
      const payload = {
        group_id: groupId,
        type: 'media',
        message,
        media_url: mediaUrl,
        instance_id: instanceId,
        access_token: this.accessToken,
      };
      
      if (filename) {
        payload.filename = filename;
      }
      
      return await this.axios.post('/send_group', payload);
    } catch (error) {
      console.error(`Error sending media message to group ${groupId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Get instance status
   * @param {string} instanceId - The instance ID
   * @returns {Promise} API response
   */
  async getInstanceStatus(instanceId) {
    try {
      console.log(`Getting status for instance ${instanceId}`);
      
      // First try the dedicated status endpoint
      try {
        console.log('Trying instance_status endpoint');
        const response = await this.axios.get(`/instance_status?instance_id=${instanceId}&access_token=${this.accessToken}`);
        
        if (response.data) {
          console.log('Status response:', JSON.stringify(response.data));
          
          // Check if we have a valid status response
          if (response.data.status === 'success') {
            return response;
          } else {
            console.log('Status endpoint returned non-success status');
          }
        }
      } catch (statusError) {
        console.log(`Direct status endpoint failed: ${statusError.message}`);
      }
      
      // If status endpoint fails, try the info endpoint as fallback
      try {
        console.log('Trying instance_info endpoint');
        const infoResponse = await this.axios.get(`/instance_info?instance_id=${instanceId}&access_token=${this.accessToken}`);
        
        if (infoResponse.data) {
          console.log('Info response:', JSON.stringify(infoResponse.data));
          return infoResponse;
        }
      } catch (infoError) {
        console.log(`Info endpoint failed: ${infoError.message}`);
      }
      
      // If both fail, try the QR code endpoint as a last resort
      console.log('Trying get_qrcode endpoint as last resort');
      const qrResponse = await this.axios.post(`/get_qrcode?instance_id=${instanceId}&access_token=${this.accessToken}`);
      
      return qrResponse;
    } catch (error) {
      console.error(`Error getting status for instance ${instanceId}:`, error.message);
      throw error;
    }
  }
}

// Student Code Generation Utility
const StudentCodeUtils = {
  /**
   * Generate a unique student code
   * @param {Object} Student - The Student model
   * @returns {Promise<string>} A unique student code
   */
  async generateUniqueStudentCode(Student) {
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loops
    
    while (attempts < maxAttempts) {
      // Generate a random 4-digit numeric code (1000-9999)
      const randomCode = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
      const fullCode = randomCode.toString();
      
      // Check if this code already exists in the database
      const existingStudent = await Student.findOne({ studentCode: fullCode });
      
      if (!existingStudent) {
        return fullCode; // Code is unique, return it
      }
      
      attempts++;
    }
    
    // If we've tried too many times, throw an error
    throw new Error('Unable to generate unique student code after maximum attempts');
  },






};

// Create and export a singleton instance
const waziper = new WaziperClient();
module.exports = waziper;
module.exports.StudentCodeUtils = StudentCodeUtils; 
