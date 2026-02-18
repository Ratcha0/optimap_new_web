
/**
 * A wrapper for fetch that adds retry logic with exponential backoff.
 * 
 * @param {string} url - The URL to fetch.
 * @param {object} options - Fetch options.
 * @param {number} retries - Number of retry attempts (default: 3).
 * @param {number} backoff - Initial backoff delay in ms (default: 300).
 * @returns {Promise<Response>} - The fetch response.
 */
export async function fetchWithRetry(url, options = {}, retries = 3, backoff = 300) {
    try {
        const response = await fetch(url, options);
        
        // If status is 5xx (Server Error) or 429 (Too Many Requests), we retry.
        // We generally don't retry 400s (Bad Request) or 401/403 (Auth).
        if (!response.ok && (response.status >= 500 || response.status === 429)) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        
        return response;
    } catch (error) {
        if (retries > 0) {
            // Wait for backoff time
            await new Promise(resolve => setTimeout(resolve, backoff));
            
            // Retry with exponential backoff (multiply delay by 2)
            console.warn(`Retrying request to ${url} (${retries} attempts left)...`);
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        } else {
            throw error; // No more retries, throw the error
        }
    }
}

/**
 * A generic retry wrapper for any async function (e.g. Supabase calls).
 * 
 * @param {Function} fn - The async function to execute.
 * @param {number} retries - Number of retry attempts (default: 3).
 * @param {number} backoff - Initial backoff delay in ms (default: 300).
 */
export async function retryOperation(fn, retries = 3, backoff = 300) {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, backoff));
            return retryOperation(fn, retries - 1, backoff * 2);
        } else {
            throw error;
        }
    }
}
