// Startup script with error handling
const db = require('./database');

async function startServer() {
  try {
    console.log('🔄 Starting server...');

    // Test database connection
    if (process.env.DATABASE_URL) {
      console.log('📊 Testing PostgreSQL connection...');
      await new Promise((resolve, reject) => {
        db.query('SELECT NOW()', [], (err, result) => {
          if (err) {
            console.error('❌ PostgreSQL connection failed:', err.message);
            reject(err);
          } else {
            console.log('✅ PostgreSQL connected successfully');
            resolve(result);
          }
        });
      });
    }

    // Start Express server
    require('./server');

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
