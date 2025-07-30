export const environment = {
  production: true,
  port: parseInt(process.env.PORT || '3001'),
  kafkaConfig: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: 'user-management-service-prod',
  },
};
