const config = {
  apiUrl: process.env.NODE_ENV === 'production' 
    ? '' // Empty string for same-origin requests in production
    : 'http://localhost:10000'
};

export default config;
