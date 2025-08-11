const { Kafka } = require('kafkajs');

async function sendOrganizationEvent() {
  const kafka = new Kafka({
    clientId: 'test-org-event-producer',
    brokers: ['localhost:9092'],
  });

  const producer = kafka.producer();
  await producer.connect();

  const event = {
    eventType: 'organization.created',
    payload: {
      organizationId: 'test-keycloak-org-id-123',
    },
    timestamp: new Date().toISOString(),
  };

  console.log(
    'Sending organization.created event:',
    JSON.stringify(event, null, 2)
  );

  await producer.send({
    topic: 'organization.events.v1',
    messages: [
      {
        key: event.payload.organizationId,
        value: JSON.stringify(event),
        headers: {
          eventType: event.eventType,
        },
      },
    ],
  });

  console.log('Event sent successfully!');
  await producer.disconnect();
}

sendOrganizationEvent().catch(console.error);
