export const environment = {
  production: false,
  port: 3001,
  kafkaConfig: {
    brokers: ['localhost:9092'],
    clientId: 'user-management-service',
  },
};
