import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-system',
    maxConnectionAttempts: parseInt(
      process.env.MONGODB_MAX_CONNECTION_ATTEMPTS || '5',
      10,
    ),
    reconnectInterval: parseInt(
      process.env.MONGODB_RECONNECT_INTERVAL || '5000',
      10,
    ),
    poolSize: parseInt(process.env.MONGODB_POOL_SIZE || '10', 10),
    // If using MongoDB Atlas or a replica set
    replicaSet: process.env.MONGODB_REPLICA_SET,
    // Authentication options, if needed
    user: process.env.MONGODB_USER,
    password: process.env.MONGODB_PASSWORD,
    authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
    // SSL options for secure connections
    ssl: process.env.MONGODB_SSL === 'true',
    sslValidate: process.env.MONGODB_SSL_VALIDATE === 'true',
    // Performance options
    connectTimeoutMS: parseInt(
      process.env.MONGODB_CONNECT_TIMEOUT_MS || '30000',
      10,
    ),
    socketTimeoutMS: parseInt(
      process.env.MONGODB_SOCKET_TIMEOUT_MS || '45000',
      10,
    ),
  },
}));
