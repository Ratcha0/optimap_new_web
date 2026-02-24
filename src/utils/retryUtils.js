
export async function fetchWithRetry(url, options = {}, retries = 3, backoff = 300) {
    try {
        const response = await fetch(url, options);
        if (!response.ok && (response.status >= 500 || response.status === 429)) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        
        return response;
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, backoff));
            console.warn(`Retrying request to ${url} (${retries} attempts left)...`);
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        } else {
            throw error;
        }
    }
}


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
