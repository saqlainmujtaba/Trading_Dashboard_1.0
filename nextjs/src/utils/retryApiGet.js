export const getWithTransientRetry = async (getRequest, path, wait = (milliseconds) => (
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))
)) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await getRequest(path);
    } catch (error) {
      const retryable = !error?.response || error.response.status >= 500;
      if (!retryable || attempt >= 2) throw error;
      await wait(500 * (attempt + 1));
    }
  }
};
